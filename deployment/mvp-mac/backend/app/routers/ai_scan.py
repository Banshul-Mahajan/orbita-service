from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import AiScanResult
from app.schemas import AiScanRequest, APIResponse
from app.services.ai_scan_service import scan_ai_engines

router = APIRouter(prefix="/ai-scan", tags=["AI Scanner"])


@router.post("", response_model=APIResponse)
async def run_ai_scan(
    body: AiScanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    results = await scan_ai_engines(body.query, body.engines)

    # Clear old results
    await db.execute(
        delete(AiScanResult).where(
            *project_scope_filters(AiScanResult, context),
            AiScanResult.query == body.query,
        )
    )

    for r in results:
        row = AiScanResult(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            query=body.query,
            engine=r["engine"],
            answer_text=r.get("answer_text"),
            cited_urls=r.get("cited_urls"),
            cited_domains=r.get("cited_domains"),
            answer_length=r.get("answer_length"),
        )
        db.add(row)

    return APIResponse(data={"query": body.query, "results": results})


@router.get("/{project_id}", response_model=APIResponse)
async def get_ai_scan(
    project_id: str,
    query: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(AiScanResult)
        .where(*project_scope_filters(AiScanResult, context), AiScanResult.query == query)
    )
    rows = result.scalars().all()
    data = [
        {
            "engine": r.engine,
            "answer_text": r.answer_text,
            "cited_urls": r.cited_urls,
            "cited_domains": r.cited_domains,
            "answer_length": r.answer_length,
        }
        for r in rows
    ]
    return APIResponse(data={"query": query, "results": data})


# backend/app/routers/ai_scan.py — add this route
@router.get("/{project_id}/count", response_model=APIResponse)
async def get_ai_scan_count(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from sqlalchemy import func, distinct

    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(
            func.count(AiScanResult.id).label("total_scans"),
            func.count(distinct(AiScanResult.query)).label("total_queries")
        ).where(*project_scope_filters(AiScanResult, context))
    )
    row = result.one()
    return APIResponse(data={
        "total_scans": row.total_scans,
        "total_queries": row.total_queries
    })
