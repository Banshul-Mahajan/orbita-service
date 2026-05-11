"""
Brief Builder Service
Generates a structured H1-H4 content brief from a topic using LLM.
Uses RAG context if corpus documents exist for this user.
"""
from typing import Optional
from app.services.llm_service import call_llm_json, get_tone_system_prompt
from app.services.rag_service import retrieve_context
import logging

logger = logging.getLogger(__name__)


def generate_brief(
    topic: str,
    brand_id: str,
    target_audience: Optional[str] = None,
    tone_style: str = "conversational",
    additional_context: Optional[str] = None,
) -> dict:
    """
    Generate a structured content brief.
    Returns: {h1, h2s, h3s, keywords, questions, entities}
    """
    # Step 1: Pull relevant context from corpus (if any docs indexed)
    corpus_context = ""
    try:
        chunks = retrieve_context(brand_id, topic, top_k=3)
        if chunks:
            corpus_context = "\n\n".join([
                f"[From '{c['source_title']}']: {c['chunk']}"
                for c in chunks
            ])
    except Exception as e:
        logger.warning(f"RAG context retrieval failed for brief: {e}")

    # Step 2: Build the prompt
    audience_line = f"Target audience: {target_audience}" if target_audience else ""
    extra_line = f"Additional context: {additional_context}" if additional_context else ""
    corpus_line = f"\n\nRelevant content from brand corpus:\n{corpus_context}" if corpus_context else ""

    prompt = f"""Generate a comprehensive SEO content brief for the following topic.

Topic: {topic}
Tone style: {tone_style}
{audience_line}
{extra_line}
{corpus_line}

Return a JSON object with EXACTLY this structure:
{{
  "h1": "The main headline/title for the article",
  "h2s": ["Section 1 heading", "Section 2 heading", "Section 3 heading", "Section 4 heading", "Section 5 heading"],
  "h3s": {{
    "Section 1 heading": ["Sub-section A", "Sub-section B"],
    "Section 2 heading": ["Sub-section A", "Sub-section B"]
  }},
  "keywords": ["primary keyword", "secondary keyword 1", "secondary keyword 2", "LSI keyword 1", "LSI keyword 2", "LSI keyword 3", "LSI keyword 4", "LSI keyword 5"],
  "questions": ["Question readers might ask 1?", "Question readers might ask 2?", "Question readers might ask 3?", "Question readers might ask 4?", "Question readers might ask 5?"],
  "entities": ["Named entity 1", "Named entity 2", "Named entity 3", "Named entity 4", "Named entity 5"]
}}

Requirements:
- h1 should be compelling and SEO-optimized
- h2s should cover the topic comprehensively (5 sections)
- h3s: only provide sub-sections for the first 2 h2s to keep response size manageable
- keywords: mix of head terms and long-tail keywords
- questions: address real user intent, mix of informational and decision-stage
- entities: key people, places, products, organizations relevant to the topic
"""

    system = get_tone_system_prompt(tone_style)
    result = call_llm_json(prompt, system=system)
    return result


def calculate_entity_score(article_body: str, brief_entities: list) -> float:
    """
    Calculate what % of brief entities appear in the article body.
    Simple string matching — good enough for MVP.
    """
    if not brief_entities:
        return 100.0

    body_lower = article_body.lower()
    found = sum(1 for entity in brief_entities if entity.lower() in body_lower)
    return round((found / len(brief_entities)) * 100, 1)
