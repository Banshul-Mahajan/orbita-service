"""
ORBITA Create Orbit — Optimize Orbit Client

HTTP client for calling Optimize Orbit's analysis endpoint
to score articles for SEO, GEO, E-E-A-T, and schema.
"""

import httpx
import logging
from typing import Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

OPTIMIZE_URL = settings.OPTIMIZE_ORBIT_URL


async def analyze_content(
    content: str,
    target_keyword: str = "",
    content_type: str = "article",
    author_name: str = "",
    organization_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    project_id: Optional[str] = None,
    article_id: Optional[str] = None,
    user_token: Optional[str] = None,
) -> Dict:
    """
    Call Optimize Orbit to score content.

    Returns the full optimization result including:
        - overall_score
        - sub-scores (seo, geo, eeat, schema)
        - issues list
        - generated schema JSON-LD
        - run_id (if Optimize persists the result)
    """
    try:
        payload = {
            "content": content,
            "target_keyword": target_keyword,
            "content_type": content_type,
            "author_name": author_name,
        }

        # Add optional platform IDs
        if organization_id:
            payload["organization_id"] = organization_id
        if brand_id:
            payload["brand_id"] = brand_id
        if project_id:
            payload["project_id"] = project_id
        if article_id:
            payload["article_id"] = article_id

        headers = {"Content-Type": "application/json"}
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OPTIMIZE_URL}/api/analyze",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Optimize Orbit HTTP error: {e.response.status_code}")
        return {"error": f"Optimize returned {e.response.status_code}", "overall_score": 0}
    except Exception as e:
        logger.error(f"Optimize Orbit call failed: {e}")
        return {"error": str(e), "overall_score": 0}
