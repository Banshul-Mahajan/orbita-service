"""
ORBITA Auth Service — Core Platform Models

These models define the shared identity layer used by ALL services:
organizations, users, organization memberships, brands, and projects.

All tables live in the 'core' PostgreSQL schema.
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


# ── Organization ──────────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    brands = relationship("Brand", back_populates="organization", cascade="all, delete-orphan")


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")


# ── Organization Membership ──────────────────────────────────────────────────

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_user"),
        {"schema": "core"},
    )

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(50), nullable=False, default="owner")  # owner | admin | member | viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")


# ── Brand ─────────────────────────────────────────────────────────────────────

class Brand(Base):
    __tablename__ = "brands"
    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_org_brand_slug"),
        {"schema": "core"},
    )

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    slug = Column(String(100), nullable=False)
    industry = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    website_url = Column(String(500), nullable=True)
    primary_domain = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    created_by_user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="brands")
    projects = relationship("Project", back_populates="brand", cascade="all, delete-orphan")


# ── Project ───────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    brand_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.brands.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_audience = Column(Text, nullable=True)
    locale = Column(String(10), default="en-US")
    status = Column(String(50), default="active")  # active | paused | completed | archived
    created_by_user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    brand = relationship("Brand", back_populates="projects")
