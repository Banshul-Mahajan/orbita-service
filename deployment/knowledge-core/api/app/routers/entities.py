from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from ..database import get_db
from ..core.platform import (
    CurrentUser,
    ensure_org_access,
    get_brand_context,
    get_current_user,
)
from ..models.entity import Entity
from ..models.fact import Fact
import uuid

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("")
async def list_entities(
    request: Request,
    brand_id: Optional[str] = Query(default=None, description="Brand ID"),
    search: Optional[str] = None,
    type: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, brand_id, require_brand=False)
    if not context:
        return []

    query = select(Entity).where(Entity.brand_id == context.brand_id)
    if search:
        query = query.where(Entity.name.ilike(f"%{search}%"))
    if type:
        query = query.where(Entity.type == type)
    query = query.order_by(Entity.created_at.desc())

    result = await db.execute(query)
    entities = result.scalars().all()

    output = []
    for e in entities:
        count_result = await db.execute(
            select(func.count(Fact.id)).where(Fact.entity_id == e.id)
        )
        fact_count = count_result.scalar() or 0
        output.append(
            {
                "id": str(e.id),
                "name": e.name,
                "type": e.type,
                "category": e.category,
                "description": e.description,
                "brand_id": e.brand_id,
                "created_at": e.created_at.isoformat(),
                "fact_count": fact_count,
            }
        )
    return output


@router.post("", status_code=201)
async def create_entity(
    entity_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(
        request,
        current_user,
        entity_data.get("brand_id"),
    )

    entity = Entity(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        name=entity_data["name"],
        type=entity_data.get("type", "product"),
        category=entity_data.get("category"),
        description=entity_data.get("description"),
    )
    db.add(entity)
    await db.commit()
    await db.refresh(entity)
    return {
        "id": str(entity.id),
        "name": entity.name,
        "type": entity.type,
        "category": entity.category,
        "brand_id": entity.brand_id,
        "created_at": entity.created_at.isoformat(),
    }


@router.get("/{entity_id}")
async def get_entity(
    entity_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Entity)
        .options(selectinload(Entity.facts))
        .where(Entity.id == entity_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_org_access(entity, current_user)

    return {
        "id": str(entity.id),
        "name": entity.name,
        "type": entity.type,
        "category": entity.category,
        "description": entity.description,
        "brand_id": entity.brand_id,
        "created_at": entity.created_at.isoformat(),
        "facts": [
            {
                "id": str(f.id),
                "attribute": f.attribute,
                "value": f.value,
                "unit": f.unit,
                "confidence": f.confidence,
                "is_verified": f.is_verified,
                "verified_by": f.verified_by,
                "source_url": f.source_url,
                "created_at": f.created_at.isoformat(),
            }
            for f in entity.facts
        ],
    }


@router.put("/{entity_id}")
async def update_entity(
    entity_id: uuid.UUID,
    entity_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_org_access(entity, current_user)

    for field in ["name", "type", "category", "description"]:
        if field in entity_data:
            setattr(entity, field, entity_data[field])

    await db.commit()
    await db.refresh(entity)
    return {"id": str(entity.id), "name": entity.name, "message": "updated"}


@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_org_access(entity, current_user)
    await db.delete(entity)
    await db.commit()
    return {"message": "deleted"}
