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
from ..models.fact import Fact
from ..models.entity import Entity
from ..services.embedding import delete_fact as delete_fact_embedding, upsert_fact
import uuid

router = APIRouter(prefix="/facts", tags=["facts"])


@router.get("")
async def list_facts(
    request: Request,
    brand_id: Optional[str] = Query(default=None),
    category: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await get_brand_context(request, current_user, brand_id, require_brand=False)
    if not context:
        return []

    query = (
        select(Fact, Entity.name.label("entity_name"))
        .join(Entity)
        .where(Fact.brand_id == context.brand_id)
        .order_by(Fact.created_at.desc())
    )
    if category:
        query = query.where(Fact.attribute == category)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.Fact.id),
            "entity_id": str(row.Fact.entity_id),
            "entity_name": row.entity_name,
            "brand_id": row.Fact.brand_id,
            "category": row.Fact.attribute,
            "claim": row.Fact.value,
            "attribute": row.Fact.attribute,
            "value": row.Fact.value,
            "unit": row.Fact.unit,
            "confidence": row.Fact.confidence,
            "is_verified": row.Fact.is_verified,
            "source_url": row.Fact.source_url,
            "created_at": row.Fact.created_at.isoformat(),
        }
        for row in rows
    ]


@router.get("/search")
async def search_facts(
    request: Request,
    brand_id: Optional[str] = Query(default=None),
    entity_name: Optional[str] = None,
    attribute: Optional[str] = None,
    min_confidence: float = Query(default=0.7),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Main endpoint queried by AI Writer and FactGuard."""
    context = await get_brand_context(request, current_user, brand_id, require_brand=False)
    if not context:
        return []

    query = (
        select(Fact, Entity.name.label("entity_name"))
        .join(Entity)
        .where(Fact.brand_id == context.brand_id, Fact.confidence >= min_confidence)
    )
    if entity_name:
        query = query.where(Entity.name.ilike(f"%{entity_name}%"))
    if attribute:
        query = query.where(Fact.attribute.ilike(f"%{attribute}%"))

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.Fact.id),
            "entity_id": str(row.Fact.entity_id),
            "entity_name": row.entity_name,
            "attribute": row.Fact.attribute,
            "value": row.Fact.value,
            "unit": row.Fact.unit,
            "confidence": row.Fact.confidence,
            "is_verified": row.Fact.is_verified,
            "source_url": row.Fact.source_url,
        }
        for row in rows
    ]


@router.post("", status_code=201)
async def create_fact(
    fact_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    value = (fact_data.get("value") or fact_data.get("claim") or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="claim or value is required")

    entity = None
    entity_id = fact_data.get("entity_id")
    if entity_id:
        try:
            parsed_entity_id = uuid.UUID(entity_id)
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="entity_id must be a valid UUID") from exc

        result = await db.execute(select(Entity).where(Entity.id == parsed_entity_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        ensure_org_access(entity, current_user)
    else:
        context = await get_brand_context(request, current_user, fact_data.get("brand_id"))
        entity_name = (
            fact_data.get("entity_name")
            or fact_data.get("category")
            or fact_data.get("attribute")
            or "Brand Knowledge"
        )
        result = await db.execute(
            select(Entity).where(
                Entity.organization_id == context.organization_id,
                Entity.brand_id == context.brand_id,
                Entity.name == entity_name,
            )
        )
        entity = result.scalar_one_or_none()
        if not entity:
            entity = Entity(
                organization_id=context.organization_id,
                brand_id=context.brand_id,
                name=entity_name,
                type=fact_data.get("entity_type", "policy"),
                category=fact_data.get("category"),
                description=fact_data.get("entity_description"),
            )
            db.add(entity)
            await db.flush()

    fact = Fact(
        entity_id=entity.id,
        organization_id=entity.organization_id,
        brand_id=entity.brand_id,
        attribute=fact_data.get("attribute") or fact_data.get("category") or "general",
        value=value,
        unit=fact_data.get("unit"),
        confidence=fact_data.get("confidence", 0.95),
        is_verified=fact_data.get("is_verified", True),
        verified_by=fact_data.get("verified_by"),
        source_url=fact_data.get("source_url"),
    )
    db.add(fact)
    await db.commit()
    await db.refresh(fact)
    try:
        await upsert_fact(
            fact_id=str(fact.id),
            entity_id=str(fact.entity_id),
            entity_name=entity.name,
            attribute=fact.attribute,
            value=fact.value,
            brand_id=str(fact.brand_id),
            confidence=fact.confidence,
            source_url=fact.source_url,
            is_verified=fact.is_verified,
        )
    except Exception:
        pass
    return {
        "id": str(fact.id),
        "entity_id": str(fact.entity_id),
        "brand_id": fact.brand_id,
        "category": fact.attribute,
        "claim": fact.value,
        "attribute": fact.attribute,
        "value": fact.value,
        "confidence": fact.confidence,
        "is_verified": fact.is_verified,
        "source_url": fact.source_url,
        "created_at": fact.created_at.isoformat(),
    }


@router.post("/entity/{entity_id}", status_code=201)
async def add_fact(
    entity_id: uuid.UUID,
    fact_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    ensure_org_access(entity, current_user)

    fact = Fact(
        entity_id=entity_id,
        organization_id=entity.organization_id,
        brand_id=entity.brand_id,
        attribute=fact_data["attribute"],
        value=fact_data["value"],
        unit=fact_data.get("unit"),
        confidence=fact_data.get("confidence", 0.8),
        is_verified=fact_data.get("is_verified", False),
        verified_by=fact_data.get("verified_by"),
        source_url=fact_data.get("source_url"),
    )
    db.add(fact)
    await db.commit()
    await db.refresh(fact)
    return {
        "id": str(fact.id),
        "attribute": fact.attribute,
        "value": fact.value,
        "confidence": fact.confidence,
    }


@router.put("/{fact_id}")
async def update_fact(
    fact_id: uuid.UUID,
    fact_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fact).where(Fact.id == fact_id))
    fact = result.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    ensure_org_access(fact, current_user)

    for field in [
        "attribute",
        "value",
        "unit",
        "confidence",
        "is_verified",
        "verified_by",
        "source_url",
    ]:
        if field in fact_data:
            setattr(fact, field, fact_data[field])

    await db.commit()
    entity_result = await db.execute(select(Entity).where(Entity.id == fact.entity_id))
    entity = entity_result.scalar_one_or_none()
    try:
        await upsert_fact(
            fact_id=str(fact.id),
            entity_id=str(fact.entity_id),
            entity_name=entity.name if entity else "",
            attribute=fact.attribute,
            value=fact.value,
            brand_id=str(fact.brand_id),
            confidence=fact.confidence,
            source_url=fact.source_url,
            is_verified=fact.is_verified,
        )
    except Exception:
        pass
    return {"id": str(fact.id), "message": "updated"}


@router.delete("/{fact_id}")
async def delete_fact(
    fact_id: uuid.UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Fact).where(Fact.id == fact_id))
    fact = result.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    ensure_org_access(fact, current_user)
    await db.delete(fact)
    await db.commit()
    try:
        delete_fact_embedding(str(fact.id))
    except Exception:
        pass
    return {"message": "deleted"}
