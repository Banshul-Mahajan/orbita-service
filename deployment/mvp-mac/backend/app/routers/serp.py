from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import SerpResult
from app.schemas import SerpAnalyzeRequest, APIResponse
from app.services.serp_service import analyze_serp

router = APIRouter(prefix="/serp", tags=["SERP"])


@router.post("/analyze", response_model=APIResponse)
async def serp_analyze(
    body: SerpAnalyzeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    results = await analyze_serp(body.query, body.num_results)

    # Clear old results for same project+query
    await db.execute(
        delete(SerpResult).where(
            *project_scope_filters(SerpResult, context),
            SerpResult.query == body.query,
        )
    )

    for r in results:
        row = SerpResult(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            query=body.query,
            position=r["position"],
            title=r.get("title"),
            url=r.get("url"),
            domain=r.get("domain"),
            snippet=r.get("snippet"),
            headings=r.get("headings"),
            entities=r.get("entities"),
            word_count=r.get("word_count"),
            readability=r.get("readability"),
        )
        db.add(row)

    return APIResponse(data={"query": body.query, "results": results})


@router.get("/{project_id}", response_model=APIResponse)
async def get_serp_results(
    project_id: str,
    query: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(SerpResult)
        .where(*project_scope_filters(SerpResult, context), SerpResult.query == query)
        .order_by(SerpResult.position)
    )
    rows = result.scalars().all()
    data = [
        {
            "id": r.id,
            "position": r.position,
            "title": r.title,
            "url": r.url,
            "domain": r.domain,
            "snippet": r.snippet,
            "headings": r.headings,
            "entities": r.entities,
            "word_count": r.word_count,
            "readability": r.readability,
        }
        for r in rows
    ]
    return APIResponse(data={"query": query, "results": data})


# backend/app/routers/serp.py — add this route
@router.get("/{project_id}/count", response_model=APIResponse)
async def get_serp_count(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from sqlalchemy import func, distinct

    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(
            func.count(SerpResult.id).label("total_results"),
            func.count(distinct(SerpResult.query)).label("total_queries")
        ).where(*project_scope_filters(SerpResult, context))
    )
    row = result.one()
    return APIResponse(data={
        "total_results": row.total_results,
        "total_queries": row.total_queries
    })
