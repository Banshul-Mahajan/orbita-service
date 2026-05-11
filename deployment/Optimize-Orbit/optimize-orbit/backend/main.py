"""
ORBITA Optimize Orbit — Main Application

Runs on port 8004. Provides SEO, GEO, E-E-A-T, and Schema scoring.
Now persists optimization runs to the 'optimize' schema.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.config import settings
from app.database import create_tables, get_db
from app.models import OptimizationRun

from services.seo_scorer import score_seo
from services.geo_scorer import score_geo
from services.eeat_analyzer import analyze_eeat
from services.schema_builder import build_schema
from services.score_composer import compose_score
from services.scraper import scrape_url

# Create optimize schema tables on startup
create_tables()

app = FastAPI(title="Optimize Orbit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    content: str
    target_keyword: str = ""
    content_type: str = "article"
    author_name: str = ""
    # Platform context (optional — for persistence and cross-service linking)
    organization_id: Optional[str] = None
    brand_id: Optional[str] = None
    project_id: Optional[str] = None
    article_id: Optional[str] = None


class UrlAnalyzeRequest(BaseModel):
    url: str
    target_keyword: str = ""
    content_type: str = "article"
    organization_id: Optional[str] = None
    brand_id: Optional[str] = None
    project_id: Optional[str] = None


def _request_token(request: Request) -> Optional[str]:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return request.cookies.get("orbit_token")


def _decode_request_token(request: Request) -> dict:
    token = _request_token(request)
    if not token:
        return {}
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return {}


def _resolve_platform_context(request: Request, req_data: dict) -> dict:
    payload = _decode_request_token(request)
    resolved = dict(req_data)
    resolved["organization_id"] = (
        req_data.get("organization_id")
        or request.headers.get("x-orbita-org-id")
        or payload.get("org_id")
    )
    resolved["brand_id"] = (
        req_data.get("brand_id")
        or request.headers.get("x-orbita-brand-id")
        or request.cookies.get("orbit_brand_id")
    )
    resolved["project_id"] = (
        req_data.get("project_id")
        or request.headers.get("x-orbita-project-id")
        or request.cookies.get("orbit_project_id")
    )
    resolved["created_by_user_id"] = req_data.get("created_by_user_id") or payload.get("sub")
    return resolved


def run_analysis(content: str, target_keyword: str, content_type: str, author_name: str = "") -> dict:
    seo    = score_seo(content, target_keyword)
    geo    = score_geo(content)
    eeat   = analyze_eeat(content, author_name)
    schema = build_schema(content, content_type, target_keyword)
    result = compose_score(seo, geo, eeat, schema)

    return {
        "overall_score": result.overall_score,
        "scores": {
            "seo":    seo.score,
            "geo":    geo.score,
            "eeat":   eeat.score,
            "schema": schema.score,
        },
        "issues":      result.all_issues,
        "schema_json": schema.json_ld,
        "schema_type": schema.detected_type,
        "details": {
            "seo":  seo.details,
            "geo":  geo.details,
            "eeat": eeat.details,
        },
    }


def persist_run(
    result: dict,
    source_type: str,
    req_data: dict,
    db: Session,
) -> str:
    """Persist an optimization run and return the run_id."""
    run = OptimizationRun(
        organization_id=req_data.get("organization_id"),
        brand_id=req_data.get("brand_id"),
        project_id=req_data.get("project_id"),
        article_id=req_data.get("article_id"),
        source_type=source_type,
        source_url=req_data.get("url"),
        target_keyword=req_data.get("target_keyword", ""),
        content_type=req_data.get("content_type", "article"),
        author_name=req_data.get("author_name", ""),
        overall_score=result.get("overall_score", 0),
        seo_score=result.get("scores", {}).get("seo"),
        geo_score=result.get("scores", {}).get("geo"),
        eeat_score=result.get("scores", {}).get("eeat"),
        schema_score=result.get("scores", {}).get("schema"),
        issues=result.get("issues"),
        schema_json=result.get("schema_json"),
        schema_type=result.get("schema_type"),
        details=result.get("details"),
        created_by_user_id=req_data.get("created_by_user_id"),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run.id


@app.get("/health")
async def health():
    return {"status": "ok", "service": "optimize-orbit", "version": "0.1.0"}


@app.post("/analyze")
@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest, request: Request, db: Session = Depends(get_db)):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")
    try:
        result = run_analysis(req.content, req.target_keyword, req.content_type, req.author_name)
        # Persist the run
        run_id = persist_run(
            result,
            "content",
            _resolve_platform_context(request, req.model_dump()),
            db,
        )
        result["run_id"] = run_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/url")
@app.post("/api/analyze/url")
async def analyze_from_url(req: UrlAnalyzeRequest, request: Request, db: Session = Depends(get_db)):
    try:
        scraped = await scrape_url(req.url)
        result  = run_analysis(scraped["content"], req.target_keyword, req.content_type)
        result["scraped_title"] = scraped.get("title", "")
        result["scraped_url"]   = req.url
        # Persist
        req_data = _resolve_platform_context(request, req.model_dump())
        req_data["url"] = req.url
        run_id = persist_run(result, "url", req_data, db)
        result["run_id"] = run_id
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/file")
@app.post("/api/analyze/file")
async def analyze_from_file(
    request: Request,
    file: UploadFile = File(...),
    target_keyword: str = Form(""),
    content_type:   str = Form("article"),
    author_name: str = Form(""),
    organization_id: Optional[str] = Form(None),
    brand_id: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    article_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    try:
        raw     = await file.read()
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be plain text (.txt or .md).")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = run_analysis(content, target_keyword, content_type, author_name)
        result["filename"] = file.filename
        # Persist
        req_data = _resolve_platform_context(
            request,
            {
                "target_keyword": target_keyword,
                "content_type": content_type,
                "author_name": author_name,
                "organization_id": organization_id,
                "brand_id": brand_id,
                "project_id": project_id,
                "article_id": article_id,
            },
        )
        run_id = persist_run(result, "file", req_data, db)
        result["run_id"] = run_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs")
@app.get("/api/runs")
async def list_runs(
    request: Request,
    brand_id: Optional[str] = None,
    project_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List recent optimization runs, optionally filtered by brand/project."""
    query = db.query(OptimizationRun)
    if not brand_id:
        brand_id = request.headers.get("x-orbita-brand-id") or request.cookies.get("orbit_brand_id")
    if not project_id:
        project_id = request.headers.get("x-orbita-project-id") or request.cookies.get("orbit_project_id")
    if brand_id:
        query = query.filter(OptimizationRun.brand_id == brand_id)
    if project_id:
        query = query.filter(OptimizationRun.project_id == project_id)
    runs = query.order_by(OptimizationRun.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "overall_score": r.overall_score,
            "target_keyword": r.target_keyword,
            "content_type": r.content_type,
            "source_type": r.source_type,
            "created_at": str(r.created_at),
        }
        for r in runs
    ]
