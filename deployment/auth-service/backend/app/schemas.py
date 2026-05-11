"""
ORBITA Auth Service — Pydantic Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    org_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    org_id: str
    email: str
    full_name: Optional[str]


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ValidateTokenResponse(BaseModel):
    valid: bool
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    email: Optional[str] = None
    roles: Optional[List[str]] = None


# ── Organization ──────────────────────────────────────────────────────────────

class OrganizationOut(BaseModel):
    id: str
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None


# ── Brand ─────────────────────────────────────────────────────────────────────

class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    industry: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    primary_domain: Optional[str] = None
    country: Optional[str] = None


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    primary_domain: Optional[str] = None
    country: Optional[str] = None


class BrandOut(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    industry: Optional[str]
    description: Optional[str]
    website_url: Optional[str]
    primary_domain: Optional[str]
    country: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    target_audience: Optional[str] = None
    locale: str = "en-US"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    locale: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    organization_id: str
    brand_id: str
    name: str
    description: Optional[str]
    target_audience: Optional[str]
    locale: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
