import re
from dataclasses import dataclass
from typing import List


@dataclass
class EeatResult:
    score:   int
    issues:  List[dict]
    details: dict


_AUTHOR_PATTERNS = [
    r'\bby\s+[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\b',
    r'\bauthor[:\s]+[A-Z]',
    r'\bwritten by\b',
    r'\bcontributed by\b',
    r'\bedited by\b',
]

_DATE_PATTERNS = [
    r'\b(January|February|March|April|May|June|July|August|'
    r'September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
    r'\b\d{1,2}/\d{1,2}/\d{4}\b',
    r'\b\d{4}-\d{2}-\d{2}\b',
    r'\blast updated\b',
    r'\bpublished\s+(on|in)\b',
    r'\bupdated\s+(on|in)\b',
]

_EXPERTISE_PATTERNS = [
    r'\b(PhD|MD|MBA|CPA|JD|MSc|BSc|Dr\.)\b',
    r'\b(certified|licensed|registered|accredited)\b',
    r'\b(years of experience|specialist|expert|professional)\b',
    r'\b(according to|research shows|study found|survey of)\b',
    r'\b(published in|cited by|sourced from)\b',
]

_YMYL_TOPICS = [
    'health', 'medical', 'financial', 'legal', 'investment',
    'diagnosis', 'treatment', 'drug', 'lawsuit', 'tax', 'surgery',
    'medication', 'prescription', 'vaccine', 'therapy',
]


def analyze_eeat(content: str, author_name: str = "") -> EeatResult:
    issues:  List[dict] = []
    details: dict = {}
    score = 100

    # 1. Author attribution
    author_found = bool(author_name and author_name.strip())
    if not author_found:
        for pat in _AUTHOR_PATTERNS:
            if re.search(pat, content, re.IGNORECASE):
                author_found = True
                break

    details["author_found"] = author_found
    if not author_found:
        issues.append({
            "severity": "error",
            "message": "No author attribution found.",
            "fix": "Add 'By [Full Name]' near the top, or an author bio section.",
            "category": "eeat",
        })
        score -= 20

    # 2. External citations
    all_links     = re.findall(r'https?://[^\s\)\"\'\>]+', content)
    quality_links = [l for l in all_links
                     if not any(x in l for x in
                                ['twitter.com', 'facebook.com', 'instagram.com',
                                 'tiktok.com', 'youtube.com/watch'])]

    details["total_links"]   = len(all_links)
    details["quality_links"] = len(quality_links)

    if len(quality_links) == 0:
        issues.append({
            "severity": "error",
            "message": "No quality external citations found.",
            "fix": "Link to at least 3 authoritative sources: research papers, "
                   "government sites, industry reports, or recognised publications.",
            "category": "eeat",
        })
        score -= 20
    elif len(quality_links) < 2:
        issues.append({
            "severity": "warning",
            "message": f"Only {len(quality_links)} quality citation(s). Aim for 3+.",
            "fix": "Add more authoritative external references.",
            "category": "eeat",
        })
        score -= 10

    # 3. Date / freshness
    date_found = any(re.search(pat, content, re.IGNORECASE) for pat in _DATE_PATTERNS)
    details["date_found"] = date_found

    if not date_found:
        issues.append({
            "severity": "warning",
            "message": "No publication or update date found.",
            "fix": "Add 'Published: [date]' or 'Last updated: [date]' "
                   "— freshness signals matter for E-E-A-T.",
            "category": "eeat",
        })
        score -= 15

    # 4. Expertise signals
    exp_hits = sum(1 for pat in _EXPERTISE_PATTERNS
                   if re.search(pat, content, re.IGNORECASE))
    details["expertise_signals"] = exp_hits

    if exp_hits == 0:
        issues.append({
            "severity": "warning",
            "message": "No expertise signals found.",
            "fix": "Mention credentials, years of experience, or cite a study/survey. "
                   "E.g., 'According to a 2023 study by Harvard...'",
            "category": "eeat",
        })
        score -= 15

    # 5. YMYL disclaimer
    content_lower = content.lower()
    is_ymyl       = any(t in content_lower for t in _YMYL_TOPICS)
    details["is_ymyl"] = is_ymyl

    if is_ymyl:
        has_disclaimer = bool(re.search(
            r'(disclaimer|not medical advice|not financial advice|'
            r'consult a|informational purposes only|professional advice)',
            content, re.IGNORECASE))
        details["has_disclaimer"] = has_disclaimer

        if not has_disclaimer:
            issues.append({
                "severity": "error",
                "message": "YMYL (health/finance/legal) content detected — no disclaimer found.",
                "fix": "Add: 'This article is for informational purposes only. "
                       "Always consult a qualified professional before making decisions.'",
                "category": "eeat",
            })
            score -= 20

    return EeatResult(score=max(0, min(100, score)), issues=issues, details=details)
