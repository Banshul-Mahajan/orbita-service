import re
from dataclasses import dataclass
from typing import List

import spacy

try:
    _nlp = spacy.load("en_core_web_sm")
except OSError:
    raise RuntimeError("spaCy model not found. Run: python -m spacy download en_core_web_sm")

# Is this content good enough for AI tools like Google / ChatGPT to understand and cite?

@dataclass
class GeoIssue:
    severity: str
    message:  str
    fix:      str


@dataclass
class GeoResult:
    score:   int
    issues:  List[GeoIssue]
    details: dict


_STAT_PATTERNS = [
    r'\d+%',
    r'\$[\d,]+',
    r'£[\d,]+',
    r'\b\d{4}\b',
    r'\b\d+\.\d+\b',
    r'\b\d{1,3}(?:,\d{3})+\b',
    r'\b\d+\s*(million|billion|thousand)\b',
    r'\b\d+\s*(times|x)\b',
]


def score_geo(content: str) -> GeoResult:
    issues:  List[GeoIssue] = []
    details: dict = {}
    score = 100

    words      = content.split()
    word_count = len(words)

    doc = _nlp(content[:95_000])

    # 1. Named entity coverage
    entities   = [(ent.text, ent.label_) for ent in doc.ents]
    ent_types  = set(e[1] for e in entities)
    unique_ents = len(set(e[0] for e in entities))

    details["entity_count"]    = len(entities)
    details["unique_entities"] = unique_ents
    details["entity_types"]    = list(ent_types)

    if len(entities) == 0:
        issues.append(GeoIssue("error",
            "No named entities found.",
            "Add specific people, organisations, locations, products, or statistics. "
            "AI engines need anchored facts to cite your content."))
        score -= 20
    elif unique_ents < 4:
        issues.append(GeoIssue("warning",
            f"Low entity density ({unique_ents} unique entities).",
            "Include more named entities — brand names, locations, data sources, dates."))
        score -= 10

    # 2. Factual markers
    facts = []
    for pat in _STAT_PATTERNS:
        facts.extend(re.findall(pat, content, re.IGNORECASE))

    details["factual_markers"] = len(facts)

    if len(facts) == 0:
        issues.append(GeoIssue("warning",
            "No factual markers found (no percentages, figures, or dates).",
            "Add concrete statistics, year references, or measurable data points."))
        score -= 15
    elif len(facts) < 3:
        issues.append(GeoIssue("info",
            f"Only {len(facts)} factual marker(s) found.",
            "Add more data points — AI engines prefer factual, citable content."))
        score -= 5

    # 3. Structured content
    questions      = re.findall(r'^.+\?\s*$', content, re.MULTILINE)
    numbered_steps = re.findall(r'^\d+\.\s+.+', content, re.MULTILINE)
    bullets        = re.findall(r'^[-*•]\s+.+', content, re.MULTILINE)

    details["questions"]      = len(questions)
    details["numbered_steps"] = len(numbered_steps)
    details["bullet_points"]  = len(bullets)

    has_structure = len(numbered_steps) > 2 or len(bullets) > 2 or len(questions) > 1
    if not has_structure and word_count > 300:
        issues.append(GeoIssue("warning",
            "No structured content detected (no Q&A, lists, or steps).",
            "Add bullet points, numbered steps, or FAQ-style headings + answers. "
            "AI engines love scannable structure."))
        score -= 10

    # 4. Average sentence length
    sents = [s.text.strip() for s in doc.sents if s.text.strip()]
    if sents:
        avg_len = sum(len(s.split()) for s in sents) / len(sents)
        details["avg_sentence_words"] = round(avg_len, 1)

        if avg_len > 25:
            issues.append(GeoIssue("warning",
                f"Average sentence length is {avg_len:.0f} words. AI parsers prefer ≤20.",
                "Break long sentences. Each sentence should express one clear idea."))
            score -= 10
        elif avg_len > 20:
            issues.append(GeoIssue("info",
                f"Sentence length is {avg_len:.0f} words. Aim for ≤20 for AI parseability.",
                "Tighten sentences for better AI citability."))
            score -= 5

    # 5. Answer-first pattern
    h2_sections = re.findall(r'^##\s+.+\n(.{20,200})', content, re.MULTILINE)
    if h2_sections:
        vague_opens = sum(1 for s in h2_sections
                         if re.match(r'^(In |When |While |There |This |It )', s.strip()))
        if vague_opens > len(h2_sections) * 0.4:
            issues.append(GeoIssue("info",
                "Some sections open vaguely instead of with a direct answer.",
                "Start each section with the key point directly. "
                "'Answer first, explain second' improves AI citability."))
            score -= 5

    return GeoResult(score=max(0, min(100, score)), issues=issues, details=details)
