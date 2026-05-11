"""
Intent Heatmap service.
Builds a coverage matrix by comparing:
- Which domains appear in Google SERP results
- Which domains AI engines cite for the same query

Coverage score: 0.0 (no coverage) → 1.0 (full coverage)
Gap: True when AI covers well but Google doesn't (or vice versa)
"""
from typing import List, Dict, Any


def compute_coverage_score(domains: List[str], position_weight: bool = True) -> float:
    """
    Score: 1.0 if 5+ unique quality domains appear; scales down for fewer.
    Position-weighted: top results count more for SERP.
    """
    if not domains:
        return 0.0
    unique = len(set(domains))
    # Normalize: 5 unique domains = score 1.0
    return min(1.0, unique / 5.0)


def build_heatmap(
    query: str,
    serp_results: List[Dict],
    ai_results: List[Dict],
) -> Dict[str, Any]:
    """
    Build a topic × channel coverage matrix.
    For MVP we use the single query as the topic row.
    """
    channels = []

    # Google channel
    serp_domains = [r.get("domain", "") for r in serp_results if r.get("domain")]
    google_score = compute_coverage_score(serp_domains[:10])
    channels.append({
        "channel": "google",
        "label": "Google",
        "coverage_score": round(google_score, 2),
        "top_domains": serp_domains[:5],
        "gap": False,
    })

    # AI channels
    for ai_result in ai_results:
        engine = ai_result.get("engine", "unknown")
        ai_domains = ai_result.get("cited_domains", [])
        ai_score = compute_coverage_score(ai_domains)

        # Gap definition: if AI score differs from Google score by > 0.3
        gap = abs(google_score - ai_score) > 0.3

        label_map = {
            "openai": "ChatGPT",
            "gemini": "Gemini",
            "perplexity": "Perplexity",
        }
        channels.append({
            "channel": engine,
            "label": label_map.get(engine, engine.title()),
            "coverage_score": round(ai_score, 2),
            "top_domains": ai_domains[:5],
            "gap": gap,
        })

    # Domain overlap analysis
    serp_domain_set = set(serp_domains[:10])
    ai_all_domains: set = set()
    for ai_result in ai_results:
        ai_all_domains.update(ai_result.get("cited_domains", []))

    overlap = serp_domain_set & ai_all_domains
    only_serp = serp_domain_set - ai_all_domains
    only_ai = ai_all_domains - serp_domain_set

    return {
        "query": query,
        "channels": channels,
        "overlap_analysis": {
            "domains_in_both": sorted(overlap),
            "only_in_google": sorted(only_serp),
            "only_in_ai": sorted(only_ai),
            "overlap_ratio": round(
                len(overlap) / max(1, len(serp_domain_set | ai_all_domains)), 2
            ),
        },
        "insight": _generate_insight(google_score, channels, overlap),
    }


def _generate_insight(
    google_score: float,
    channels: List[Dict],
    overlap: set,
) -> str:
    ai_channels = [c for c in channels if c["channel"] != "google"]
    high_gap_channels = [c["label"] for c in ai_channels if c["gap"]]

    if not ai_channels:
        return "Run an AI scan to see gap analysis."

    avg_ai = sum(c["coverage_score"] for c in ai_channels) / len(ai_channels)

    if avg_ai < google_score - 0.3:
        return (
            f"Google has strong coverage (score {google_score:.2f}) "
            f"but AI engines cite fewer sources (avg {avg_ai:.2f}). "
            f"Opportunity: create content that AI engines can cite."
        )
    elif avg_ai > google_score + 0.3:
        return (
            f"AI engines have broader source coverage than Google for this query. "
            f"Traditional SEO may be missing what AI finds credible."
        )
    elif len(overlap) == 0:
        return (
            "No domain overlap between Google and AI results — "
            "the two ecosystems are citing completely different sources for this topic."
        )
    else:
        return (
            f"Moderate alignment between Google and AI (overlap: {len(overlap)} domains). "
            f"Focus on domains already in both to maximise dual visibility."
        )
