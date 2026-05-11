from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Article, Brief
from app.schemas import ArticleCreate, ArticleUpdate, ArticleOut
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_platform_context
from app.services.writer_service import stream_article
from app.services.brief_service import calculate_entity_score

router = APIRouter(prefix="/articles", tags=["articles"])


@router.post("/", response_model=ArticleOut, status_code=201)
def create_article(
    payload: ArticleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a blank article shell from a brief (writing happens via /stream)."""
    context = get_platform_context(request, current_user)
    brief = _scoped_brief_query(db, context).filter(Brief.id == payload.brief_id).first()
    if not brief:
        raise HTTPException(404, "Brief not found")

    article = Article(
        brief_id=brief.id,
        organization_id=brief.organization_id,
        brand_id=brief.brand_id,
        project_id=brief.project_id,
        user_id=current_user.id,
        title=brief.h1,
        tone_style=payload.tone_style or brief.tone_style,
        body="",
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("/stream/{article_id}")
async def stream_article_endpoint(
    article_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    SSE endpoint — streams AI-generated content section by section.
    Frontend connects via EventSource('/api/articles/stream/{id}').
    NOTE: Auth via query param for EventSource (browsers can't set headers for SSE).
    """
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")

    brief = _scoped_brief_query(db, context).filter(Brief.id == article.brief_id).first()
    if not brief:
        raise HTTPException(404, "Brief not found")

    brief_dict = {
        "h1": brief.h1,
        "h2s": brief.h2s,
        "h3s": brief.h3s,
        "keywords": brief.keywords,
        "topic": brief.topic,
    }

    return StreamingResponse(
        stream_article(
            brief=brief_dict,
            brand_id=article.brand_id,
            tone_style=article.tone_style.value,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/stream-token/{article_id}")
async def stream_with_token(
    article_id: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    SSE stream endpoint that accepts token as query param.
    Needed because browser EventSource cannot send Authorization headers.
    """
    from app.core.auth import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")

    org_id = payload.get("org_id") or request.headers.get("x-orbita-org-id") or request.cookies.get("orbit_org_id")
    brand_id = request.headers.get("x-orbita-brand-id") or request.cookies.get("orbit_brand_id")
    project_id = request.headers.get("x-orbita-project-id") or request.cookies.get("orbit_project_id")

    article_query = db.query(Article).filter(
        Article.id == article_id,
        Article.user_id == user_id,
    )
    if org_id:
        article_query = article_query.filter(Article.organization_id == org_id)
    if brand_id:
        article_query = article_query.filter(Article.brand_id == brand_id)
    if project_id:
        article_query = article_query.filter(
            or_(Article.project_id == project_id, Article.project_id.is_(None))
        )

    article = article_query.first()
    if not article:
        raise HTTPException(404, "Article not found")

    brief_query = db.query(Brief).filter(
        Brief.id == article.brief_id,
        Brief.organization_id == article.organization_id,
        Brief.brand_id == article.brand_id,
    )
    if article.project_id:
        brief_query = brief_query.filter(
            or_(Brief.project_id == article.project_id, Brief.project_id.is_(None))
        )
    brief = brief_query.first()
    if not brief:
        raise HTTPException(404, "Brief not found")

    brief_dict = {
        "h1": brief.h1,
        "h2s": brief.h2s or [],
        "h3s": brief.h3s or {},
        "keywords": brief.keywords or [],
        "topic": brief.topic,
    }

    return StreamingResponse(
        stream_article(
            brief=brief_dict,
            brand_id=article.brand_id,
            tone_style=article.tone_style.value,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.put("/{article_id}", response_model=ArticleOut)
def update_article(
    article_id: str,
    payload: ArticleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(article, field, value)

    # Recalculate word count and entity score if body changed
    if payload.body is not None:
        article.word_count = len(payload.body.split())
        brief = _scoped_brief_query(db, context).filter(Brief.id == article.brief_id).first()
        if brief:
            article.entity_score = calculate_entity_score(payload.body, brief.entities)

    db.commit()
    db.refresh(article)
    return article


@router.post("/{article_id}/save-generated", response_model=ArticleOut)
def save_generated(
    article_id: str,
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Save the fully-assembled generated article body."""
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")

    content = body.get("body", "")
    article.body = content
    article.word_count = len(content.split())

    brief = _scoped_brief_query(db, context).filter(Brief.id == article.brief_id).first()
    if brief:
        article.entity_score = calculate_entity_score(content, brief.entities or [])

    db.commit()
    db.refresh(article)
    return article


@router.get("/", response_model=List[ArticleOut])
def list_articles(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    return _scoped_article_query(db, context).order_by(Article.created_at.desc()).all()


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(
    article_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    return article


@router.delete("/{article_id}", status_code=204)
def delete_article(
    article_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")
    db.delete(article)
    db.commit()


def _scoped_brief_query(db: Session, context):
    query = db.query(Brief).filter(
        Brief.organization_id == context.organization_id,
        Brief.brand_id == context.brand_id,
    )
    if context.project_id:
        query = query.filter(
            or_(Brief.project_id == context.project_id, Brief.project_id.is_(None))
        )
    return query


def _scoped_article_query(db: Session, context):
    query = db.query(Article).filter(
        Article.organization_id == context.organization_id,
        Article.brand_id == context.brand_id,
    )
    if context.project_id:
        query = query.filter(
            or_(Article.project_id == context.project_id, Article.project_id.is_(None))
        )
    return query
