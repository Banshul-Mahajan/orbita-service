from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Alert, ProbePrompt, ProbeRun
from app.schemas import (
    BrandCreate, BrandOut, FactCreate, FactOut,
    GeneratePromptsRequest, ProbePromptCreate, ProbePromptOut,
)
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import (
    auth_service_json,
    discover_service_json,
    get_brand_or_404,
    get_request_project_id,
    knowledge_core_json,
    serialize_brand,
    serialize_fact,
)
from app.services.probe_engine import get_preset_prompts
from app.services.prompt_generator import generate_prompts

router = APIRouter(prefix="/brands", tags=["brands"])

# ─── Brands ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[BrandOut])
def list_brands(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    brands = auth_service_json(request, "/api/brands")
    return [serialize_brand(brand) for brand in brands]


@router.post("", response_model=BrandOut)
def create_brand(
    payload: BrandCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    brand = auth_service_json(
        request,
        "/api/brands",
        method="POST",
        json={
            "name": payload.name,
            "industry": payload.industry,
            "description": payload.description,
            "website_url": payload.website,
        },
    )

    # Seed preset probe prompts
    for preset in get_preset_prompts(payload.name):
        prompt = ProbePrompt(
            organization_id=current_user.org_id,
            brand_id=brand["id"],
            prompt_text=preset["prompt_text"],
            category=preset["category"],
        )
        db.add(prompt)

    db.commit()
    return serialize_brand(brand)


@router.get("/{brand_id}", response_model=BrandOut)
def get_brand(
    brand_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    brand = get_brand_or_404(request, current_user, brand_id)
    return serialize_brand(brand)


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    auth_service_json(
        request,
        f"/api/brands/{brand_id}",
        method="DELETE",
        not_found_detail="Brand not found",
    )

    db.query(Alert).filter(
        Alert.organization_id == current_user.org_id,
        Alert.brand_id == brand_id,
    ).delete(synchronize_session=False)
    db.query(ProbeRun).filter(
        ProbeRun.organization_id == current_user.org_id,
        ProbeRun.brand_id == brand_id,
    ).delete(synchronize_session=False)
    db.query(ProbePrompt).filter(
        ProbePrompt.organization_id == current_user.org_id,
        ProbePrompt.brand_id == brand_id,
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True}


# ─── Knowledge Facts ───────────────────────────────────────────────────────────

@router.get("/{brand_id}/facts", response_model=List[FactOut])
def list_facts(
    brand_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    facts = knowledge_core_json(
        request,
        "/api/facts",
        params={"brand_id": brand_id},
    )
    return [serialize_fact(fact, brand_id) for fact in facts]


@router.post("/{brand_id}/facts", response_model=FactOut)
def create_fact(
    brand_id: str,
    payload: FactCreate,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    fact = knowledge_core_json(
        request,
        "/api/facts",
        method="POST",
        json={
            "brand_id": brand_id,
            "category": payload.category,
            "claim": payload.claim,
            "source_url": payload.source_url,
            "is_verified": True,
            "confidence": 0.95,
        },
    )
    return serialize_fact(fact, brand_id)


@router.delete("/{brand_id}/facts/{fact_id}")
def delete_fact(
    brand_id: str,
    fact_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    knowledge_core_json(
        request,
        f"/api/facts/{fact_id}",
        method="DELETE",
        not_found_detail="Fact not found",
    )
    return {"ok": True}


# ─── Probe Prompts ─────────────────────────────────────────────────────────────

@router.get("/{brand_id}/prompts", response_model=List[ProbePromptOut])
def list_prompts(
    brand_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    return db.query(ProbePrompt).filter(
        ProbePrompt.organization_id == current_user.org_id,
        ProbePrompt.brand_id == brand_id,
        ProbePrompt.is_active == True,
    ).order_by(ProbePrompt.created_at).all()


@router.post("/{brand_id}/prompts", response_model=ProbePromptOut)
def create_prompt(
    brand_id: str,
    payload: ProbePromptCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    prompt = ProbePrompt(
        organization_id=current_user.org_id,
        brand_id=brand_id,
        **payload.model_dump(),
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.post("/{brand_id}/prompts/generate", response_model=List[ProbePromptOut])
def generate_brand_prompts(
    brand_id: str,
    payload: GeneratePromptsRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Generate a categorized prompt set (branded + unbranded category/comparison
    + seed-keyword prompts) and persist any that don't already exist.

    Seed keywords, competitors and industry are pulled from the active project's
    onboarding profile in Discover unless seed_keywords are supplied in the body.
    Returns the full active prompt list so the UI can refresh in one call.
    """
    brand = get_brand_or_404(request, current_user, brand_id)
    industry = brand.get("industry")
    seeds = list(payload.seed_keywords or [])
    competitors: list[str] = []

    project_id = payload.project_id or get_request_project_id(request)
    if project_id and not seeds:
        # Best-effort pull from Discover onboarding profile; never hard-fail here.
        try:
            resp = discover_service_json(
                request,
                f"/api/v1/onboarding/{project_id}/profile",
                not_found_detail="",
            )
            data = resp.get("data") if isinstance(resp, dict) else None
            if data:
                seeds = (data.get("keywords") or {}).get("seed_keywords") or []
                competitors = [
                    c.get("name") for c in (data.get("competitors") or [])
                    if isinstance(c, dict) and c.get("name")
                ]
                if not industry:
                    industry = (data.get("company") or {}).get("industry")
        except HTTPException:
            pass  # Discover unavailable / no profile — fall back to brand-only prompts

    generated = generate_prompts(
        brand_name=brand["name"],
        industry=industry,
        seed_keywords=seeds,
        competitors=competitors,
    )

    existing = {
        (p.prompt_text or "").strip().lower()
        for p in db.query(ProbePrompt).filter(
            ProbePrompt.organization_id == current_user.org_id,
            ProbePrompt.brand_id == brand_id,
            ProbePrompt.is_active == True,
        ).all()
    }

    for g in generated:
        if g["prompt_text"].strip().lower() in existing:
            continue
        db.add(ProbePrompt(
            organization_id=current_user.org_id,
            brand_id=brand_id,
            project_id=project_id,
            prompt_text=g["prompt_text"],
            category=g["category"],
        ))
    db.commit()

    return db.query(ProbePrompt).filter(
        ProbePrompt.organization_id == current_user.org_id,
        ProbePrompt.brand_id == brand_id,
        ProbePrompt.is_active == True,
    ).order_by(ProbePrompt.created_at).all()


@router.delete("/{brand_id}/prompts/{prompt_id}")
def delete_prompt(
    brand_id: str,
    prompt_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    prompt = db.query(ProbePrompt).filter(
        ProbePrompt.id == prompt_id,
        ProbePrompt.organization_id == current_user.org_id,
        ProbePrompt.brand_id == brand_id,
    ).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.is_active = False
    db.commit()
    return {"ok": True}
