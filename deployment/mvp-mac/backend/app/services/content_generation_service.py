"""
Create Orbit-style content draft generation for the MVP.

The output is deterministic and safe in mock mode, but structured so it can be
replaced by a RAG-backed writer later.
"""
import re
from typing import Any, Dict, List


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:120] or "content-draft"


def _title(keyword: str, intent: str, content_type: str) -> str:
    if content_type == "faq" or intent == "informational":
        return f"{keyword.title()}: Questions, Answers, and Practical Guide"
    if intent == "transactional":
        return f"{keyword.title()}: Pricing, Benefits, and How to Get Started"
    if intent == "commercial":
        return f"Best Options for {keyword.title()}: What to Compare Before Choosing"
    return f"{keyword.title()}: Complete Resource"


def _outline(keyword: str, intent: str, content_type: str) -> List[str]:
    if content_type == "faq":
        return [
            f"What is {keyword}?",
            f"Who is {keyword} best for?",
            f"How do you choose the right {keyword} option?",
            f"What should you do next?",
        ]
    if intent == "transactional":
        return [
            f"Why {keyword} matters now",
            "Key benefits and use cases",
            "Pricing and buying considerations",
            "How to get started",
            "Frequently asked questions",
        ]
    if intent == "commercial":
        return [
            f"What to compare when evaluating {keyword}",
            "Top decision criteria",
            "Common competitor patterns",
            "Recommended next step",
            "Frequently asked questions",
        ]
    return [
        f"What is {keyword}?",
        f"Why {keyword} matters",
        "Key concepts and examples",
        "Common mistakes to avoid",
        "Frequently asked questions",
    ]


def _faq(keyword: str, content_type: str) -> List[Dict[str, str]]:
    return [
        {
            "question": f"What is {keyword}?",
            "answer": f"{keyword.title()} refers to the topic, service, or solution the reader is researching before making an informed decision.",
        },
        {
            "question": f"Who should care about {keyword}?",
            "answer": "Teams or buyers who want a clearer path from research to action should evaluate this topic carefully.",
        },
        {
            "question": f"What is the next step for {keyword}?",
            "answer": "Review the options, compare the evidence, and choose the path that best matches your goals, budget, and timeline.",
        },
    ]


def generate_content_draft(
    keyword: str,
    intent: str,
    content_type: str,
    tone: str,
    company_profile: Dict[str, Any] | None = None,
    competitor_pages: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    company_profile = company_profile or {}
    competitor_pages = competitor_pages or []
    company = company_profile.get("company_name") or "your brand"
    audience = company_profile.get("target_audience") or "your target audience"
    industry = company_profile.get("industry") or "your market"

    title = _title(keyword, intent, content_type)
    outline = _outline(keyword, intent, content_type)
    competitor_domains = sorted({p.get("domain") for p in competitor_pages if p.get("domain")})[:5]
    competitor_line = (
        f"Current ranking pages commonly come from {', '.join(competitor_domains)}."
        if competitor_domains else
        "Current ranking pages should be reviewed before publishing the final version."
    )

    body = f"""# {title}

## Overview
This draft is written for {audience} in {industry}. It focuses on **{keyword}** and is designed for a {intent} search intent.

## Why This Topic Matters
People searching for {keyword} are trying to reduce uncertainty before taking the next step. {company} should answer the query clearly, explain the decision criteria, and make the next action easy.

## Competitive Context
{competitor_line}

## Recommended Structure
{chr(10).join(f"- {item}" for item in outline)}

## Draft Guidance
Use simple explanations, specific examples, and proof points from the brand's verified Knowledge Core before publishing. Add citations where claims need support.

## Call to Action
If the reader is ready to move forward, guide them toward the most relevant product, service, demo, consultation, or next educational resource.
"""

    return {
        "title": title,
        "slug": slugify(title),
        "content_type": content_type,
        "intent": intent,
        "status": "draft",
        "meta_title": title[:60],
        "meta_description": f"Learn about {keyword}, compare options, and understand the next best step for {audience}."[:155],
        "outline": outline,
        "body_markdown": body,
        "faq": _faq(keyword, content_type),
    }
