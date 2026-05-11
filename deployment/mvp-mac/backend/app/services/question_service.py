"""
Question Miner service.
- Fetches People Also Ask from SerpAPI
- Generates AI-format questions via OpenAI
- Classifies each question by W-type (who/what/how/why/when/other)
- Deduplicates similar questions
"""
import re
from typing import List, Dict, Any

import httpx
from openai import AsyncOpenAI

from app.config import get_settings

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.openai_api_key)


def classify_q_type(question: str) -> str:
    q = question.lower().strip()
    if q.startswith("how"):
        return "how"
    if q.startswith("what"):
        return "what"
    if q.startswith("why"):
        return "why"
    if q.startswith("when"):
        return "when"
    if q.startswith("who"):
        return "who"
    if q.startswith("where"):
        return "where"
    if q.startswith("which") or q.startswith("is ") or q.startswith("can ") or q.startswith("does "):
        return "other"
    return "other"


async def fetch_paa_questions(topic: str) -> List[Dict]:
    """Fetch People Also Ask questions from SerpAPI."""
    if not settings.serpapi_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://serpapi.com/search",
                params={
                    "engine": "google",
                    "q": topic,
                    "num": 5,
                    "api_key": settings.serpapi_key,
                },
            )
        data = resp.json()
        questions = []
        for paa in data.get("people_also_ask", []):
            q = paa.get("question", "").strip()
            if q:
                questions.append({"question_text": q, "source": "paa", "q_type": classify_q_type(q)})
        return questions
    except Exception:
        return []


async def generate_ai_questions(topic: str) -> List[Dict]:
    """Use OpenAI to generate topic-specific questions."""
    if not settings.openai_api_key:
        return []

    prompt = (
        f"Generate 12 specific questions that a person researching '{topic}' might ask. "
        f"Include a mix of: how-to questions, what-is questions, comparison questions, "
        f"and why questions. Return ONLY the questions, one per line, no numbering."
    )
    try:
        resp = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content or ""
        questions = []
        for line in raw.strip().split("\n"):
            q = line.strip().lstrip("•-–1234567890. ").strip()
            if q and len(q) > 10:
                questions.append({"question_text": q, "source": "ai", "q_type": classify_q_type(q)})
        return questions[:12]
    except Exception:
        return []


def deduplicate_questions(questions: List[Dict]) -> List[Dict]:
    """Simple dedup: lowercase exact match."""
    seen = set()
    unique = []
    for q in questions:
        key = q["question_text"].lower().strip().rstrip("?")
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique


async def mine_questions(topic: str) -> List[Dict]:
    """Aggregate questions from all sources."""
    import asyncio
    paa, ai_qs = await asyncio.gather(
        fetch_paa_questions(topic),
        generate_ai_questions(topic),
    )
    all_questions = paa + ai_qs
    return deduplicate_questions(all_questions)
