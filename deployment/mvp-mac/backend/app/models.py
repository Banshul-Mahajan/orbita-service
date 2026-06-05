"""
ORBITA Discover Orbit — Database Models

All tables live in the 'discover' PostgreSQL schema.
Projects and CompanyProfiles are removed — they now live in core.projects
and core.brands (owned by the Auth Service).

All tables include organization_id and brand_id for multi-tenant scoping.
"""

from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


# ── NOTE ──────────────────────────────────────────────────────────────────────
# Project and CompanyProfile have been removed.
# Use core.projects (via Auth Service API) and core.brands instead.
# project_id columns now reference core.projects.id (UUID).
# ──────────────────────────────────────────────────────────────────────────────


class WebsiteScanRun(Base):
    __tablename__ = "website_scan_runs"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    website_url = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="completed")
    pages_discovered = Column(Integer, nullable=False, default=0)
    pages_scanned = Column(Integer, nullable=False, default=0)
    seed_topics = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class WebsitePage(Base):
    __tablename__ = "website_pages"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    scan_run_id = Column(UUID(as_uuid=False), nullable=False)
    url = Column(Text, nullable=False)
    page_type = Column(String(100), nullable=True)
    title = Column(Text, nullable=True)
    meta_description = Column(Text, nullable=True)
    h1 = Column(Text, nullable=True)
    headings = Column(JSON, nullable=True)
    body_excerpt = Column(Text, nullable=True)
    word_count = Column(Integer, nullable=True)
    is_indexable = Column(Boolean, nullable=False, default=True)
    crawl_status = Column(String(50), nullable=False, default="scanned")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KeywordCluster(Base):
    __tablename__ = "keyword_clusters"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    seed_keyword = Column(String(500), nullable=False)
    cluster_id = Column(Integer, nullable=False)
    cluster_name = Column(String(255), nullable=True)
    keyword = Column(String(500), nullable=False)
    search_volume = Column(Integer, nullable=True)
    difficulty = Column(Float, nullable=True)
    intent = Column(String(50), nullable=True)  # informational/commercial/transactional/navigational
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KeywordOpportunity(Base):
    __tablename__ = "keyword_opportunities"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    source_run_id = Column(UUID(as_uuid=False), nullable=True)
    source_page_url = Column(Text, nullable=True)
    seed_topic = Column(String(500), nullable=True)
    keyword = Column(String(500), nullable=False)
    normalized_keyword = Column(String(500), nullable=False)
    intent = Column(String(50), nullable=False)
    intent_score = Column(Float, nullable=True)
    search_volume = Column(Integer, nullable=True)
    difficulty = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=True)
    cluster_name = Column(String(255), nullable=True)
    selected = Column(Boolean, nullable=False, default=False)
    selection_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SerpResult(Base):
    __tablename__ = "serp_results"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    query = Column(String(500), nullable=False)
    position = Column(Integer, nullable=False)
    title = Column(Text, nullable=True)
    url = Column(Text, nullable=True)
    domain = Column(String(255), nullable=True)
    snippet = Column(Text, nullable=True)
    headings = Column(JSON, nullable=True)       # list of h1/h2/h3
    entities = Column(JSON, nullable=True)       # list of entity strings
    word_count = Column(Integer, nullable=True)
    readability = Column(Float, nullable=True)  # Flesch score approx
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompetitorDomain(Base):
    __tablename__ = "competitor_domains"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    domain = Column(String(255), nullable=False)
    avg_position = Column(Float, nullable=True)
    ranking_keyword_count = Column(Integer, nullable=False, default=0)
    visibility_score = Column(Float, nullable=False, default=0.0)
    top_keywords = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompetitorPage(Base):
    __tablename__ = "competitor_pages"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    competitor_domain_id = Column(UUID(as_uuid=False), nullable=False)
    keyword_id = Column(UUID(as_uuid=False), nullable=True)
    keyword = Column(String(500), nullable=False)
    url = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    position = Column(Integer, nullable=True)
    headings = Column(JSON, nullable=True)
    entities = Column(JSON, nullable=True)
    word_count = Column(Integer, nullable=True)
    readability = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AiScanResult(Base):
    __tablename__ = "ai_scan_results"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    query = Column(String(500), nullable=False)
    engine = Column(String(50), nullable=False)   # openai / claude / mock
    answer_text = Column(Text, nullable=True)
    cited_urls = Column(JSON, nullable=True)       # list of URLs found in answer
    cited_domains = Column(JSON, nullable=True)    # list of domains
    answer_length = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    topic = Column(String(500), nullable=False)
    question_text = Column(Text, nullable=False)
    source = Column(String(50), nullable=False)  # paa / ai / reddit
    q_type = Column(String(20), nullable=True)   # who/what/how/why/when/other
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContentDraft(Base):
    """
    Renamed conceptually to 'content ideas' — research output from Discover.
    For production content, use Create Orbit briefs/articles.
    """
    __tablename__ = "content_drafts"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    keyword_id = Column(UUID(as_uuid=False), nullable=True)
    title = Column(Text, nullable=False)
    slug = Column(String(500), nullable=True)
    content_type = Column(String(100), nullable=False)
    intent = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="draft")
    meta_title = Column(Text, nullable=True)
    meta_description = Column(Text, nullable=True)
    outline = Column(JSON, nullable=True)
    body_markdown = Column(Text, nullable=True)
    faq = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OnboardingProfile(Base):
    """
    Full onboarding information architecture for a project.

    Mirrors the Orbita user-onboarding IA. Core identity fields (company name,
    website, industry, country, target audience, locale) are still synced to
    core.brands / core.projects via the Auth Service; this table stores the
    rich, structured sections that have no home in the core schema. Each
    section is kept as JSON so the wizard can evolve without migrations.
    One row per project.
    """
    __tablename__ = "onboarding_profiles"
    __table_args__ = {"schema": "discover"}

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=False), nullable=False, unique=True, index=True)

    # IA section 2 — Company Information (basic details, business type, goals, assets)
    company = Column(JSON, nullable=True)
    # IA section 3 — Target Audience Information
    audience = Column(JSON, nullable=True)
    # IA section 4 — Product & Service Information (list of products)
    products = Column(JSON, nullable=True)
    # IA section 5 — Competitor Information (list of competitors)
    competitors = Column(JSON, nullable=True)
    # IA section 6 — Geography & Localization Setup
    geography = Column(JSON, nullable=True)
    # IA section 7 — Seed Keyword Collection (seed keywords + categories)
    keywords = Column(JSON, nullable=True)
    # IA section 8 — AI Search & GEO Intelligence Inputs
    ai_geo = Column(JSON, nullable=True)
    # IA section 9 — Existing Digital Presence
    digital_presence = Column(JSON, nullable=True)
    # IA section 11 — Technical SEO Inputs (optional advanced setup)
    technical_seo = Column(JSON, nullable=True)

    status = Column(String(50), nullable=False, default="in_progress")  # in_progress | completed
    completed_steps = Column(JSON, nullable=True)  # list of finished step keys
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --- Restored for Router Compatibility ---
class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": "discover"}
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)


class CompanyProfile(Base):
    __tablename__ = "company_profiles"
    __table_args__ = {"schema": "discover"}
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(UUID(as_uuid=False), nullable=True)
    company_name = Column(String(200), nullable=False)
    website_url = Column(String(500), nullable=True)
    primary_domain = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    target_audience = Column(Text, nullable=True)
    country = Column(String(100), nullable=True)
    onboarding_status = Column(String(50), nullable=True)
