"""
Website-first onboarding scanner.

This is intentionally lightweight for the MVP: it scans the homepage and a
small set of same-domain pages, extracts page signals, and derives seed topics
that can feed keyword discovery.
"""
import re
from collections import Counter
from typing import Any, Dict, List
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


STOPWORDS = {
    "about", "after", "again", "all", "and", "are", "best", "but", "can",
    "contact", "for", "from", "get", "has", "have", "home", "into", "its",
    "learn", "more", "our", "page", "policy", "privacy", "read", "services",
    "that", "the", "this", "use", "with", "your",
}


def normalize_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = f"https://{cleaned}"
    parsed = urlparse(cleaned)
    if not parsed.netloc:
        raise ValueError("Invalid website URL")
    return cleaned.rstrip("/")


def extract_domain(url: str) -> str:
    parsed = urlparse(normalize_url(url))
    return parsed.netloc.lower().replace("www.", "")


def _page_type(url: str) -> str:
    path = urlparse(url).path.lower()
    if not path or path == "/":
        return "home"
    if any(part in path for part in ["product", "pricing", "plan"]):
        return "product"
    if any(part in path for part in ["service", "solution"]):
        return "service"
    if any(part in path for part in ["blog", "guide", "resource"]):
        return "content"
    if "about" in path:
        return "about"
    return "page"


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _parse_page(url: str, html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()

    title = _clean_text(soup.title.get_text(" ", strip=True) if soup.title else "")
    meta_tag = soup.find("meta", attrs={"name": "description"})
    meta_description = _clean_text(meta_tag.get("content", "") if meta_tag else "")

    headings = []
    for level in ["h1", "h2", "h3"]:
        for tag in soup.find_all(level)[:6]:
            text = _clean_text(tag.get_text(" ", strip=True))
            if text:
                headings.append({"level": level, "text": text[:200]})

    h1 = next((h["text"] for h in headings if h["level"] == "h1"), "")
    body_text = _clean_text(soup.get_text(" ", strip=True))
    words = body_text.split()

    return {
        "url": url,
        "page_type": _page_type(url),
        "title": title[:500],
        "meta_description": meta_description[:1000],
        "h1": h1[:500],
        "headings": headings[:12],
        "body_excerpt": " ".join(words[:180]),
        "word_count": len(words),
        "is_indexable": True,
        "crawl_status": "scanned",
    }


def _discover_internal_links(base_url: str, html: str, max_pages: int) -> List[str]:
    domain = extract_domain(base_url)
    soup = BeautifulSoup(html, "html.parser")
    links: List[str] = []
    seen = {base_url}
    preferred = ("product", "service", "solution", "pricing", "about", "blog", "guide")

    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "").strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        absolute = urljoin(base_url, href).split("#")[0].rstrip("/")
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if parsed.netloc.lower().replace("www.", "") != domain:
            continue
        if re.search(r"\.(pdf|jpg|jpeg|png|gif|svg|webp|zip)$", parsed.path.lower()):
            continue
        if absolute not in seen:
            seen.add(absolute)
            links.append(absolute)

    links.sort(key=lambda item: 0 if any(token in item.lower() for token in preferred) else 1)
    return links[: max(0, max_pages - 1)]


def derive_seed_topics(pages: List[Dict[str, Any]], domain: str, limit: int = 8) -> List[str]:
    text_bits: List[str] = []
    for page in pages:
        text_bits.extend([
            page.get("title") or "",
            page.get("meta_description") or "",
            page.get("h1") or "",
        ])
        text_bits.extend(h.get("text", "") for h in page.get("headings", []))

    tokens = [
        token.lower()
        for token in re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", " ".join(text_bits))
        if token.lower() not in STOPWORDS
    ]

    phrases: List[str] = []
    for size in [3, 2]:
        for idx in range(0, max(0, len(tokens) - size + 1)):
            phrase = " ".join(tokens[idx: idx + size])
            if len(set(phrase.split())) > 1:
                phrases.append(phrase)

    ranked = [phrase for phrase, _ in Counter(phrases).most_common(limit)]
    fallback = domain.split(".")[0].replace("-", " ")
    if fallback and fallback not in ranked:
        ranked.append(fallback)

    return ranked[:limit]


async def scan_website(url: str, max_pages: int = 8) -> Dict[str, Any]:
    normalized = normalize_url(url)
    domain = extract_domain(normalized)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; DiscoverOrbitBot/0.1; +https://discover-orbit.local)"
    }

    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=headers) as client:
            homepage = await client.get(normalized)
            if homepage.status_code >= 400:
                return {
                    "normalized_url": normalized,
                    "primary_domain": domain,
                    "pages": [],
                    "seed_topics": [],
                    "errors": [f"Homepage returned HTTP {homepage.status_code}"],
                }

            urls = [str(homepage.url).rstrip("/")]
            urls.extend(_discover_internal_links(str(homepage.url), homepage.text, max_pages))

            pages: List[Dict[str, Any]] = []
            for idx, page_url in enumerate(urls[:max_pages]):
                html = homepage.text if idx == 0 else ""
                if idx > 0:
                    try:
                        resp = await client.get(page_url)
                        if resp.status_code >= 400:
                            continue
                        html = resp.text
                    except Exception:
                        continue
                pages.append(_parse_page(page_url, html))

        if not pages:
            return {
                "normalized_url": normalized,
                "primary_domain": domain,
                "pages": [],
                "seed_topics": [],
                "errors": ["No indexable pages could be scanned"],
            }

        return {
            "normalized_url": normalized,
            "primary_domain": domain,
            "pages": pages,
            "seed_topics": derive_seed_topics(pages, domain),
            "errors": [],
        }
    except Exception as exc:
        return {
            "normalized_url": normalized,
            "primary_domain": domain,
            "pages": [],
            "seed_topics": [],
            "errors": [str(exc)],
        }
