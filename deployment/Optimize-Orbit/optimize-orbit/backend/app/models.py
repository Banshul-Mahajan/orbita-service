"""
ORBITA Optimize Orbit — Database Models

Persistence for optimization runs and their results.
Tables live in the 'optimize' PostgreSQL schema.
"""

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class OptimizationRun(Base):
    """A single content optimization analysis."""
    __tablename__ = "optimization_runs"
    __table_args__ = {"schema": "optimize"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    article_id = Column(UUID(as_uuid=False), nullable=True)  # create_orbit.articles.id
    source_type = Column(String(50), nullable=False, default="content")  # content | url | file
    source_url = Column(Text, nullable=True)
    target_keyword = Column(String(500), nullable=True)
    content_type = Column(String(100), nullable=False, default="article")
    author_name = Column(String(255), nullable=True)
    overall_score = Column(Integer, nullable=False, default=0)
    seo_score = Column(Integer, nullable=True)
    geo_score = Column(Integer, nullable=True)
    eeat_score = Column(Integer, nullable=True)
    schema_score = Column(Integer, nullable=True)
    issues = Column(JSONB, nullable=True)
    schema_json = Column(JSONB, nullable=True)
    schema_type = Column(String(100), nullable=True)
    details = Column(JSONB, nullable=True)  # Full details: seo, geo, eeat breakdowns
    status = Column(String(50), nullable=False, default="completed")
    created_by_user_id = Column(UUID(as_uuid=False), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
