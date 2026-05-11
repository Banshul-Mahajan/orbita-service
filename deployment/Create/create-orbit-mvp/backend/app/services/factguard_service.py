"""
FactGuard Service
1. Extract all factual claims from article text
2. For each claim, check the shared Knowledge Core first, then the brand corpus
3. Classify: verified (found in corpus) | flagged (contradicts corpus) | unverified (not found)
4. Return structured results
"""
from typing import List, Dict
from app.services.llm_service import call_llm_json
from app.services.rag_service import retrieve_context
from app.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)


def extract_claims(article_body: str) -> List[str]:
    """
    Extract all verifiable factual claims from article text.
    Returns list of claim strings.
    """
    prompt = f"""Extract all verifiable factual claims from this article text.

A factual claim is a specific, verifiable statement about:
- Statistics or numbers
- Dates or time periods  
- Named entities (people, companies, products, places)
- Scientific or technical facts
- Cause-and-effect relationships
- Comparisons or rankings

Do NOT include:
- Opinions or recommendations
- General knowledge universally agreed upon (e.g., "water is wet")
- Vague or subjective statements

Article text:
---
{article_body[:4000]}
---

Return JSON:
{{
  "claims": [
    "Claim 1 as a standalone sentence",
    "Claim 2 as a standalone sentence"
  ]
}}

Extract up to 15 most important claims. Return fewer if appropriate.
"""
    result = call_llm_json(prompt)
    return result.get("claims", [])


def verify_claim_against_corpus(
    claim: str,
    brand_id: str,
) -> Dict:
    """
    Verify a single claim against the brand corpus.
    Returns: {status, confidence, source_context, reasoning}
    """
    # Find relevant corpus chunks for this claim
    chunks = retrieve_context(brand_id, claim, top_k=3)

    if not chunks or all(c["relevance_score"] < 0.35 for c in chunks):
        # No relevant context found — unverified
        return {
            "status": "unverified",
            "confidence": 0.0,
            "source_context": None,
            "reasoning": "No relevant information found in the brand corpus to verify this claim.",
        }

    # Use the best matching chunks as context
    best_chunks = [c for c in chunks if c["relevance_score"] >= 0.35]
    context_text = "\n\n".join([
        f"[{c['source_title']}]: {c['chunk']}"
        for c in best_chunks[:3]
    ])

    # Ask LLM to verify the claim against the context
    prompt = f"""You are a fact-checker. Verify the following claim against the provided source context.

CLAIM TO VERIFY:
"{claim}"

SOURCE CONTEXT FROM BRAND KNOWLEDGE BASE:
{context_text}

Analyze whether the source context supports, contradicts, or is silent on this claim.

Return JSON:
{{
  "status": "verified" | "flagged" | "unverified",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your verdict (1-2 sentences)"
}}

Status definitions:
- "verified": The source context clearly supports this claim
- "flagged": The source context contradicts or significantly differs from this claim  
- "unverified": The source context is related but doesn't clearly confirm or deny this claim
"""

    result = call_llm_json(
        prompt,
        system="You are a precise fact-checker. Return only the JSON verdict with no additional text.",
    )

    return {
        "status": result.get("status", "unverified"),
        "confidence": float(result.get("confidence", 0.5)),
        "source_context": context_text[:500],  # store first 500 chars
        "reasoning": result.get("reasoning", ""),
    }


def verify_claim_against_knowledge_core(claim: str, brand_id: str) -> Dict:
    if not brand_id:
        return {
            "status": "unverified",
            "confidence": 0.0,
            "source_context": None,
            "reasoning": "No brand selected, so Knowledge Core could not be queried.",
            "knowledge_core_fact_id": None,
        }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{settings.KNOWLEDGE_CORE_URL}/api/factguard/verify",
                json={"claim": claim, "brand_id": brand_id},
            )
            response.raise_for_status()
            result = response.json()
    except Exception as exc:
        logger.warning(f"Knowledge Core verification failed: {exc}")
        return {
            "status": "unverified",
            "confidence": 0.0,
            "source_context": None,
            "reasoning": "Knowledge Core verification was unavailable.",
            "knowledge_core_fact_id": None,
        }

    matches = result.get("matches", [])
    best_match = matches[0] if matches else {}

    mapped_status = {
        "verified": "verified",
        "low_confidence": "unverified",
        "unverified": "unverified",
    }.get(result.get("status", "unverified"), "unverified")

    return {
        "status": mapped_status,
        "confidence": float(result.get("confidence", 0.0)),
        "source_context": (
            f"{best_match.get('entity_name', 'Knowledge Core')}: {best_match.get('value', '')}"
            if best_match else None
        ),
        "reasoning": (
            "Verified against Knowledge Core."
            if result.get("status") == "verified"
            else "Knowledge Core did not have a strong enough match to verify this claim."
        ),
        "knowledge_core_fact_id": best_match.get("id"),
    }


def run_factguard(article_body: str, brand_id: str) -> Dict:
    """
    Full FactGuard pipeline for an article.
    Returns complete verification results.
    """
    logger.info(f"Running FactGuard for brand {brand_id}")

    # Step 1: Extract claims
    claims = extract_claims(article_body)
    logger.info(f"Extracted {len(claims)} claims")

    if not claims:
        return {
            "claims": [],
            "summary": {
                "total": 0,
                "verified": 0,
                "flagged": 0,
                "unverified": 0,
                "overall_status": "passed",
            },
        }

    # Step 2: Verify each claim
    verified_claims = []
    counts = {"verified": 0, "flagged": 0, "unverified": 0}

    for claim_text in claims:
        try:
            knowledge_core_result = verify_claim_against_knowledge_core(claim_text, brand_id)
            if knowledge_core_result["status"] == "verified":
                result = knowledge_core_result
            else:
                result = verify_claim_against_corpus(claim_text, brand_id)
                if knowledge_core_result.get("confidence", 0.0) > result.get("confidence", 0.0):
                    result = knowledge_core_result
            counts[result["status"]] = counts.get(result["status"], 0) + 1
            verified_claims.append({
                "text": claim_text,
                **result,
            })
        except Exception as e:
            logger.error(f"Claim verification failed: {e}")
            counts["unverified"] += 1
            verified_claims.append({
                "text": claim_text,
                "status": "unverified",
                "confidence": 0.0,
                "source_context": None,
                "reasoning": f"Verification error: {str(e)}",
            })

    # Step 3: Determine overall status
    if counts["flagged"] > 0:
        overall_status = "flagged"
    elif counts["unverified"] > len(claims) * 0.5:
        overall_status = "flagged"  # more than half unverified = flag
    else:
        overall_status = "passed"

    return {
        "claims": verified_claims,
        "summary": {
            "total": len(claims),
            "verified": counts["verified"],
            "flagged": counts["flagged"],
            "unverified": counts["unverified"],
            "overall_status": overall_status,
        },
    }
