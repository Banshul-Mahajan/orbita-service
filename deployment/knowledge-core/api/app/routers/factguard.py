from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from ..core.platform import CurrentUser, get_brand_context, get_current_user
from ..database import get_db
from ..models.fact import Fact
from ..models.entity import Entity
from ..services.embedding import search_facts_semantic

router = APIRouter(prefix="/factguard", tags=["factguard"])


@router.post("/verify")
async def verify_claim(
    claim_data: dict,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a claim text → get back matching facts + confidence score.

    MVP: keyword-based matching against PostgreSQL.
    Phase 2 (Day 7): replace with Weaviate semantic similarity search.

    Response shape is the same in both phases so the UI doesn't need to change.
    """
    claim_text = claim_data.get("claim", "").strip()
    context = await get_brand_context(
        request,
        current_user,
        claim_data.get("brand_id"),
        require_brand=False,
    )

    if not claim_text:
        return {"claim": "", "status": "error", "matches": [], "confidence": 0.0, "match_count": 0}
    if not context:
        return {"claim": claim_text, "status": "unverified", "matches": [], "confidence": 0.0, "match_count": 0}

    try:
        semantic_matches = await search_facts_semantic(claim_text, context.brand_id, limit=5)
    except Exception:
        semantic_matches = []

    if semantic_matches:
        avg_confidence = (
            sum(float(match.get("confidence") or 0.0) for match in semantic_matches) / len(semantic_matches)
        )
        if avg_confidence >= 0.85:
            status = "verified"
        elif avg_confidence >= 0.5:
            status = "low_confidence"
        else:
            status = "unverified"

        return {
            "claim": claim_text,
            "status": status,
            "matches": semantic_matches,
            "confidence": round(avg_confidence, 2),
            "match_count": len(semantic_matches),
        }

    # Extract meaningful words (skip short stop words)
    stop_words = {"the", "is", "are", "was", "has", "have", "and", "for", "with", "that", "this", "from"}
    words = [w.lower().strip(".,!?\"'") for w in claim_text.split() if len(w) > 3 and w.lower() not in stop_words]

    if not words:
        return {"claim": claim_text, "status": "unverified", "matches": [], "confidence": 0.0, "match_count": 0}

    # Search entities whose name matches any meaningful word
    entity_conditions = [Entity.name.ilike(f"%{w}%") for w in words[:6]]
    value_conditions = [Fact.value.ilike(f"%{w}%") for w in words[:6]]
    attr_conditions = [Fact.attribute.ilike(f"%{w}%") for w in words[:6]]

    query = (
        select(Fact, Entity.name.label("entity_name"))
        .join(Entity)
        .where(
            Fact.brand_id == context.brand_id,
            or_(*(entity_conditions + value_conditions + attr_conditions)),
        )
        .limit(5)
    )

    result = await db.execute(query)
    rows = result.all()

    matches = [
        {
            "entity_name": row.entity_name,
            "attribute": row.Fact.attribute,
            "value": row.Fact.value,
            "unit": row.Fact.unit,
            "confidence": row.Fact.confidence,
            "is_verified": row.Fact.is_verified,
            "source_url": row.Fact.source_url,
        }
        for row in rows
    ]

    avg_confidence = (
        sum(row.Fact.confidence for row in rows) / len(rows) if rows else 0.0
    )

    if avg_confidence >= 0.85:
        status = "verified"
    elif avg_confidence >= 0.5:
        status = "low_confidence"
    else:
        status = "unverified"

    return {
        "claim": claim_text,
        "status": status,
        "matches": matches,
        "confidence": round(avg_confidence, 2),
        "match_count": len(matches),
    }
