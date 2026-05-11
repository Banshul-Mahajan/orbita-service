"""
ORBITA Visibility Orbit — Database Models

All tables live in the 'visibility' PostgreSQL schema.

REMOVED models (now in core schema, managed by Auth Service):
  - Organization → core.organizations
  - User → core.users
  - Brand → core.brands

REMOVED models (now in Knowledge Core):
  - KnowledgeFact → knowledge.facts (call KC API instead)

KEPT models (visibility-owned):
  - ProbePrompt
  - ProbeRun
  - Alert
"""

import uuid
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text,
    Float, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base
from sqlalchemy.sql import func
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─── Probe System ──────────────────────────────────────────────────────────────

class ProbePrompt(Base):
    __tablename__ = "probe_prompts"
    __table_args__ = {"schema": "visibility"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)  # References core.brands.id
    project_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    prompt_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)  # "general", "pricing", "comparison", "niche"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LLMEngine(str, enum.Enum):
    claude = "claude"
    gpt4 = "gpt4"
    gemini = "gemini"


class ProbeStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ProbeRun(Base):
    __tablename__ = "probe_runs"
    __table_args__ = {"schema": "visibility"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    prompt_id = Column(UUID(as_uuid=False), nullable=True)
    llm_engine = Column(SAEnum(LLMEngine), nullable=False)
    status = Column(SAEnum(ProbeStatus), default=ProbeStatus.pending)
    prompt_text = Column(Text, nullable=False)        # snapshot of prompt at run time
    raw_response = Column(Text, nullable=True)        # full LLM response text
    parsed_result = Column(JSONB, nullable=True)      # parsed signals
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertType(str, enum.Enum):
    hallucination = "hallucination"
    negative_sentiment = "negative_sentiment"
    brand_not_mentioned = "brand_not_mentioned"


class AlertSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = {"schema": "visibility"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=True, index=True)
    probe_run_id = Column(UUID(as_uuid=False), nullable=True)
    alert_type = Column(SAEnum(AlertType), nullable=False)
    severity = Column(SAEnum(AlertSeverity), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    details = Column(JSONB, nullable=True)     # stated_claim, correct_fact, etc.
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# --- Restored for Router Compatibility ---
class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "visibility"}
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)

class Brand(Base):
    __tablename__ = "brands"
    __table_args__ = {"schema": "visibility"}
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), nullable=False)

class KnowledgeFact(Base):
    __tablename__ = "facts"
    __table_args__ = {"schema": "visibility"}
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    attribute = Column(String(200))
    value = Column(Text)
