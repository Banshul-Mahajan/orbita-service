from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform import (
    CurrentUser,
    get_current_user,
    get_project_context,
    project_scope_filters,
    update_brand_profile,
    update_project_profile,
)
from app.database import get_db
from app.models import (
    KeywordOpportunity,
    OnboardingProfile,
    WebsitePage,
    WebsiteScanRun,
)
from app.schemas import (
    APIResponse,
    OnboardingProfileSave,
    OnboardingStartRequest,
    WebsiteScanRequest,
)
from app.services.keyword_opportunity_service import build_keyword_opportunities
from app.services.website_scan_service import extract_domain, scan_website

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


def _merge_seed_topics(
    user_seeds: list[str] | None,
    auto_topics: list[str],
    max_seeds: int = 6,
) -> list[dict]:
    """Merge user-provided seed keywords with auto-extracted topics.

    User seeds are prioritised; auto-extracted topics fill remaining slots.
    Duplicates (by normalised lowercase form) are removed.
    """
    merged: list[dict] = []
    seen: set[str] = set()

    # User seeds come first
    for kw in (user_seeds or []):
        norm = kw.strip().lower()
        if norm and norm not in seen:
            seen.add(norm)
            merged.append({"topic": kw.strip(), "source": "user_seed"})

    # Auto-extracted topics fill the rest
    for topic in auto_topics:
        if len(merged) >= max_seeds:
            break
        norm = topic.strip().lower()
        if norm and norm not in seen:
            seen.add(norm)
            merged.append({"topic": topic.strip(), "source": "website_scan"})

    return merged[:max_seeds]


async def _persist_scan_and_keywords(
    db: AsyncSession,
    context,
    company_name: str,
    website_url: str,
    industry: str | None,
    target_audience: str | None,
    limit_per_seed: int,
    seed_keywords: list[str] | None = None,
) -> dict:
    scan = await scan_website(website_url)

    # Merge user-provided seed keywords with auto-extracted topics
    combined_seeds_raw = _merge_seed_topics(seed_keywords, scan["seed_topics"])
    combined_seeds = [s["topic"] for s in combined_seeds_raw]

    scan_run = WebsiteScanRun(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        project_id=context.project_id,
        website_url=scan["normalized_url"],
        status="completed",
        pages_discovered=len(scan["pages"]),
        pages_scanned=len(scan["pages"]),
        seed_topics=combined_seeds,
        errors=scan["errors"],
        completed_at=datetime.now(timezone.utc),
    )
    db.add(scan_run)
    await db.flush()

    for page in scan["pages"]:
        db.add(WebsitePage(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            scan_run_id=scan_run.id,
            url=page["url"],
            page_type=page.get("page_type"),
            title=page.get("title"),
            meta_description=page.get("meta_description"),
            h1=page.get("h1"),
            headings=page.get("headings"),
            body_excerpt=page.get("body_excerpt"),
            word_count=page.get("word_count"),
            is_indexable=page.get("is_indexable", True),
            crawl_status=page.get("crawl_status", "scanned"),
        ))

    opportunities = await build_keyword_opportunities(
        seed_topics=combined_seeds_raw,
        company_name=company_name,
        industry=industry,
        target_audience=target_audience,
        limit_per_seed=limit_per_seed,
        seed_keywords=seed_keywords,
    )

    source_page_url = scan["pages"][0]["url"] if scan["pages"] else scan["normalized_url"]
    for item in opportunities:
        db.add(KeywordOpportunity(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            source_run_id=scan_run.id,
            source_page_url=source_page_url,
            seed_topic=item["seed_topic"],
            keyword=item["keyword"],
            normalized_keyword=item["normalized_keyword"],
            intent=item["intent"],
            intent_score=item["intent_score"],
            search_volume=item["search_volume"],
            difficulty=item["difficulty"],
            relevance_score=item["relevance_score"],
            cluster_name=item["cluster_name"],
            selected=item["selected"],
            selection_notes=item["source_type"],
        ))

    await db.flush()
    return {
        "scan_run": scan_run,
        "pages": scan["pages"],
        "opportunities": opportunities,
        "primary_domain": scan["primary_domain"],
    }


@router.post("/start", response_model=APIResponse)
async def start_onboarding(
    body: OnboardingStartRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        normalized_domain = extract_domain(body.website_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    context = await get_project_context(request, body.project_id, current_user)
    scan_result = await _persist_scan_and_keywords(
        db=db,
        context=context,
        company_name=body.company_name,
        website_url=body.website_url,
        industry=body.industry,
        target_audience=body.target_audience,
        limit_per_seed=body.limit_per_seed,
        seed_keywords=body.seed_keywords,
    )

    brand = await update_brand_profile(
        request,
        context.brand_id,
        name=body.company_name,
        industry=body.industry,
        website_url=body.website_url,
        primary_domain=scan_result["primary_domain"] or normalized_domain,
        country=body.country,
    )
    project = await update_project_profile(
        request,
        context.project_id,
        target_audience=body.target_audience,
    )

    return APIResponse(data={
        "project": project,
        "profile": {
            "company_name": brand.get("name", body.company_name),
            "website_url": brand.get("website_url") or body.website_url,
            "primary_domain": brand.get("primary_domain") or scan_result["primary_domain"],
            "industry": brand.get("industry") or body.industry,
            "target_audience": project.get("target_audience") or body.target_audience,
            "country": brand.get("country") or body.country,
            "onboarding_status": "keywords_ready",
        },
        "scan": {
            "id": scan_result["scan_run"].id,
            "pages_scanned": scan_result["scan_run"].pages_scanned,
            "seed_topics": scan_result["scan_run"].seed_topics,
            "errors": scan_result["scan_run"].errors,
        },
        "keyword_summary": _keyword_summary(scan_result["opportunities"]),
    })


@router.post("/scan", response_model=APIResponse)
async def rerun_website_scan(
    body: WebsiteScanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        extract_domain(body.website_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    context = await get_project_context(request, body.project_id, current_user)
    company_name = context.brand.get("name") or context.project.get("name") or "Company"
    industry = context.brand.get("industry") or context.project.get("description")
    target_audience = context.project.get("target_audience")

    await db.execute(delete(KeywordOpportunity).where(*project_scope_filters(KeywordOpportunity, context)))
    await db.execute(delete(WebsitePage).where(*project_scope_filters(WebsitePage, context)))
    await db.execute(delete(WebsiteScanRun).where(*project_scope_filters(WebsiteScanRun, context)))

    scan_result = await _persist_scan_and_keywords(
        db=db,
        context=context,
        company_name=company_name,
        website_url=body.website_url,
        industry=industry,
        target_audience=target_audience,
        limit_per_seed=body.limit_per_seed,
    )

    await update_brand_profile(
        request,
        context.brand_id,
        website_url=body.website_url,
        primary_domain=scan_result["primary_domain"],
    )

    return APIResponse(data={
        "scan": {
            "id": scan_result["scan_run"].id,
            "pages_scanned": scan_result["scan_run"].pages_scanned,
            "seed_topics": scan_result["scan_run"].seed_topics,
            "errors": scan_result["scan_run"].errors,
        },
        "keyword_summary": _keyword_summary(scan_result["opportunities"]),
    })


@router.get("/{project_id}", response_model=APIResponse)
async def get_onboarding(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    scan = await db.scalar(
        select(WebsiteScanRun)
        .where(*project_scope_filters(WebsiteScanRun, context))
        .order_by(WebsiteScanRun.created_at.desc())
    )
    pages = (await db.execute(
        select(WebsitePage)
        .where(*project_scope_filters(WebsitePage, context))
        .order_by(WebsitePage.created_at.asc())
    )).scalars().all()
    opportunities = (await db.execute(
        select(KeywordOpportunity).where(*project_scope_filters(KeywordOpportunity, context))
    )).scalars().all()

    primary_domain = context.brand.get("primary_domain")
    if not primary_domain and scan and scan.website_url:
        try:
            primary_domain = extract_domain(scan.website_url)
        except ValueError:
            primary_domain = ""

    return APIResponse(data={
        "project": context.project,
        "profile": {
            "company_name": context.brand.get("name") or context.project.get("name"),
            "website_url": context.brand.get("website_url") or (scan.website_url if scan else ""),
            "primary_domain": primary_domain or "",
            "industry": context.brand.get("industry"),
            "target_audience": context.project.get("target_audience"),
            "country": context.brand.get("country"),
            "onboarding_status": "keywords_ready" if scan else "pending",
        },
        "scan": {
            "id": scan.id,
            "status": scan.status,
            "pages_scanned": scan.pages_scanned,
            "seed_topics": scan.seed_topics or [],
            "errors": scan.errors or [],
        } if scan else None,
        "pages": [
            {
                "id": page.id,
                "url": page.url,
                "title": page.title,
                "h1": page.h1,
                "page_type": page.page_type,
                "word_count": page.word_count,
                "crawl_status": page.crawl_status,
            }
            for page in pages
        ],
        "keyword_summary": _keyword_summary([
            {"intent": item.intent, "selected": item.selected} for item in opportunities
        ]),
    })


_PROFILE_SECTIONS = (
    "company", "audience", "products", "competitors", "geography",
    "keywords", "ai_geo", "digital_presence", "technical_seo",
)


def _serialize_profile(profile: OnboardingProfile | None, project_id: str) -> dict:
    if profile is None:
        return {
            "project_id": project_id,
            **{section: None for section in _PROFILE_SECTIONS},
            "completed_steps": [],
            "status": "in_progress",
        }
    return {
        "project_id": profile.project_id,
        "company": profile.company,
        "audience": profile.audience,
        "products": profile.products,
        "competitors": profile.competitors,
        "geography": profile.geography,
        "keywords": profile.keywords,
        "ai_geo": profile.ai_geo,
        "digital_presence": profile.digital_presence,
        "technical_seo": profile.technical_seo,
        "completed_steps": profile.completed_steps or [],
        "status": profile.status,
    }


@router.get("/{project_id}/profile", response_model=APIResponse)
async def get_onboarding_profile(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    profile = await db.scalar(
        select(OnboardingProfile).where(*project_scope_filters(OnboardingProfile, context))
    )
    return APIResponse(data=_serialize_profile(profile, project_id))


@router.put("/{project_id}/profile", response_model=APIResponse)
async def save_onboarding_profile(
    project_id: str,
    body: OnboardingProfileSave,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upsert the onboarding profile for a project.

    Provided sections replace the stored value; omitted sections are left
    untouched. Core identity fields found in the company/audience/geography
    sections are mirrored to the Auth Service (core.brands / core.projects).
    """
    context = await get_project_context(request, project_id, current_user)
    profile = await db.scalar(
        select(OnboardingProfile).where(*project_scope_filters(OnboardingProfile, context))
    )
    if profile is None:
        profile = OnboardingProfile(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
        )
        db.add(profile)

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(profile, field, value)

    await db.flush()

    # Mirror identity fields to the Auth Service so the rest of the platform
    # (brand switcher, scans, other orbits) sees consistent data.
    company = body.company or {}
    geography = body.geography or {}
    audience = body.audience or {}

    brand_country = company.get("country") or geography.get("primary_market")
    await update_brand_profile(
        request,
        context.brand_id,
        name=company.get("company_name"),
        industry=company.get("industry"),
        website_url=company.get("website_url"),
        country=brand_country,
    )
    await update_project_profile(
        request,
        context.project_id,
        target_audience=audience.get("summary") or audience.get("primary_audience_type"),
    )

    return APIResponse(data=_serialize_profile(profile, project_id))


def _keyword_summary(opportunities: list[dict]) -> dict:
    summary = {
        "total": len(opportunities),
        "selected": 0,
        "by_intent": {intent: 0 for intent in ["informational", "commercial", "transactional", "navigational"]},
    }
    for item in opportunities:
        intent = item.get("intent") or "informational"
        summary["by_intent"][intent] = summary["by_intent"].get(intent, 0) + 1
        if item.get("selected"):
            summary["selected"] += 1
    return summary
