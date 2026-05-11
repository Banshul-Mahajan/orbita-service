"""
Keyword Universe service.
- Fetches related keywords via SerpAPI
- Embeds each keyword with OpenAI text-embedding-3-small
- Clusters with KMeans (no extra deps beyond scikit-learn)
- Labels cluster intent heuristically
"""
import re
import json
import asyncio
from typing import List, Dict, Any, Optional

import httpx
import numpy as np
from openai import AsyncOpenAI
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize

from app.config import get_settings

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


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


# ── SerpAPI related keywords ──────────────────────────────────────────────────
async def fetch_related_keywords(seed: str, limit: int) -> List[Dict]:
    """
    Use SerpAPI Google autocomplete + related searches to get keyword candidates.
    """
    if not settings.serpapi_key:
        return []

    results = []
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Google Autocomplete suggestions
        try:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google_autocomplete",
                    "q": seed,
                    "api_key": settings.serpapi_key,
                },
            )
            data = resp.json()
            for s in data.get("suggestions", []):
                results.append({"keyword": s.get("value", ""), "volume": None, "difficulty": None})
        except Exception:
            pass

        # 2. Related searches from a SERP
        try:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google",
                    "q": seed,
                    "num": 10,
                    "api_key": settings.serpapi_key,
                },
            )
            data = resp.json()
            for rs in data.get("related_searches", []):
                results.append({"keyword": rs.get("query", ""), "volume": None, "difficulty": None})

            # Also grab PAA as keyword candidates
            for paa in data.get("people_also_ask", []):
                q = paa.get("question", "")
                if q:
                    results.append({"keyword": q, "volume": None, "difficulty": None})

            

            
        except Exception:
            pass

    # Deduplicate
    seen = set()
    unique = []
    for r in results:
        kw = r["keyword"].strip().lower()
        if kw and kw not in seen:
            seen.add(kw)
            unique.append(r)

    # Always include the seed
    seed_entry = {"keyword": seed, "volume": None, "difficulty": None}
    if seed.lower() not in seen:
        unique.insert(0, seed_entry)

    return unique[:limit]



async def fetch_related_keywords_test(seed: str, limit: int) -> List[Dict]:
    """
    Multi-source keywords fetcher. Scales API calls based on limit:
    limit < 30 -> autocomplete + 1 serp page
    limit < 60 -> above + serp page 2
    limit < 100 -> above + autocomplete on 4 variations
    limit > 100 -> above + deeper PAA expansion 
    """

    if not settings.serpapi_key:
        return []
    
    results = []

    async with httpx.AsyncClient(timeout=30) as client:

        try:
            resp = await client.get(
                "https://serpapi.com/search",
                params = {
                    "engine": "google_autocomplete",
                    "q": seed,
                    "api_key": settings.serpapi_key,
                }
            )

            for s in resp.json().get("suggestion", []):
                kw = s.get("value", "")

                if kw:
                    results.append({"keyword": kw, "volume" : None, "difficulty": None})

        except Exception:
            pass


        # Source 2: Main serp - related searches + PAA (always)

        paa_questions = [] #saving these for deep expansion later
        try:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google",
                    "q": seed,
                    "num": 10,
                    "api_key": settings.serpapi_key,
                }
            )

            data = resp.json()

            for rs in data.get("related_searches", []):
                kw = rs.get("query", "")
                if kw:
                    results.append({"keyword": kw, "volume" : None, "difficulty": None})
            for paa in data.get("people_also_ask", []):
                q = paa.get("question", "")
                if q:
                    results.append({"keyword": q, "volume" : None, "difficulty": None})
                    paa_questions.append(q)
        
        except Exception:
            pass


        if limit > 30:
            try:
                resp = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "engine":"google",
                        "q": seed,
                        "num": 10,
                        "start": 10,
                        "api_key": settings.serpapi_key
                    }
                )

                data = resp.json()
                for rs in data.get("related_searches", []):
                    kw = rs.get("query", "")
                    if kw:
                        results.append({"keyword": kw, "volume": None, "difficulty": None})
                for paa in data.get("people_also_ask", []):
                    q = paa.get("question", "")
                    if q:
                        results.append({"keyword": q, "volume": None, "difficulty": None})
            except Exception:
                pass

        if limit > 60:
            # Build modifier list from the seed topic
            # These are universal modifiers that work for any topic
            modifiers = ["2024", "salary", "exam", "online", "eligibility", "vacancy"]
            variation_seeds = [f"{seed} {m}" for m in modifiers[:4]]

            for var in variation_seeds:
                try:
                    resp = await client.get(
                        "https://serpapi.com/search",
                        params={
                            "engine": "google_autocomplete",
                            "q": var,
                            "api_key": settings.serpapi_key,
                        },
                    )
                    for s in resp.json().get("suggestions", []):
                        kw = s.get("value", "")
                        if kw:
                            results.append({"keyword": kw, "volume": None, "difficulty": None})
                except Exception:
                    pass

        # ── Source 5: PAA expansion — run SERP on each PAA question
        #    (only when limit > 100) ────────────────────────────────────
        if limit > 100 and paa_questions:
            for paa_q in paa_questions[:3]:   # max 3 PAA expansions
                try:
                    resp = await client.get(
                        "https://serpapi.com/search",
                        params={
                            "engine": "google",
                            "q": paa_q,
                            "num": 5,
                            "api_key": settings.serpapi_key,
                        },
                    )
                    data = resp.json()
                    for rs in data.get("related_searches", []):
                        kw = rs.get("query", "")
                        if kw:
                            results.append({"keyword": kw, "volume": None, "difficulty": None})
                    for paa in data.get("people_also_ask", []):
                        q = paa.get("question", "")
                        if q:
                            results.append({"keyword": q, "volume": None, "difficulty": None})
                except Exception:
                    pass


    seen = set()
    unique = []


    # always include seed itself first

    unique.append({"keyword": seed, "volume": None, "difficulty": None})
    seen.add(seed.strip().lower())

    for r in results:
        kw = r["keyword"].strip().lower()
        if kw and kw not in seen:
            seen.add(kw)
            unique.append(r)

    

    return unique[:limit]
# ── Embedding ─────────────────────────────────────────────────────────────────
async def embed_keywords(keywords: List[str]) -> np.ndarray:
    """Embed a list of keywords using OpenAI in batches of 100."""
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for keyword embeddings")

    all_embeddings = []
    batch_size = 100
    for i in range(0, len(keywords), batch_size):
        batch = keywords[i : i + batch_size]
        resp = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=batch,
        )
        for item in resp.data:
            all_embeddings.append(item.embedding)

    return np.array(all_embeddings, dtype=np.float32)


# ── Clustering ────────────────────────────────────────────────────────────────
def cluster_keywords(embeddings: np.ndarray, n_clusters: int) -> np.ndarray:
    """KMeans clustering on normalised embeddings."""
    normed = normalize(embeddings)
    n = min(n_clusters, len(embeddings))
    km = KMeans(n_clusters=n, random_state=42, n_init=10)
    labels = km.fit_predict(normed)
    return labels


# ── Main entry point ──────────────────────────────────────────────────────────
async def expand_keywords(seed: str, limit: int) -> Dict[str, Any]:
    """
    Full pipeline: fetch → embed → cluster → label → return structured data.
    """
    kw_data = await fetch_related_keywords(seed, limit)
    keywords = [k["keyword"] for k in kw_data]

    if not keywords:
        return {
            "seed_keyword": seed,
            "total_keywords": 0,
            "clusters": [],
        }

    if len(keywords) < 3:
        # Not enough to cluster
        return {
            "seed_keyword": seed,
            "total_keywords": len(keywords),
            "clusters": [
                {
                    "cluster_id": 0,
                    "cluster_name": seed,
                    "intent": classify_intent(seed),
                    "keywords": [
                        {"keyword": k["keyword"], "intent": classify_intent(k["keyword"]),
                         "volume": k.get("volume"), "difficulty": k.get("difficulty")}
                        for k in kw_data
                    ],
                }
            ],
        }

    embeddings = await embed_keywords(keywords)

    # Decide number of clusters: sqrt heuristic, capped at 8
    n_clusters = min(8, max(2, int(len(keywords) ** 0.5)))
    labels = cluster_keywords(embeddings, n_clusters)

    # Build cluster groups
    cluster_map: Dict[int, List[Dict]] = {}
    for idx, label in enumerate(labels):
        cluster_map.setdefault(int(label), []).append(kw_data[idx])

    clusters = []
    for cid, items in sorted(cluster_map.items()):
        kws = [k["keyword"] for k in items]
        name = pick_cluster_name(kws)
        # Majority intent in cluster
        intents = [classify_intent(k) for k in kws]
        dominant_intent = max(set(intents), key=intents.count)

        clusters.append({
            "cluster_id": cid,
            "cluster_name": name,
            "intent": dominant_intent,
            "keywords": [
                {
                    "keyword": item["keyword"],
                    "intent": classify_intent(item["keyword"]),
                    "volume": item.get("volume"),
                    "difficulty": item.get("difficulty"),
                }
                for item in items
            ],
        })

    return {
        "seed_keyword": seed,
        "total_keywords": len(keywords),
        "clusters": clusters,
    }
