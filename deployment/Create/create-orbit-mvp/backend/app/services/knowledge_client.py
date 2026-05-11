"""
ORBITA Create Orbit — Knowledge Core Client

HTTP client for calling Knowledge Core's FactGuard API
to verify claims against the shared knowledge base.
"""

import httpx
import logging
from typing import Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

KNOWLEDGE_CORE_URL = settings.KNOWLEDGE_CORE_URL


async def verify_claim_via_knowledge_core(
    claim: str,
    brand_id: str,
    user_token: Optional[str] = None,
) -> Dict:
    """
    Call Knowledge Core's FactGuard endpoint to verify a claim
    against the shared brand knowledge base.

    Returns:
        {
            "claim": str,
            "status": "verified" | "unverified" | "low_confidence",
            "matches": [...],
            "confidence": float,
            "match_count": int,
        }
    """
    try:
        headers = {"Content-Type": "application/json"}
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{KNOWLEDGE_CORE_URL}/api/factguard/verify",
                json={"claim": claim, "brand_id": brand_id},
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Knowledge Core FactGuard HTTP error: {e.response.status_code}")
        return {
            "claim": claim,
            "status": "unverified",
            "matches": [],
            "confidence": 0.0,
            "match_count": 0,
            "error": f"Knowledge Core returned {e.response.status_code}",
        }
    except Exception as e:
        logger.error(f"Knowledge Core FactGuard call failed: {e}")
        return {
            "claim": claim,
            "status": "unverified",
            "matches": [],
            "confidence": 0.0,
            "match_count": 0,
            "error": str(e),
        }
