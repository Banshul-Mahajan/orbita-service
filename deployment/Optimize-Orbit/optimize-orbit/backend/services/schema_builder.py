import re
from dataclasses import dataclass
from typing import List


@dataclass
class SchemaResult:
    score:         int
    detected_type: str
    json_ld:       dict
    issues:        List[dict]


def _extract_title(content: str) -> str:
    h1 = re.findall(r'^#\s+(.+)', content, re.MULTILINE)
    if h1:
        return h1[0].strip()
    for line in content.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith('#'):
            return stripped[:120]
    return "Untitled"


def _extract_description(content: str) -> str:
    chunks = re.split(r'\n\n+', content)
    for chunk in chunks:
        c = chunk.strip()
        if c and not c.startswith('#') and len(c.split()) > 8:
            clean = re.sub(r'[#*_`\[\]]', '', c)
            return clean[:250].strip()
    return ""


def _detect_type(content: str, hint: str) -> str:
    if hint in ("faq", "howto", "product"):
        return hint
    faq_headings = re.findall(r'^#{1,3}\s+.+\?', content, re.MULTILINE)
    if len(faq_headings) >= 2:
        return "faq"
    steps = re.findall(r'^\d+\.\s+.+', content, re.MULTILINE)
    if len(steps) >= 3:
        return "howto"
    return "article"


def _build_article(content: str, keyword: str) -> dict:
    return {
        "@context":    "https://schema.org",
        "@type":       "Article",
        "headline":    _extract_title(content),
        "description": _extract_description(content),
        "keywords":    keyword,
    }


def _build_faq(content: str) -> dict:
    qa_pairs = []
    sections = re.split(r'\n(?=#{1,3}\s)', content)
    for section in sections:
        m = re.match(r'^#{1,3}\s+(.+\?)\s*\n([\s\S]+?)$', section.strip())
        if m:
            question = m.group(1).strip()
            raw_ans  = m.group(2).strip()
            answer   = re.sub(r'[#*_`]', '', raw_ans)[:600]
            if answer:
                qa_pairs.append({
                    "@type": "Question",
                    "name":  question,
                    "acceptedAnswer": {"@type": "Answer", "text": answer},
                })

    if not qa_pairs:
        lines = content.splitlines()
        for i, line in enumerate(lines):
            line = line.strip()
            if line.endswith('?') and i + 1 < len(lines):
                ans = lines[i + 1].strip()
                if ans and not ans.startswith('#'):
                    qa_pairs.append({
                        "@type": "Question",
                        "name":  line,
                        "acceptedAnswer": {"@type": "Answer", "text": ans[:600]},
                    })

    return {
        "@context":   "https://schema.org",
        "@type":      "FAQPage",
        "mainEntity": qa_pairs[:10],
    }


def _build_howto(content: str) -> dict:
    title     = _extract_title(content)
    desc      = _extract_description(content)
    raw_steps = re.findall(r'^\d+\.\s+(.+)', content, re.MULTILINE)
    steps = [
        {"@type": "HowToStep", "position": i + 1, "text": s.strip()}
        for i, s in enumerate(raw_steps[:20])
    ]
    return {
        "@context":    "https://schema.org",
        "@type":       "HowTo",
        "name":        title,
        "description": desc,
        "step":        steps,
    }


def build_schema(content: str, content_type_hint: str, keyword: str) -> SchemaResult:
    issues:   List[dict] = []
    score   = 100
    detected = _detect_type(content, content_type_hint)

    if detected == "faq":
        json_ld = _build_faq(content)
        if not json_ld.get("mainEntity"):
            issues.append({
                "severity": "warning",
                "message":  "FAQ type detected but no Q&A pairs extracted.",
                "fix":      "Format each FAQ as a ## heading ending with '?' followed by the answer paragraph.",
                "category": "schema",
            })
            score -= 20
    elif detected == "howto":
        json_ld = _build_howto(content)
        if not json_ld.get("step"):
            issues.append({
                "severity": "warning",
                "message":  "HowTo type detected but no numbered steps found.",
                "fix":      "Format steps as '1. Do this', '2. Then this', etc.",
                "category": "schema",
            })
            score -= 20
    else:
        json_ld = _build_article(content, keyword)
        if not json_ld.get("headline"):
            issues.append({
                "severity": "error",
                "message":  "No headline for Article schema.",
                "fix":      "Add a # H1 heading.",
                "category": "schema",
            })
            score -= 20
        if not json_ld.get("description"):
            issues.append({
                "severity": "warning",
                "message":  "No description for Article schema.",
                "fix":      "Add a descriptive opening paragraph (10+ words).",
                "category": "schema",
            })
            score -= 10

    return SchemaResult(
        score=max(0, min(100, score)),
        detected_type=detected,
        json_ld=json_ld,
        issues=issues,
    )
