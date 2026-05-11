"""
SERP Analyzer service.
- Fetches top-N Google results via SerpAPI
- Optionally scrapes each URL for headings + entity hints
- Computes basic readability proxy
"""
import re
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings

settings = get_settings()


# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


def rough_readability(text: str) -> float:
    """
    Simplified Flesch Reading Ease proxy.
    Real Flesch needs syllable counting; this approximates via avg word length.
    Score 0-100: higher = easier.
    """
    words = text.split()
    if not words:
        return 50.0
    avg_word_len = sum(len(w) for w in words) / len(words)
    # Shorter words → easier reading
    score = max(0.0, min(100.0, 120.0 - (avg_word_len * 10)))
    return round(score, 1)


def extract_entities_simple(text: str) -> List[str]:
    """
    Lightweight entity extraction without spaCy.
    Finds capitalized multi-word phrases (proper noun heuristic).
    """
    # Match sequences of capitalized words (2-4 words)
    pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
    candidates = re.findall(pattern, text)
    # Deduplicate preserving order
    seen = set()
    entities = []
    for c in candidates:
        if c not in seen and len(c) > 3:
            seen.add(c)
            entities.append(c)
    return entities[:15]


async def scrape_url(url: str) -> Dict[str, Any]:
    """
    Scrape a URL and extract headings, word count, readability, entities.
    Returns empty dict on any failure (we don't want one bad URL to kill the batch).
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0 Safari/537.36"
        )
    }
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return {}
            html = resp.text
    except Exception:
        return {}

    soup = BeautifulSoup(html, "html.parser")

    # Remove script/style noise
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Headings
    headings = []
    for level in ["h1", "h2", "h3"]:
        for tag in soup.find_all(level)[:5]:
            text = tag.get_text(strip=True)
            if text:
                headings.append({"level": level, "text": text[:200]})

    # Body text
    body_text = soup.get_text(separator=" ", strip=True)
    words = body_text.split()
    word_count = len(words)
    sample_text = " ".join(words[:500])  # first 500 words for analysis

    return {
        "headings": headings[:12],
        "word_count": word_count,
        "readability": rough_readability(sample_text),
        "entities": extract_entities_simple(sample_text),
    }


# ── Main entry point ──────────────────────────────────────────────────────────
async def analyze_serp(query: str, num_results: int) -> List[Dict[str, Any]]:
    """
    Fetch SERP results and enrich each with scraped signals.
    """
    if not settings.serpapi_key:
        return []

    # Fetch SERP
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google",
                    "q": query,
                    "num": num_results,
                    "api_key": settings.serpapi_key,

                    "gl": "in",              # Country = India
                    "hl": "en",              # Language (optional but good)
                    "google_domain": "google.co.in",  # Strong India signal
                },
            )
        data = resp.json()
    except Exception:
        return []

    organic = data.get("organic_results", [])[:num_results]
    results = []

    # Scrape each URL (limit concurrency to 5 at a time)
    import asyncio
    sem = asyncio.Semaphore(5)

    async def enrich(item: Dict, position: int) -> Dict:
        async with sem:
            url = item.get("link", "")
            scraped = {}
            if url:
                scraped = await scrape_url(url)

            snippet = item.get("snippet", "")
            return {
                "position": position + 1,
                "title": item.get("title", ""),
                "url": url,
                "domain": extract_domain(url),
                "snippet": snippet,
                "headings": scraped.get("headings", []),
                "word_count": scraped.get("word_count", len(snippet.split())),
                "readability": scraped.get("readability", rough_readability(snippet)),
                "entities": scraped.get("entities", extract_entities_simple(snippet)),
            }

    tasks = [enrich(item, i) for i, item in enumerate(organic)]
    results = await asyncio.gather(*tasks)
    return list(results)
