"""
ORBITA Auth Service — Brands Router

CRUD for brands scoped to the current user's organization.
"""

import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Brand, OrganizationMember, User
from app.schemas import BrandCreate, BrandUpdate, BrandOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/brands", tags=["brands"])


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _get_org_id(user: User, db: Session) -> str:
    """Get the user's organization ID."""
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="User has no organization")
    return membership.organization_id


@router.post("", response_model=BrandOut, status_code=201)
@router.post("/", response_model=BrandOut, status_code=201)
def create_brand(
    payload: BrandCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)

    # Generate unique slug within org
    base_slug = slugify(payload.name)
    slug = base_slug
    counter = 1
    while (
        db.query(Brand)
        .filter(Brand.organization_id == org_id, Brand.slug == slug)
        .first()
    ):
        slug = f"{base_slug}-{counter}"
        counter += 1

    brand = Brand(
        organization_id=org_id,
        name=payload.name,
        slug=slug,
        industry=payload.industry,
        description=payload.description,
        website_url=payload.website_url,
        primary_domain=payload.primary_domain,
        country=payload.country,
        created_by_user_id=current_user.id,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.get("", response_model=List[BrandOut])
@router.get("/", response_model=List[BrandOut])
def list_brands(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    brands = (
        db.query(Brand)
        .filter(Brand.organization_id == org_id)
        .order_by(Brand.created_at.desc())
        .all()
    )
    return brands


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(
    brand_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.organization_id == org_id)
        .first()
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.organization_id == org_id)
        .first()
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(brand, field, value)

    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.organization_id == org_id)
        .first()
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    db.delete(brand)
    db.commit()
    return {"success": True, "message": "Brand deleted"}
