from fastapi import APIRouter, Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import (
    CompetitorDomain,
    CompetitorPage,
    KeywordOpportunity,
)
from app.schemas import APIResponse, CompetitorDiscoverRequest
from app.services.competitor_service import discover_competitors
from app.services.website_scan_service import extract_domain

router = APIRouter(prefix="/competitors", tags=["Competitors"])


@router.post("/discover", response_model=APIResponse)
async def discover_project_competitors(
    body: CompetitorDiscoverRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)

    selected = (await db.execute(
        select(KeywordOpportunity)
        .where(
            *project_scope_filters(KeywordOpportunity, context),
            KeywordOpportunity.selected.is_(True),
        )
        .order_by(KeywordOpportunity.intent, KeywordOpportunity.relevance_score.desc())
    )).scalars().all()
    if not selected:
        return APIResponse(success=False, error="Select at least one keyword before discovering competitors.")

    own_domain = context.brand.get("primary_domain")
    if not own_domain and context.brand.get("website_url"):
        try:
            own_domain = extract_domain(context.brand["website_url"])
        except ValueError:
            own_domain = None

    discovery = await discover_competitors(
        selected_keywords=[{"id": item.id, "keyword": item.keyword} for item in selected],
        own_domain=own_domain,
        num_results=body.num_results,
    )

    await db.execute(delete(CompetitorPage).where(*project_scope_filters(CompetitorPage, context)))
    await db.execute(delete(CompetitorDomain).where(*project_scope_filters(CompetitorDomain, context)))

    domain_id_by_name: dict[str, str] = {}
    for domain in discovery["domains"]:
        row = CompetitorDomain(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            domain=domain["domain"],
            avg_position=domain["avg_position"],
            ranking_keyword_count=domain["ranking_keyword_count"],
            visibility_score=domain["visibility_score"],
            top_keywords=domain["top_keywords"],
        )
        db.add(row)
        await db.flush()
        domain_id_by_name[row.domain] = row.id

    for page in discovery["pages"]:
        competitor_domain_id = domain_id_by_name.get(page["domain"])
        if not competitor_domain_id:
            continue
        db.add(CompetitorPage(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            competitor_domain_id=competitor_domain_id,
            keyword_id=page.get("keyword_id"),
            keyword=page["keyword"],
            url=page.get("url"),
            title=page.get("title"),
            position=page.get("position"),
            headings=page.get("headings"),
            entities=page.get("entities"),
            word_count=page.get("word_count"),
            readability=page.get("readability"),
        ))

    return await get_project_competitors(body.project_id, request, db, current_user)


@router.get("/{project_id}", response_model=APIResponse)
async def get_project_competitors(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    domains = (await db.execute(
        select(CompetitorDomain)
        .where(*project_scope_filters(CompetitorDomain, context))
        .order_by(CompetitorDomain.visibility_score.desc())
    )).scalars().all()
    pages = (await db.execute(
        select(CompetitorPage)
        .where(*project_scope_filters(CompetitorPage, context))
        .order_by(CompetitorPage.position.asc())
    )).scalars().all()
    domain_by_id = {domain.id: domain.domain for domain in domains}

    return APIResponse(data={
        "project_id": project_id,
        "domains": [
            {
                "id": domain.id,
                "domain": domain.domain,
                "avg_position": domain.avg_position,
                "ranking_keyword_count": domain.ranking_keyword_count,
                "visibility_score": domain.visibility_score,
                "top_keywords": domain.top_keywords or [],
                "created_at": domain.created_at,
            }
            for domain in domains
        ],
        "pages": [
            {
                "id": page.id,
                "competitor_domain_id": page.competitor_domain_id,
                "domain": domain_by_id.get(page.competitor_domain_id),
                "keyword_id": page.keyword_id,
                "keyword": page.keyword,
                "url": page.url,
                "title": page.title,
                "position": page.position,
                "headings": page.headings or [],
                "entities": page.entities or [],
                "word_count": page.word_count,
                "readability": page.readability,
                "created_at": page.created_at,
            }
            for page in pages
        ],
    })
