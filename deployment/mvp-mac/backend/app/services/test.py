import re
import json
import asyncio
from typing import List, Dict, Any, Optional

import httpx
import numpy as np
from openai import AsyncOpenAI
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize

# from app.config import get_settings


# settings = get_settings()
# openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

# ── Intent heuristics ─────────────────────────────────────────────────────────
INTENT_SIGNALS = {
    "transactional": ["buy", "price", "cost", "purchase", "deal", "discount", "cheap",
                      "order", "shop", "sale", "coupon", "hire", "get", "download"],
    "commercial":    ["best", "top", "review", "vs", "versus", "compare", "comparison",
                      "alternative", "pros", "cons", "recommend", "worth"],
    "navigational":  ["login", "sign in", "website", "official", "account", "portal",
                      "app", "dashboard", "contact", "support"],
    "informational": ["how", "what", "why", "when", "who", "guide", "tutorial", "learn",
                      "explain", "definition", "example", "tips", "ways"],
}


def classify_intent(keyword: str) -> str:
    kw = keyword.lower()
    for intent, signals in INTENT_SIGNALS.items():
        if any(s in kw for s in signals):
            return intent
    return "informational"  # default


def pick_cluster_name(keywords: List[str]) -> str:
    """Return the shortest keyword as the cluster label."""
    return min(keywords, key=len)



async def fetch_related_keywords(seed: str, limit: int) -> List[Dict]:
    """
    Use SerpAPI Google autocomplete + related searches to get keyword candidates.
    Falls back to simple variations if API key is missing.
    """


    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Google Autocomplete suggestions
        
        resp = await client.get(
            "https://serpapi.com/search",
            params={
                "engine": "google",
                "q": seed,
                "api_key": 'e187e8a102727aca3b00617238a21de4d32f5664f7a579fd5e6d641f0ab045f6',
            },
        )
        data = resp.json()

        print(data)



async def test():

    result = await fetch_related_keywords('goverment job in india', 20)
    return result
    print("Completed")


asyncio.run(test())