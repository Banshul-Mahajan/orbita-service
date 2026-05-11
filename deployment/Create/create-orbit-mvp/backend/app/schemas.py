from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import ToneStyle, BriefStatus, ArticleStatus, ClaimStatus, CorpusStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Tone Profile ──────────────────────────────────────────────────────────────

class ToneProfileCreate(BaseModel):
    name: str
    style: ToneStyle = ToneStyle.conversational
    system_prompt: Optional[str] = None
    few_shot_examples: List[Dict] = []
    is_default: bool = False


class ToneProfileOut(ToneProfileCreate):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Brief ─────────────────────────────────────────────────────────────────────

class BriefGenerateRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=300)
    target_audience: Optional[str] = None
    tone_style: ToneStyle = ToneStyle.conversational
    additional_context: Optional[str] = None


class BriefUpdate(BaseModel):
    h1: Optional[str] = None
    h2s: Optional[List[str]] = None
    h3s: Optional[Dict[str, List[str]]] = None
    keywords: Optional[List[str]] = None
    questions: Optional[List[str]] = None
    entities: Optional[List[str]] = None
    status: Optional[BriefStatus] = None


class BriefOut(BaseModel):
    id: str
    topic: str
    h1: Optional[str]
    h2s: List[str]
    h3s: Dict[str, List[str]]
    keywords: List[str]
    questions: List[str]
    entities: List[str]
    target_audience: Optional[str]
    tone_style: ToneStyle
    status: BriefStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ── Article ───────────────────────────────────────────────────────────────────

class ArticleCreate(BaseModel):
    brief_id: str
    tone_style: Optional[ToneStyle] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    tone_style: Optional[ToneStyle] = None


class ClaimOut(BaseModel):
    id: str
    text: str
    status: ClaimStatus
    confidence: float
    source_context: Optional[str]
    reasoning: Optional[str]

    class Config:
        from_attributes = True


class ArticleOut(BaseModel):
    id: str
    brief_id: str
    title: Optional[str]
    body: str
    word_count: int
    tone_style: ToneStyle
    entity_score: float
    factguard_status: str
    status: ArticleStatus
    created_at: datetime
    updated_at: Optional[datetime]
    claims: List[ClaimOut] = []

    class Config:
        from_attributes = True


# ── Corpus ────────────────────────────────────────────────────────────────────

class CorpusDocCreate(BaseModel):
    title: str
    content: Optional[str] = None
    source_url: Optional[str] = None
    source_type: str = "text"  # "text" | "url"


class CorpusDocOut(BaseModel):
    id: str
    title: str
    source_type: str
    source_url: Optional[str]
    chunk_count: int
    status: CorpusStatus
    error_message: Optional[str]
    indexed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CorpusQueryRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class CorpusQueryResult(BaseModel):
    chunk: str
    source_title: str
    relevance_score: float
    doc_id: str


# ── FactGuard ─────────────────────────────────────────────────────────────────

class FactGuardRequest(BaseModel):
    article_id: str


class FactGuardResult(BaseModel):
    article_id: str
    total_claims: int
    verified: int
    flagged: int
    unverified: int
    claims: List[ClaimOut]
    overall_status: str  # "passed" | "flagged" | "pending"
