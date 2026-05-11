"""
Competitor discovery from selected keyword opportunities.
"""
from collections import defaultdict
from typing import Any, Dict, List

from app.services.serp_service import analyze_serp


def _same_or_child_domain(domain: str, own_domain: str | None) -> bool:
    if not domain or not own_domain:
        return False
    clean = domain.lower().replace("www.", "")
    own = own_domain.lower().replace("www.", "")
    return clean == own or clean.endswith(f".{own}")


async def discover_competitors(
    selected_keywords: List[Dict[str, Any]],
    own_domain: str | None,
    num_results: int = 10,
) -> Dict[str, List[Dict[str, Any]]]:
    domain_stats: Dict[str, Dict[str, Any]] = {}
    pages: List[Dict[str, Any]] = []

    for keyword_item in selected_keywords:
        keyword = keyword_item["keyword"]
        results = await analyze_serp(keyword, num_results)

        for result in results:
            domain = (result.get("domain") or "").lower().replace("www.", "")
            if not domain or _same_or_child_domain(domain, own_domain):
                continue

            position = int(result.get("position") or num_results)
            visibility = max(1, num_results + 1 - position)
            stat = domain_stats.setdefault(domain, {
                "domain": domain,
                "positions": [],
                "visibility_score": 0.0,
                "keywords": set(),
            })
            stat["positions"].append(position)
            stat["visibility_score"] += visibility
            stat["keywords"].add(keyword)

            pages.append({
                "domain": domain,
                "keyword_id": keyword_item.get("id"),
                "keyword": keyword,
                "url": result.get("url"),
                "title": result.get("title"),
                "position": position,
                "headings": result.get("headings") or [],
                "entities": result.get("entities") or [],
                "word_count": result.get("word_count"),
                "readability": result.get("readability"),
            })

    domains: List[Dict[str, Any]] = []
    for stat in domain_stats.values():
        positions = stat["positions"] or [0]
        keywords = sorted(stat["keywords"])
        domains.append({
            "domain": stat["domain"],
            "avg_position": round(sum(positions) / len(positions), 2),
            "ranking_keyword_count": len(keywords),
            "visibility_score": round(stat["visibility_score"], 2),
            "top_keywords": keywords[:8],
        })

    domains.sort(key=lambda item: (-item["visibility_score"], item["avg_position"]))

    page_groups = defaultdict(list)
    for page in pages:
        page_groups[page["domain"]].append(page)

    ranked_pages: List[Dict[str, Any]] = []
    for domain in domains:
        ranked_pages.extend(
            sorted(page_groups[domain["domain"]], key=lambda item: item.get("position") or 99)[:6]
        )

    return {"domains": domains[:20], "pages": ranked_pages}
