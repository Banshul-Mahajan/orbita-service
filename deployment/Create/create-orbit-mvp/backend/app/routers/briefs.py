from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Brief, BriefStatus
from app.schemas import BriefGenerateRequest, BriefUpdate, BriefOut
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_platform_context
from app.services.brief_service import generate_brief

router = APIRouter(prefix="/briefs", tags=["briefs"])


@router.post("/generate", response_model=BriefOut, status_code=201)
def generate(
    payload: BriefGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Generate a new content brief from a topic using LLM + RAG."""
    context = get_platform_context(request, current_user)
    result = generate_brief(
        topic=payload.topic,
        brand_id=context.brand_id,
        target_audience=payload.target_audience,
        tone_style=payload.tone_style.value,
        additional_context=payload.additional_context,
    )

    brief = Brief(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        project_id=context.project_id,
        user_id=current_user.id,
        topic=payload.topic,
        h1=result.get("h1", payload.topic),
        h2s=result.get("h2s", []),
        h3s=result.get("h3s", {}),
        keywords=result.get("keywords", []),
        questions=result.get("questions", []),
        entities=result.get("entities", []),
        target_audience=payload.target_audience,
        tone_style=payload.tone_style,
        status=BriefStatus.ready,
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)
    return brief


@router.get("/", response_model=List[BriefOut])
def list_briefs(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)

    query = db.query(Brief).filter(
        Brief.organization_id == context.organization_id,
        Brief.brand_id == context.brand_id,
    )
    if context.project_id:
        query = query.filter(
            or_(Brief.project_id == context.project_id, Brief.project_id.is_(None))
        )

    return query.order_by(Brief.created_at.desc()).all()


@router.get("/{brief_id}", response_model=BriefOut)
def get_brief(
    brief_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)

    brief = _scoped_brief_query(db, context).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(404, "Brief not found")
    return brief


@router.put("/{brief_id}", response_model=BriefOut)
def update_brief(
    brief_id: str,
    payload: BriefUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)

    brief = _scoped_brief_query(db, context).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(404, "Brief not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(brief, field, value)
    db.commit()
    db.refresh(brief)
    return brief


@router.delete("/{brief_id}", status_code=204)
def delete_brief(
    brief_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)

    brief = _scoped_brief_query(db, context).filter(Brief.id == brief_id).first()
    if not brief:
        raise HTTPException(404, "Brief not found")
    db.delete(brief)
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
