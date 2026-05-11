"""
ORBITA Create Orbit — Database Models

All tables live in the 'create_orbit' PostgreSQL schema.
The User model has been removed — users now live in core.users
(managed by the Auth Service).

All tables include organization_id, brand_id, and project_id for
multi-tenant scoping. user_id references core.users.id but without
a foreign key constraint (cross-schema FK).
"""

from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean,
    DateTime, JSON, Enum as SAEnum
)
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid


def gen_uuid():
    return str(uuid.uuid4())


# ── Enums ──────────────────────────────────────────────────────────────────────

class ToneStyle(str, enum.Enum):
    authoritative = "authoritative"
    conversational = "conversational"
    scientific = "scientific"
    minimalist = "minimalist"


class BriefStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"


class ArticleStatus(str, enum.Enum):
    draft = "draft"
    reviewing = "reviewing"
    published = "published"


class ClaimStatus(str, enum.Enum):
    verified = "verified"
    flagged = "flagged"
    unverified = "unverified"
    accepted = "accepted"  # human override


class CorpusStatus(str, enum.Enum):
    pending = "pending"
    indexing = "indexing"
    indexed = "indexed"
    failed = "failed"


# ── NOTE ──────────────────────────────────────────────────────────────────────
# User model REMOVED — users now live in core.users (Auth Service).
# user_id columns are plain UUID strings referencing core.users.id.
# No foreign key constraint is used (cross-schema reference).
# ──────────────────────────────────────────────────────────────────────────────


class ToneProfile(Base):
    __tablename__ = "tone_profiles"
    __table_args__ = {"schema": "create_orbit"}

    id = Column(String, primary_key=True, default=gen_uuid)
    organization_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)  # References core.users.id
    name = Column(String, nullable=False)
    style = Column(SAEnum(ToneStyle), default=ToneStyle.conversational)
    system_prompt = Column(Text, nullable=True)
    few_shot_examples = Column(JSON, default=list)  # [{"input": "", "output": ""}]
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Brief(Base):
    __tablename__ = "briefs"
    __table_args__ = {"schema": "create_orbit"}

    id = Column(String, primary_key=True, default=gen_uuid)
    organization_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=True, index=True)
    user_id = Column(String, nullable=False)  # References core.users.id
    topic = Column(String, nullable=False)
    h1 = Column(String, nullable=True)
    h2s = Column(JSON, default=list)        # ["Section 1", "Section 2"]
    h3s = Column(JSON, default=dict)        # {"Section 1": ["Sub A", "Sub B"]}
    keywords = Column(JSON, default=list)   # ["keyword1", "keyword2"]
    questions = Column(JSON, default=list)  # ["What is X?", "How does Y work?"]
    entities = Column(JSON, default=list)   # ["Entity1", "Entity2"]
    target_audience = Column(String, nullable=True)
    tone_style = Column(SAEnum(ToneStyle), default=ToneStyle.conversational)
    status = Column(SAEnum(BriefStatus), default=BriefStatus.draft)
    # Discover → Create handoff fields
    source_keyword_opportunity_id = Column(String, nullable=True)  # discover.keyword_opportunities.id
    source_serp_query = Column(String, nullable=True)
    research_context = Column(JSON, nullable=True)  # SERP data, AI scan data, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = {"schema": "create_orbit"}

    id = Column(String, primary_key=True, default=gen_uuid)
    brief_id = Column(String, nullable=False)
    organization_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=True, index=True)
    user_id = Column(String, nullable=False)  # References core.users.id
    title = Column(String, nullable=True)
    body = Column(Text, default="")
    word_count = Column(Integer, default=0)
    tone_style = Column(SAEnum(ToneStyle), default=ToneStyle.conversational)
    entity_score = Column(Float, default=0.0)   # 0-100
    factguard_status = Column(String, default="pending")  # pending|passed|flagged
    status = Column(SAEnum(ArticleStatus), default=ArticleStatus.draft)
    # Optimize integration
    latest_optimization_run_id = Column(String, nullable=True)
    latest_optimization_score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = {"schema": "create_orbit"}

    id = Column(String, primary_key=True, default=gen_uuid)
    article_id = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    status = Column(SAEnum(ClaimStatus), default=ClaimStatus.unverified)
    confidence = Column(Float, default=0.0)     # 0.0-1.0
    source_context = Column(Text, nullable=True)  # matching corpus chunk
    reasoning = Column(Text, nullable=True)       # why flagged/verified
    # Knowledge Core reference
    knowledge_core_fact_id = Column(String, nullable=True)  # knowledge.facts.id
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CorpusDocument(Base):
    __tablename__ = "corpus_documents"
    __table_args__ = {"schema": "create_orbit"}

    id = Column(String, primary_key=True, default=gen_uuid)
    organization_id = Column(String, nullable=False, index=True)
    brand_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)  # References core.users.id
    title = Column(String, nullable=False)
    source_type = Column(String, default="text")  # text|url|pdf
    content = Column(Text, nullable=True)
    source_url = Column(String, nullable=True)
    chunk_count = Column(Integer, default=0)
    status = Column(SAEnum(CorpusStatus), default=CorpusStatus.pending)
    error_message = Column(Text, nullable=True)
    indexed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Restored for Router Compatibility ---
class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "create_orbit"}
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    organization_id = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
