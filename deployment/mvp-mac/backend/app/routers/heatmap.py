from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import SerpResult, AiScanResult
from app.schemas import APIResponse
from app.services.heatmap_service import build_heatmap

router = APIRouter(prefix="/heatmap", tags=["Heatmap"])


@router.get("/{project_id}", response_model=APIResponse)
async def get_heatmap(
    project_id: str,
    query: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Builds the gap heatmap from stored SERP + AI scan data.
    Run /serp/analyze and /ai-scan first for the same query.
    """
    context = await get_project_context(request, project_id, current_user)

    # Fetch SERP results
    serp_q = await db.execute(
        select(SerpResult)
        .where(*project_scope_filters(SerpResult, context), SerpResult.query == query)
        .order_by(SerpResult.position)
    )
    serp_rows = serp_q.scalars().all()
    serp_data = [
        {"position": r.position, "domain": r.domain, "entities": r.entities or []}
        for r in serp_rows
    ]

    # Fetch AI scan results
    ai_q = await db.execute(
        select(AiScanResult)
        .where(*project_scope_filters(AiScanResult, context), AiScanResult.query == query)
    )
    ai_rows = ai_q.scalars().all()
    ai_data = [
        {"engine": r.engine, "cited_domains": r.cited_domains or []}
        for r in ai_rows
    ]

    if not serp_data and not ai_data:
        return APIResponse(
            success=False,
            error="No data found for this query. Run SERP Analyze and AI Scan first.",
        )

    heatmap = build_heatmap(query, serp_data, ai_data)
    return APIResponse(data=heatmap)
