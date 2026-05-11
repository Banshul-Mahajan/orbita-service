from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import (
    CompetitorDomain,
    CompetitorPage,
    ContentDraft,
    KeywordOpportunity,
)
from app.schemas import APIResponse, ContentGenerateRequest
from app.services.content_generation_service import generate_content_draft

router = APIRouter(prefix="/content", tags=["Content"])


@router.post("/generate", response_model=APIResponse)
async def generate_content(
    body: ContentGenerateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    keyword = await db.scalar(
        select(KeywordOpportunity).where(
            *project_scope_filters(KeywordOpportunity, context),
            KeywordOpportunity.id == body.keyword_id,
        )
    )
    if not keyword:
        raise HTTPException(404, "Keyword opportunity not found")

    domains = (await db.execute(
        select(CompetitorDomain).where(*project_scope_filters(CompetitorDomain, context))
    )).scalars().all()
    domain_by_id = {domain.id: domain.domain for domain in domains}
    competitor_pages = (await db.execute(
        select(CompetitorPage)
        .where(
            *project_scope_filters(CompetitorPage, context),
            CompetitorPage.keyword_id == keyword.id,
        )
        .order_by(CompetitorPage.position.asc())
    )).scalars().all()

    draft_data = generate_content_draft(
        keyword=keyword.keyword,
        intent=keyword.intent,
        content_type=body.content_type,
        tone=body.tone,
        company_profile={
            "company_name": context.brand.get("name") or context.project.get("name"),
            "industry": context.brand.get("industry") or context.project.get("description"),
            "target_audience": context.project.get("target_audience"),
        },
        competitor_pages=[
            {
                "domain": domain_by_id.get(page.competitor_domain_id),
                "url": page.url,
                "title": page.title,
                "position": page.position,
            }
            for page in competitor_pages
        ],
    )

    draft = ContentDraft(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        project_id=context.project_id,
        keyword_id=keyword.id,
        title=draft_data["title"],
        slug=draft_data["slug"],
        content_type=draft_data["content_type"],
        intent=draft_data["intent"],
        status=draft_data["status"],
        meta_title=draft_data["meta_title"],
        meta_description=draft_data["meta_description"],
        outline=draft_data["outline"],
        body_markdown=draft_data["body_markdown"],
        faq=draft_data["faq"],
    )
    db.add(draft)
    await db.flush()
    await db.refresh(draft)

    return APIResponse(data=_draft_dict(draft))


@router.get("/{project_id}", response_model=APIResponse)
async def list_content(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    rows = (await db.execute(
        select(ContentDraft)
        .where(*project_scope_filters(ContentDraft, context))
        .order_by(ContentDraft.created_at.desc())
    )).scalars().all()
    return APIResponse(data={"project_id": project_id, "drafts": [_draft_dict(row) for row in rows]})


@router.get("/draft/{draft_id}", response_model=APIResponse)
async def get_content_draft(
    draft_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    brand_id = request.headers.get("x-orbita-brand-id") or request.cookies.get("orbit_brand_id")
    if not brand_id:
        raise HTTPException(400, "Brand context is missing. Select a brand and retry.")

    query = select(ContentDraft).where(
        ContentDraft.id == draft_id,
        ContentDraft.organization_id == current_user.org_id,
        ContentDraft.brand_id == brand_id,
    )
    project_id = request.headers.get("x-orbita-project-id") or request.cookies.get("orbit_project_id")
    if project_id:
        query = query.where(ContentDraft.project_id == project_id)

    draft = await db.scalar(query)
    if not draft:
        raise HTTPException(404, "Content draft not found")
    return APIResponse(data=_draft_dict(draft))


def _draft_dict(draft: ContentDraft) -> dict:
    return {
        "id": draft.id,
        "project_id": draft.project_id,
        "keyword_id": draft.keyword_id,
        "title": draft.title,
        "slug": draft.slug,
        "content_type": draft.content_type,
        "intent": draft.intent,
        "status": draft.status,
        "meta_title": draft.meta_title,
        "meta_description": draft.meta_description,
        "outline": draft.outline or [],
        "body_markdown": draft.body_markdown,
        "faq": draft.faq or [],
        "created_at": draft.created_at,
        "updated_at": draft.updated_at,
    }
