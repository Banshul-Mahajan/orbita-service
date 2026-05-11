from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Article, Claim, ClaimStatus
from app.schemas import FactGuardResult, ClaimOut
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_platform_context
from app.services.factguard_service import run_factguard

router = APIRouter(prefix="/factguard", tags=["factguard"])


@router.post("/check/{article_id}", response_model=FactGuardResult)
def check_article(
    article_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Run FactGuard on an article.
    Extracts claims, verifies against corpus, saves results.
    """
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")

    if not article.body or len(article.body.strip()) < 100:
        raise HTTPException(400, "Article body is too short to fact-check (min 100 chars)")

    # Delete old claims for this article
    db.query(Claim).filter(Claim.article_id == article_id).delete()
    db.commit()

    # Run FactGuard pipeline
    result = run_factguard(article.body, article.brand_id)

    # Persist claims to DB
    db_claims = []
    for claim_data in result["claims"]:
        status_map = {
            "verified": ClaimStatus.verified,
            "flagged": ClaimStatus.flagged,
            "unverified": ClaimStatus.unverified,
        }
        claim = Claim(
            article_id=article_id,
            text=claim_data["text"],
            status=status_map.get(claim_data["status"], ClaimStatus.unverified),
            confidence=claim_data.get("confidence", 0.0),
            source_context=claim_data.get("source_context"),
            reasoning=claim_data.get("reasoning"),
            knowledge_core_fact_id=claim_data.get("knowledge_core_fact_id"),
        )
        db.add(claim)
        db_claims.append(claim)

    # Update article factguard_status
    article.factguard_status = result["summary"]["overall_status"]
    db.commit()

    for c in db_claims:
        db.refresh(c)

    summary = result["summary"]
    return FactGuardResult(
        article_id=article_id,
        total_claims=summary["total"],
        verified=summary["verified"],
        flagged=summary["flagged"],
        unverified=summary["unverified"],
        claims=[ClaimOut.model_validate(c) for c in db_claims],
        overall_status=summary["overall_status"],
    )


@router.get("/claims/{article_id}")
def get_claims(
    article_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get all saved claims for an article."""
    context = get_platform_context(request, current_user)
    article = _scoped_article_query(db, context).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(404, "Article not found")

    claims = db.query(Claim).filter(Claim.article_id == article_id).all()
    return {
        "article_id": article_id,
        "factguard_status": article.factguard_status,
        "claims": [ClaimOut.model_validate(c) for c in claims],
    }


@router.put("/claims/{claim_id}/override")
def override_claim(
    claim_id: str,
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Human override: accept a flagged claim."""
    context = get_platform_context(request, current_user)
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(404, "Claim not found")

    # Verify the article belongs to the user
    article = _scoped_article_query(db, context).filter(Article.id == claim.article_id).first()
    if not article:
        raise HTTPException(403, "Forbidden")

    new_status = payload.get("status", "accepted")
    claim.status = ClaimStatus(new_status)
    db.commit()
    db.refresh(claim)
    return ClaimOut.model_validate(claim)


def _scoped_article_query(db: Session, context):
    query = db.query(Article).filter(
        Article.organization_id == context.organization_id,
        Article.brand_id == context.brand_id,
    )
    if context.project_id:
        query = query.filter(
            or_(Article.project_id == context.project_id, Article.project_id.is_(None))
        )
    return query
