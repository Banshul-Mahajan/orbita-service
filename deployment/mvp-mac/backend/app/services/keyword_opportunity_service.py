"""
Website-driven keyword opportunity generation.

This wraps the existing Keyword Universe service for the beginner journey.
"""
import re
from typing import Any, Dict, Iterable, List

from app.services.keyword_service import classify_intent, expand_keywords


def normalize_keyword(keyword: str) -> str:
    return re.sub(r"\s+", " ", keyword.lower()).strip()


def _terms(*values: str | None) -> set[str]:
    joined = " ".join(v or "" for v in values)
    return {
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", joined)
        if token.lower() not in {"and", "the", "for", "with", "your", "our"}
    }


def score_relevance(keyword: str, seed_topic: str, profile_terms: set[str]) -> float:
    kw_terms = _terms(keyword)
    if not kw_terms:
        return 0.35
    overlap = len(kw_terms & profile_terms)
    seed_bonus = 0.2 if seed_topic and seed_topic.lower() in keyword.lower() else 0.0
    score = 0.45 + min(0.35, overlap * 0.08) + seed_bonus
    return round(min(1.0, score), 2)


def score_intent(keyword: str, intent: str) -> float:
    detected = classify_intent(keyword)
    return 0.92 if detected == intent else 0.72


def _iter_existing_keywords(result: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    for cluster in result.get("clusters", []):
        cluster_name = cluster.get("cluster_name")
        for kw in cluster.get("keywords", []):
            yield {
                "keyword": kw.get("keyword", ""),
                "intent": kw.get("intent") or classify_intent(kw.get("keyword", "")),
                "search_volume": kw.get("volume"),
                "difficulty": kw.get("difficulty"),
                "cluster_name": cluster_name,
            }


async def build_keyword_opportunities(
    seed_topics: List[str],
    company_name: str,
    industry: str | None = None,
    target_audience: str | None = None,
    limit_per_seed: int = 12,
) -> List[Dict[str, Any]]:
    profile_terms = _terms(company_name, industry, target_audience, " ".join(seed_topics))
    seen: set[str] = set()
    opportunities: List[Dict[str, Any]] = []

    for seed in seed_topics[:6]:
        raw_items: List[Dict[str, Any]] = []
        try:
            expanded = await expand_keywords(seed, limit_per_seed)
            raw_items.extend(_iter_existing_keywords(expanded))
        except Exception:
            pass

        for item in raw_items:
            keyword = normalize_keyword(item.get("keyword", ""))
            if not keyword or keyword in seen:
                continue
            seen.add(keyword)
            intent = item.get("intent") or classify_intent(keyword)
            opportunities.append({
                "seed_topic": seed,
                "keyword": keyword,
                "normalized_keyword": keyword,
                "intent": intent,
                "intent_score": score_intent(keyword, intent),
                "search_volume": item.get("search_volume"),
                "difficulty": item.get("difficulty"),
                "relevance_score": score_relevance(keyword, seed, profile_terms),
                "cluster_name": item.get("cluster_name") or seed,
                "selected": intent in {"commercial", "transactional"} and len(opportunities) < 8,
            })

    opportunities.sort(
        key=lambda item: (
            0 if item["intent"] in {"transactional", "commercial"} else 1,
            -(item.get("relevance_score") or 0),
            item["keyword"],
        )
    )
    return opportunities


def group_opportunities(items: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    grouped = {intent: [] for intent in INTENTS}
    for item in items:
        grouped.setdefault(item.get("intent") or "informational", []).append(item)
    return grouped
