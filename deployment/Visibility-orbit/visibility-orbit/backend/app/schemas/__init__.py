from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    org_name: str
    email: EmailStr
    password: str
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


# ─── Brand ─────────────────────────────────────────────────────────────────────

class BrandCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None


class BrandOut(BaseModel):
    id: str
    name: str
    slug: str
    industry: Optional[str]
    description: Optional[str]
    website: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Knowledge Facts ───────────────────────────────────────────────────────────

class FactCreate(BaseModel):
    category: str
    claim: str
    source_url: Optional[str] = None


class FactOut(BaseModel):
    id: str
    brand_id: str
    category: str
    claim: str
    source_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Probe Prompts ─────────────────────────────────────────────────────────────

class ProbePromptCreate(BaseModel):
    prompt_text: str
    category: str


class ProbePromptOut(BaseModel):
    id: str
    brand_id: str
    prompt_text: str
    category: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Probe Runs ────────────────────────────────────────────────────────────────

class RunProbeRequest(BaseModel):
    prompt_ids: List[str]
    engines: List[str]  # ["claude", "gpt4", "gemini"]


class ProbeRunOut(BaseModel):
    id: str
    brand_id: str
    prompt_id: Optional[str]
    llm_engine: str
    status: str
    prompt_text: str
    raw_response: Optional[str]
    parsed_result: Optional[Any]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Alerts ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: str
    brand_id: str
    probe_run_id: Optional[str]
    alert_type: str
    severity: str
    title: str
    description: str
    details: Optional[Any]
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_probes: int
    total_alerts: int
    unresolved_alerts: int
    hallucinations_detected: int
    avg_sentiment: Optional[float]
    engines_tested: List[str]
