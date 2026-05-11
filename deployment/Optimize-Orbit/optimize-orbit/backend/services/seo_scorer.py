import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class SeoIssue:
    severity: str
    message:  str
    fix:      str


@dataclass
class SeoResult:
    score:   int
    issues:  List[SeoIssue]
    details: dict


def score_seo(content: str, target_keyword: str = "") -> SeoResult:
    issues:  List[SeoIssue] = []
    details: dict = {}
    score = 100

    words      = content.split()
    word_count = len(words)
    details["word_count"] = word_count

    # 1. Word count
    if word_count < 300:
        issues.append(SeoIssue("error",
            f"Content is very short ({word_count} words). Minimum recommended: 600.",
            "Expand the content with more depth, examples, and detail."))
        score -= 20
    elif word_count < 600:
        issues.append(SeoIssue("warning",
            f"Content is below 600 words ({word_count}). Aim for 800+.",
            "Add more sections, examples, or FAQ-style content."))
        score -= 10

    # 2. Heading structure
    h1_list = re.findall(r'^#\s+(.+)', content, re.MULTILINE)
    h2_list = re.findall(r'^##\s+(.+)', content, re.MULTILINE)
    h3_list = re.findall(r'^###\s+(.+)', content, re.MULTILINE)

    details["h1_count"] = len(h1_list)
    details["h2_count"] = len(h2_list)
    details["h3_count"] = len(h3_list)

    if len(h1_list) == 0:
        issues.append(SeoIssue("error",
            "No H1 heading found.",
            "Add a single # H1 at the very top of the document."))
        score -= 15
    elif len(h1_list) > 1:
        issues.append(SeoIssue("warning",
            f"{len(h1_list)} H1 headings found. Use exactly one.",
            "Keep only one # H1 heading."))
        score -= 5

    if len(h2_list) == 0 and word_count > 300:
        issues.append(SeoIssue("warning",
            "No H2 subheadings found.",
            "Add ## subheadings to structure your content and improve scannability."))
        score -= 10

    # 3. Keyword density
    if target_keyword:
        kw      = target_keyword.lower()
        body    = content.lower()
        count   = body.count(kw)
        density = round((count / word_count * 100), 2) if word_count else 0

        details["keyword_count"]   = count
        details["keyword_density"] = density

        if count == 0:
            issues.append(SeoIssue("error",
                f"Target keyword '{target_keyword}' not found anywhere.",
                f"Include '{target_keyword}' naturally — in the H1, first paragraph, and at least 2–3 more times."))
            score -= 20
        elif density < 0.5:
            issues.append(SeoIssue("warning",
                f"Keyword density too low ({density}%). Target 0.5–2%.",
                f"Use '{target_keyword}' a few more times throughout the content."))
            score -= 10
        elif density > 3.0:
            issues.append(SeoIssue("warning",
                f"Keyword density too high ({density}%). Risk of keyword stuffing.",
                f"Reduce '{target_keyword}' usage and use synonyms instead."))
            score -= 10

        if h1_list and kw not in h1_list[0].lower():
            issues.append(SeoIssue("warning",
                "Target keyword not found in H1.",
                f"Include '{target_keyword}' in your H1 heading."))
            score -= 8

        first_100 = " ".join(words[:100]).lower()
        if kw not in first_100:
            issues.append(SeoIssue("info",
                "Target keyword not in opening paragraph.",
                f"Mention '{target_keyword}' early — ideally in the first 100 words."))
            score -= 5

    # 4. Long paragraph check
    paras      = [p.strip() for p in re.split(r'\n\n+', content)
                  if p.strip() and not p.strip().startswith('#')]
    long_paras = [p for p in paras if len(p.split()) > 120]
    details["long_paragraphs"] = len(long_paras)

    if long_paras:
        issues.append(SeoIssue("warning",
            f"{len(long_paras)} paragraph(s) exceed 120 words.",
            "Break long blocks into shorter paragraphs for readability."))
        score -= 5

    # 5. External links
    ext_links = re.findall(r'https?://[^\s\)\"\'\>]+', content)
    details["external_links"] = len(ext_links)

    if len(ext_links) == 0 and word_count > 400:
        issues.append(SeoIssue("info",
            "No external links found.",
            "Add 2–3 authoritative sources to strengthen credibility."))
        score -= 5

    return SeoResult(score=max(0, min(100, score)), issues=issues, details=details)
