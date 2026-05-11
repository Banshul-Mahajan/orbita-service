"""
ORBITA Auth Service — Organizations Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Organization, OrganizationMember, User
from app.schemas import OrganizationOut, OrganizationUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationOut)
def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's organization."""
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == current_user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="No organization found")

    org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return org


@router.put("/me", response_model=OrganizationOut)
def update_my_organization(
    payload: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's organization. Requires admin role."""
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role.in_(["owner", "admin"]),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not authorized to update organization")

    org = db.query(Organization).filter(Organization.id == membership.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if payload.name is not None:
        org.name = payload.name

    db.commit()
    db.refresh(org)
    return org
