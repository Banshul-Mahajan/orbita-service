from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import KeywordCluster, KeywordOpportunity
from app.schemas import KeywordExpandRequest, KeywordSelectionRequest, APIResponse
from app.services.keyword_service import expand_keywords

router = APIRouter(prefix="/keywords", tags=["Keywords"])


@router.post("/expand", response_model=APIResponse)
async def keyword_expand(
    body: KeywordExpandRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    # Run the pipeline
    result = await expand_keywords(body.seed_keyword, body.limit)

    # Persist to DB (clear old data for this seed in this project)
    await db.execute(
        delete(KeywordCluster).where(
            *project_scope_filters(KeywordCluster, context),
            KeywordCluster.seed_keyword == body.seed_keyword,
        )
    )

    for cluster in result["clusters"]:
        for kw in cluster["keywords"]:
            row = KeywordCluster(
                organization_id=context.organization_id,
                brand_id=context.brand_id,
                project_id=context.project_id,
                seed_keyword=body.seed_keyword,
                cluster_id=cluster["cluster_id"],
                cluster_name=cluster["cluster_name"],
                keyword=kw["keyword"],
                intent=kw.get("intent"),
                search_volume=kw.get("volume"),
                difficulty=kw.get("difficulty"),
            )
            db.add(row)

    return APIResponse(data=result)


@router.get("/{project_id}", response_model=APIResponse)
async def get_keywords(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(KeywordCluster)
        .where(*project_scope_filters(KeywordCluster, context))
        .order_by(KeywordCluster.cluster_id)
    )
    rows = result.scalars().all()

    # Reconstruct cluster groups
    clusters: dict = {}
    for row in rows:
        cid = row.cluster_id
        if cid not in clusters:
            clusters[cid] = {
                "cluster_id": cid,
                "cluster_name": row.cluster_name,
                "intent": row.intent,
                "keywords": [],
            }
        clusters[cid]["keywords"].append({
            "id": row.id,
            "keyword": row.keyword,
            "intent": row.intent,
            "volume": row.search_volume,
            "difficulty": row.difficulty,
        })

    return APIResponse(data={
        "project_id": project_id,
        "clusters": list(clusters.values()),
        "total_keywords": len(rows),
    })


@router.get("/opportunities/{project_id}", response_model=APIResponse)
async def get_keyword_opportunities(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(KeywordOpportunity)
        .where(*project_scope_filters(KeywordOpportunity, context))
        .order_by(KeywordOpportunity.intent, KeywordOpportunity.relevance_score.desc())
    )
    rows = result.scalars().all()
    grouped = {
        "informational": [],
        "commercial": [],
        "transactional": [],
        "navigational": [],
    }

    for row in rows:
        item = _opportunity_dict(row)
        grouped.setdefault(row.intent, []).append(item)

    return APIResponse(data={
        "project_id": project_id,
        "total_keywords": len(rows),
        "selected_keywords": len([row for row in rows if row.selected]),
        "grouped": grouped,
        "all": [_opportunity_dict(row) for row in rows],
    })


@router.post("/select", response_model=APIResponse)
async def select_keyword_opportunities(
    body: KeywordSelectionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    if not body.keyword_ids:
        return APIResponse(data={"updated": 0})

    result = await db.execute(
        select(KeywordOpportunity).where(
            *project_scope_filters(KeywordOpportunity, context),
            KeywordOpportunity.id.in_(body.keyword_ids),
        )
    )
    rows = result.scalars().all()
    for row in rows:
        row.selected = body.selected

    return APIResponse(data={
        "updated": len(rows),
        "selected": body.selected,
        "keyword_ids": [row.id for row in rows],
    })


def _opportunity_dict(row: KeywordOpportunity) -> dict:
    return {
        "id": row.id,
        "keyword": row.keyword,
        "seed_topic": row.seed_topic,
        "intent": row.intent,
        "intent_score": row.intent_score,
        "volume": row.search_volume,
        "difficulty": row.difficulty,
        "relevance_score": row.relevance_score,
        "cluster_name": row.cluster_name,
        "selected": row.selected,
        "source_page_url": row.source_page_url,
    }
