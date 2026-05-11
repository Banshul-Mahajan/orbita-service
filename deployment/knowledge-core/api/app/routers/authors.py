from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from ..core.platform import (
    CurrentUser,
    ensure_org_access,
    get_brand_context,
    get_current_user,
)
from ..database import get_db
from ..models.author import AuthorProfile
import uuid

router = APIRouter(prefix="/authors", tags=["authors"])


@router.get("")
async def list_authors(
    request: Request,
    brand_id: Optional[str] = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, brand_id, require_brand=False)
    if not context:
        return []

    result = await db.execute(
        select(AuthorProfile)
        .where(AuthorProfile.brand_id == context.brand_id)
        .order_by(AuthorProfile.created_at.desc())
    )
    authors = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "bio": a.bio,
            "credentials": a.credentials,
            "linkedin_url": a.linkedin_url,
            "expertise_areas": a.expertise_areas or [],
            "eeeat_signals": a.eeeat_signals or {},
            "created_at": a.created_at.isoformat(),
        }
        for a in authors
    ]


@router.post("", status_code=201)
async def create_author(
    author_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, author_data.get("brand_id"))
    author = AuthorProfile(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        name=author_data["name"],
        bio=author_data.get("bio"),
        credentials=author_data.get("credentials"),
        linkedin_url=author_data.get("linkedin_url"),
        expertise_areas=author_data.get("expertise_areas", []),
        eeeat_signals=author_data.get("eeeat_signals", {}),
        schema_markup=author_data.get("schema_markup", {}),
    )
    db.add(author)
    await db.commit()
    await db.refresh(author)
    return {"id": str(author.id), "name": author.name}


@router.put("/{author_id}")
async def update_author(
    author_id: uuid.UUID,
    author_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuthorProfile).where(AuthorProfile.id == author_id)
    )
    author = result.scalar_one_or_none()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    ensure_org_access(author, current_user)

    for field in ["name", "bio", "credentials", "linkedin_url", "expertise_areas", "eeeat_signals"]:
        if field in author_data:
            setattr(author, field, author_data[field])

    await db.commit()
    return {"id": str(author.id), "message": "updated"}


@router.delete("/{author_id}")
async def delete_author(
    author_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuthorProfile).where(AuthorProfile.id == author_id)
    )
    author = result.scalar_one_or_none()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    ensure_org_access(author, current_user)
    await db.delete(author)
    await db.commit()
    return {"message": "deleted"}
