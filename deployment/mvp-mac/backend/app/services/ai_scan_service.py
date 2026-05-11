"""
AI Answer Scanner service.
- Queries OpenAI GPT-4o (real)
- Mocks Gemini and Perplexity responses (no extra API keys needed for MVP)
- Parses URLs cited in each response
- Returns structured comparison data
"""
import re
import asyncio
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

from openai import AsyncOpenAI

from app.config import get_settings

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """You are a helpful research assistant. When answering questions:
1. Provide a comprehensive answer
2. Cite your sources by including URLs in format [source: https://example.com]
3. Be factual and specific
Keep your answer under 700 words."""


# ── URL extraction ────────────────────────────────────────────────────────────
def extract_urls(text: str) -> List[str]:
    """Pull all URLs from a text string."""
    pattern = r'https?://[^\s\]\)\'\",>]+'
    urls = re.findall(pattern, text)
    # Clean trailing punctuation
    cleaned = [u.rstrip('.,;:!)>') for u in urls]
    return list(dict.fromkeys(cleaned))  # deduplicate preserving order


def urls_to_domains(urls: List[str]) -> List[str]:
    domains = []
    seen = set()
    for url in urls:
        try:
            d = urlparse(url).netloc.replace("www.", "")
            if d and d not in seen:
                seen.add(d)
                domains.append(d)
        except Exception:
            pass
    return domains


# ── Engine clients ────────────────────────────────────────────────────────────
async def query_openai(query: str) -> Dict[str, Any]:
    if not settings.openai_api_key:
        return {}
    try:
        resp = await openai_client.chat.completions.create(
            model="gpt-4o",   # cheaper; swap to gpt-4o for production
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query},
            ],
            max_tokens=1200,
            temperature=0.3,
        )
        answer = resp.choices[0].message.content or ""
        urls = extract_urls(answer)
        return {
            "engine": "openai",
            "answer_text": answer,
            "cited_urls": urls,
            "cited_domains": urls_to_domains(urls),
            "answer_length": len(answer.split()),
        }
    except Exception as e:
        return {"engine": "openai", "answer_text": f"[Error: {str(e)}]",
                "cited_urls": [], "cited_domains": [], "answer_length": 0}


async def query_gemini(query: str) -> Dict[str, Any]:
    """
    Gemini is not wired in this MVP build yet.
    """
    return {}


async def query_perplexity(query: str) -> Dict[str, Any]:
    """
    Perplexity is not wired in this MVP build yet.
    """
    return {}


# ── Main entry point ──────────────────────────────────────────────────────────
ENGINE_MAP = {
    "openai": query_openai,
    "gemini": query_gemini,
    "perplexity": query_perplexity,
}


async def scan_ai_engines(query: str, engines: List[str]) -> List[Dict[str, Any]]:
    """Fan out to all requested engines in parallel."""
    valid_engines = [e for e in engines if e in ENGINE_MAP]
    tasks = [ENGINE_MAP[e](query) for e in valid_engines]
    results = await asyncio.gather(*tasks)
    return [result for result in results if result]
