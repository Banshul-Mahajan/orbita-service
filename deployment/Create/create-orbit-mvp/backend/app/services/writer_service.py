"""
AI Writer Service
- Pulls context from ChromaDB RAG for each section
- Streams the response using Server-Sent Events (SSE)
- Uses brief structure as the writing blueprint
"""
from typing import AsyncGenerator, Optional, List
from app.services.rag_service import retrieve_context
from app.services.llm_service import get_tone_system_prompt, has_live_llm_config
from app.config import settings
from openai import OpenAI
import anthropic
import logging
import json

logger = logging.getLogger(__name__)


async def stream_article(
    brief: dict,
    brand_id: str,
    tone_style: str = "conversational",
    custom_system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Generate a full article by writing each H2 section sequentially.
    Yields SSE-formatted strings.

    SSE event format:
      data: {"type": "section_start", "heading": "H2 Heading"}
      data: {"type": "token", "content": "word "}
      data: {"type": "section_end"}
      data: {"type": "done", "word_count": 1200}
      data: {"type": "error", "message": "..."}
    """
    h1 = brief.get("h1", brief.get("topic", "Article"))
    h2s: List[str] = brief.get("h2s", [])
    h3s: dict = brief.get("h3s", {})
    keywords: List[str] = brief.get("keywords", [])
    tone = tone_style or "conversational"
    system_prompt = custom_system_prompt or get_tone_system_prompt(tone)
    total_words = 0

    # Yield article title
    yield _sse({"type": "title", "content": h1})

    for h2 in h2s:
        yield _sse({"type": "section_start", "heading": h2})

        # Retrieve RAG context for this section
        rag_context = ""
        try:
            chunks = retrieve_context(brand_id, f"{h1} {h2}", top_k=3)
            if chunks:
                rag_context = "\n\n".join([
                    f"Source ({c['source_title']}, relevance {c['relevance_score']}):\n{c['chunk']}"
                    for c in chunks
                    if c["relevance_score"] > 0.3  # only use relevant chunks
                ])
        except Exception as e:
            logger.warning(f"RAG retrieval failed for section '{h2}': {e}")

        # Build section sub-headings context
        sub_headings = h3s.get(h2, [])
        sub_section_line = ""
        if sub_headings:
            sub_section_line = f"\nSub-sections to cover: {', '.join(sub_headings)}"

        # Build the writing prompt for this section
        keyword_line = f"\nNaturally incorporate these keywords where relevant: {', '.join(keywords[:5])}" if keywords else ""
        corpus_line = f"\n\n===BRAND KNOWLEDGE (use these facts, don't contradict them)===\n{rag_context}" if rag_context else ""
        no_corpus_note = "\n\n[No brand corpus context available — write based on general knowledge, be careful with specific claims]" if not rag_context else ""

        prompt = f"""Write the "{h2}" section of an article titled "{h1}".

This section should be 200-300 words.{sub_section_line}{keyword_line}
{corpus_line}{no_corpus_note}

Instructions:
- Start directly with the content (do NOT repeat the section heading)
- Write in markdown: use **bold** for key terms, use sub-headings (###) if sub-sections are provided
- Ground every specific claim in the brand knowledge above
- Do not hallucinate statistics, dates, or facts not in the provided context
- End the section naturally (no "In conclusion" phrases for mid-article sections)
"""

        # Stream the response
        section_words = 0
        try:
            if not has_live_llm_config():
                raise RuntimeError("No live LLM provider is configured for article generation")
            elif settings.PRIMARY_LLM == "openai":
                async for token in _stream_openai(prompt, system_prompt):
                    yield _sse({"type": "token", "content": token})
                    section_words += len(token.split())
            else:
                async for token in _stream_anthropic(prompt, system_prompt):
                    yield _sse({"type": "token", "content": token})
                    section_words += len(token.split())
        except Exception as e:
            logger.error(f"Streaming failed for section '{h2}': {e}")
            yield _sse({"type": "error", "message": str(e)})
            return

        total_words += section_words
        yield _sse({"type": "section_end", "word_count": section_words})

    yield _sse({"type": "done", "total_word_count": total_words})


async def _stream_openai(prompt: str, system: str) -> AsyncGenerator[str, None]:
    """Stream tokens from OpenAI."""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        max_tokens=600,
        temperature=0.7,
        stream=True,
    )
    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content


async def _stream_anthropic(prompt: str, system: str) -> AsyncGenerator[str, None]:
    """Stream tokens from Anthropic Claude."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


async def _stream_mock(
    title: str,
    heading: str,
    sub_headings: List[str],
    keywords: List[str],
    rag_context: str,
) -> AsyncGenerator[str, None]:
    context_hint = ""
    if rag_context:
        first_line = rag_context.splitlines()[0].strip()
        context_hint = f" {first_line}"

    lines = [
        f"{heading} helps the article '{title}' stay focused on practical reader outcomes.{context_hint}",
        "Explain the idea clearly, connect it to the reader's workflow, and keep the section easy to scan.",
    ]

    if keywords:
        lines.append(
            f"Use important phrases naturally, especially {', '.join(keywords[:3])}, without forcing repetition."
        )

    for sub_heading in sub_headings:
        lines.append(f"### {sub_heading}")
        lines.append(
            f"Under {sub_heading}, add one clear explanation, one example, and one next step the reader can use immediately."
        )

    text = "\n\n".join(lines) + "\n\n"
    for token in text.split():
        yield token + " "


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"
