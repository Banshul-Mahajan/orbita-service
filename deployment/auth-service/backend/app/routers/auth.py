"""
ORBITA Auth Service — Authentication Router

Endpoints:
  POST /api/auth/register  — create org + user, return JWT
  POST /api/auth/login     — validate credentials, return JWT
  GET  /api/auth/me        — return current user profile
  POST /api/auth/validate  — validate a JWT (for inter-service use)
"""

import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Organization, User, OrganizationMember
from app.schemas import (
    RegisterRequest, LoginRequest, TokenResponse,
    UserOut, ValidateTokenResponse,
)
from app.core.auth import hash_password, verify_password, create_access_token, decode_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check email uniqueness
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create organization with unique slug
    base_slug = slugify(payload.org_name)
    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=payload.org_name, slug=slug)
    db.add(org)
    db.flush()

    # Create user
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_admin=True,
    )
    db.add(user)
    db.flush()

    # Create org membership
    membership = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
    )
    db.add(membership)
    db.commit()
    db.refresh(user)

    # Issue JWT with standard claims
    token = create_access_token({
        "sub": user.id,
        "org_id": org.id,
        "email": user.email,
        "roles": ["owner"],
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        org_id=org.id,
        email=user.email,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")

    # Find user's primary organization
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    org_id = membership.organization_id if membership else ""

    # Determine roles
    roles = [membership.role] if membership else []
    if user.is_admin:
        roles.append("admin")

    token = create_access_token({
        "sub": user.id,
        "org_id": org_id,
        "email": user.email,
        "roles": roles,
    })

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        org_id=org_id,
        email=user.email,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/validate", response_model=ValidateTokenResponse)
def validate_token(token_data: dict):
    """
    Validate a JWT token. Used by services that need to verify tokens
    via HTTP call instead of local validation (edge cases only).
    """
    token = token_data.get("token", "")
    payload = decode_token(token)

    if not payload:
        return ValidateTokenResponse(valid=False)

    return ValidateTokenResponse(
        valid=True,
        user_id=payload.get("sub"),
        org_id=payload.get("org_id"),
        email=payload.get("email"),
        roles=payload.get("roles", []),
    )
