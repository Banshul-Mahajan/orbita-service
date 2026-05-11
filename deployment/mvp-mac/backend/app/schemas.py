from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Generic response wrapper ──────────────────────────────────────────────────
class APIResponse(BaseModel):
    success: bool = True
    data: Any = None
    error: Optional[str] = None


# ── Projects ──────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Onboarding / website-first journey ────────────────────────────────────────
class OnboardingStartRequest(BaseModel):
    project_id: str
    company_name: str = Field(..., min_length=1, max_length=255)
    website_url: str = Field(..., min_length=3, max_length=1000)
    industry: Optional[str] = Field(default=None, max_length=255)
    target_audience: Optional[str] = None
    country: Optional[str] = Field(default=None, max_length=100)
    limit_per_seed: int = Field(default=12, ge=4, le=30)


class WebsiteScanRequest(BaseModel):
    project_id: str
    website_url: str = Field(..., min_length=3, max_length=1000)
    limit_per_seed: int = Field(default=12, ge=4, le=30)


class CompanyProfileOut(BaseModel):
    id: str
    project_id: str
    company_name: str
    website_url: str
    primary_domain: Optional[str]
    industry: Optional[str]
    target_audience: Optional[str]
    country: Optional[str]
    onboarding_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class WebsitePageOut(BaseModel):
    id: str
    url: str
    page_type: Optional[str]
    title: Optional[str]
    meta_description: Optional[str]
    h1: Optional[str]
    headings: Optional[List[dict]]
    body_excerpt: Optional[str]
    word_count: Optional[int]
    is_indexable: bool
    crawl_status: str

    class Config:
        from_attributes = True


class WebsiteScanRunOut(BaseModel):
    id: str
    project_id: str
    website_url: str
    status: str
    pages_discovered: int
    pages_scanned: int
    seed_topics: Optional[List[str]]
    errors: Optional[List[str]]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Keywords ──────────────────────────────────────────────────────────────────
class KeywordExpandRequest(BaseModel):
    project_id: str
    seed_keyword: str = Field(..., min_length=1, max_length=200)
    limit: int = Field(default=50, ge=5, le=200)


class KeywordClusterOut(BaseModel):
    id: str
    keyword: str
    cluster_id: int
    cluster_name: Optional[str]
    intent: Optional[str]
    search_volume: Optional[int]
    difficulty: Optional[float]

    class Config:
        from_attributes = True


class KeywordExpandResponse(BaseModel):
    seed_keyword: str
    total_keywords: int
    clusters: List[dict]   # [{cluster_id, cluster_name, intent, keywords: [...]}]


class KeywordOpportunityOut(BaseModel):
    id: str
    keyword: str
    seed_topic: Optional[str]
    intent: str
    intent_score: Optional[float]
    search_volume: Optional[int]
    difficulty: Optional[float]
    relevance_score: Optional[float]
    cluster_name: Optional[str]
    selected: bool
    source_page_url: Optional[str]

    class Config:
        from_attributes = True


class KeywordSelectionRequest(BaseModel):
    project_id: str
    keyword_ids: List[str] = Field(default_factory=list)
    selected: bool = True


# ── SERP ──────────────────────────────────────────────────────────────────────
class SerpAnalyzeRequest(BaseModel):
    project_id: str
    query: str = Field(..., min_length=1, max_length=500)
    num_results: int = Field(default=10, ge=5, le=20)


class SerpResultOut(BaseModel):
    id: str
    position: int
    title: Optional[str]
    url: Optional[str]
    domain: Optional[str]
    snippet: Optional[str]
    word_count: Optional[int]
    readability: Optional[float]
    entities: Optional[List[str]]

    class Config:
        from_attributes = True


# ── Competitors ───────────────────────────────────────────────────────────────
class CompetitorDiscoverRequest(BaseModel):
    project_id: str
    num_results: int = Field(default=10, ge=5, le=20)


class CompetitorDomainOut(BaseModel):
    id: str
    domain: str
    avg_position: Optional[float]
    ranking_keyword_count: int
    visibility_score: float
    top_keywords: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


class CompetitorPageOut(BaseModel):
    id: str
    competitor_domain_id: str
    keyword: str
    url: Optional[str]
    title: Optional[str]
    position: Optional[int]
    headings: Optional[List[dict]]
    entities: Optional[List[str]]
    word_count: Optional[int]
    readability: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ── AI Scan ───────────────────────────────────────────────────────────────────
class AiScanRequest(BaseModel):
    project_id: str
    query: str = Field(..., min_length=1, max_length=500)
    engines: List[str] = Field(default=["openai"])  # openai, mock_gemini, mock_perplexity


class AiScanResultOut(BaseModel):
    engine: str
    answer_text: Optional[str]
    cited_urls: Optional[List[str]]
    cited_domains: Optional[List[str]]
    answer_length: Optional[int]

    class Config:
        from_attributes = True


# ── Heatmap ───────────────────────────────────────────────────────────────────
class HeatmapRequest(BaseModel):
    project_id: str
    query: str


class HeatmapCell(BaseModel):
    channel: str        # google / openai / mock_gemini / etc.
    coverage_score: float   # 0.0 – 1.0
    top_domains: List[str]
    gap: bool           # True = AI covers it but Google doesn't (or vice versa)


class HeatmapRow(BaseModel):
    topic: str
    cells: List[HeatmapCell]


# ── Questions ─────────────────────────────────────────────────────────────────
class QuestionMineRequest(BaseModel):
    project_id: str
    topic: str = Field(..., min_length=1, max_length=300)


class QuestionOut(BaseModel):
    id: str
    question_text: str
    source: str
    q_type: Optional[str]

    class Config:
        from_attributes = True


# ── Content generation ────────────────────────────────────────────────────────
class ContentGenerateRequest(BaseModel):
    project_id: str
    keyword_id: str
    content_type: str = Field(default="informational", max_length=100)
    tone: str = Field(default="helpful", max_length=100)


class ContentDraftOut(BaseModel):
    id: str
    project_id: str
    keyword_id: Optional[str]
    title: str
    slug: Optional[str]
    content_type: str
    intent: str
    status: str
    meta_title: Optional[str]
    meta_description: Optional[str]
    outline: Optional[List[str]]
    body_markdown: Optional[str]
    faq: Optional[List[dict]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
