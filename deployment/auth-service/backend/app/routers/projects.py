"""
ORBITA Auth Service — Projects Router

CRUD for projects scoped to a brand within the user's organization.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Project, Brand, OrganizationMember, User
from app.schemas import ProjectCreate, ProjectUpdate, ProjectOut
from app.core.deps import get_current_user

router = APIRouter(tags=["projects"])


def _get_org_id(user: User, db: Session) -> str:
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="User has no organization")
    return membership.organization_id


def _verify_brand_access(brand_id: str, org_id: str, db: Session) -> Brand:
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.organization_id == org_id)
        .first()
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.post("/brands/{brand_id}/projects", response_model=ProjectOut, status_code=201)
def create_project(
    brand_id: str,
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    _verify_brand_access(brand_id, org_id, db)

    project = Project(
        organization_id=org_id,
        brand_id=brand_id,
        name=payload.name,
        description=payload.description,
        target_audience=payload.target_audience,
        locale=payload.locale,
        created_by_user_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/brands/{brand_id}/projects", response_model=List[ProjectOut])
def list_projects(
    brand_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    _verify_brand_access(brand_id, org_id, db)

    projects = (
        db.query(Project)
        .filter(Project.brand_id == brand_id, Project.organization_id == org_id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return projects


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == org_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = _get_org_id(current_user, db)
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == org_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project
