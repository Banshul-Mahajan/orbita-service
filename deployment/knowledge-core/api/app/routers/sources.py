from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import httpx
from urllib.parse import urlparse
from datetime import datetime
from ..core.platform import (
    CurrentUser,
    ensure_org_access,
    get_brand_context,
    get_current_user,
)
from ..database import get_db
from ..models.source import Source
import uuid

router = APIRouter(prefix="/sources", tags=["sources"])


async def fetch_url_metadata(url: str) -> dict:
    """Auto-fetch title and check if URL is alive."""
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "ORBITA-KnowledgeCore/1.0"})
            domain = urlparse(url).netloc
            title = url
            text = r.text
            if "<title" in text.lower():
                start = text.lower().find("<title") 
                start = text.find(">", start) + 1
                end = text.lower().find("</title>")
                if end > start:
                    title = text[start:end].strip()[:500]
            return {"title": title, "domain": domain, "is_active": r.status_code < 400}
    except Exception:
        domain = urlparse(url).netloc
        return {"title": url[:200], "domain": domain, "is_active": False}


@router.get("")
async def list_sources(
    request: Request,
    brand_id: Optional[str] = Query(default=None),
    source_type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, brand_id, require_brand=False)
    if not context:
        return []

    query = select(Source).where(Source.brand_id == context.brand_id)
    if source_type:
        query = query.where(Source.source_type == source_type)
    query = query.order_by(Source.created_at.desc())
    result = await db.execute(query)
    sources = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "url": s.url,
            "title": s.title,
            "domain": s.domain,
            "source_type": s.source_type,
            "reliability_score": s.reliability_score,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat(),
        }
        for s in sources
    ]


@router.post("", status_code=201)
async def add_source(
    source_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, source_data.get("brand_id"))
    metadata = await fetch_url_metadata(source_data["url"])

    source = Source(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        url=source_data["url"],
        title=source_data.get("title") or metadata["title"],
        domain=metadata["domain"],
        source_type=source_data.get("source_type", "website"),
        reliability_score=source_data.get("reliability_score", 3),
        is_active=metadata["is_active"],
        fetched_at=datetime.utcnow(),
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return {
        "id": str(source.id),
        "url": source.url,
        "title": source.title,
        "domain": source.domain,
        "is_active": source.is_active,
    }


@router.delete("/{source_id}")
async def delete_source(
    source_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Source).where(Source.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    ensure_org_access(source, current_user)
    await db.delete(source)
    await db.commit()
    return {"message": "deleted"}
