"""
Unified LLM service — supports OpenAI GPT-4o and Anthropic Claude.
Set PRIMARY_LLM in .env to switch. Falls back to the other if primary fails.
"""
from openai import OpenAI
import anthropic
from app.config import settings
from typing import Optional, AsyncGenerator
import logging
import json

logger = logging.getLogger(__name__)

TONE_SYSTEM_PROMPTS = {
    "authoritative": (
        "You are an expert content writer with deep domain authority. "
        "Write with confidence, cite reasoning clearly, use precise language. "
        "Structure arguments logically. Avoid hedging phrases like 'might' or 'could'. "
        "Tone: professional, assertive, definitive."
    ),
    "conversational": (
        "You are a friendly, knowledgeable writer who explains things clearly. "
        "Use simple sentences, occasional questions to engage the reader, "
        "and relatable examples. Avoid jargon. Write like you're talking to a smart friend. "
        "Tone: warm, approachable, engaging."
    ),
    "scientific": (
        "You are a technical writer with a scientific background. "
        "Use precise terminology, cite evidence-based reasoning, include data where relevant. "
        "Structure: hypothesis → evidence → conclusion. "
        "Tone: objective, methodical, evidence-driven."
    ),
    "minimalist": (
        "You are a minimalist writer. Every word earns its place. "
        "Short sentences. No fluff. No filler. Direct value delivery. "
        "Use white space well. Cut adverbs. Cut adjectives unless essential. "
        "Tone: crisp, direct, impactful."
    ),
}


def call_llm(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    max_tokens: int = 4000,
    temperature: float = 0.7,
    json_mode: bool = False,
) -> str:
    """Synchronous LLM call. Returns text response."""
    primary = settings.PRIMARY_LLM
    if not has_live_llm_config():
        raise RuntimeError("No external LLM provider is configured")

    try:
        if primary == "openai":
            return _call_openai(prompt, system, model, max_tokens, temperature, json_mode)
        else:
            return _call_anthropic(prompt, system, model, max_tokens, temperature)
    except Exception as e:
        logger.warning(f"Primary LLM ({primary}) failed: {e}. Trying fallback.")
        try:
            if primary == "openai":
                return _call_anthropic(prompt, system, model, max_tokens, temperature)
            else:
                return _call_openai(prompt, system, model, max_tokens, temperature, json_mode)
        except Exception as e2:
            logger.error(f"Both LLMs failed: {e2}.")
            raise RuntimeError(f"All configured LLM providers failed: {e2}") from e2


def _call_openai(
    prompt: str,
    system: Optional[str],
    model: Optional[str],
    max_tokens: int,
    temperature: float,
    json_mode: bool = False,
) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs = dict(
        model=model or "gpt-4o",
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def _call_anthropic(
    prompt: str,
    system: Optional[str],
    model: Optional[str],
    max_tokens: int,
    temperature: float,
) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    kwargs = dict(
        model=model or "claude-sonnet-4-6",
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[{"role": "user", "content": prompt}],
    )
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)
    return response.content[0].text


def call_llm_json(prompt: str, system: Optional[str] = None) -> dict:
    """Call LLM expecting JSON output. Handles parsing + retry."""
    system_with_json = (system or "") + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON."

    raw = call_llm(prompt, system=system_with_json, json_mode=True, temperature=0.3)

    # Strip markdown code fences if model ignored instructions
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1])

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("LLM JSON parse failed.")
        raise ValueError("LLM returned invalid JSON")


def get_tone_system_prompt(tone_style: str, custom_prompt: Optional[str] = None) -> str:
    """Get the system prompt for a tone style."""
    if custom_prompt:
        return custom_prompt
    return TONE_SYSTEM_PROMPTS.get(tone_style, TONE_SYSTEM_PROMPTS["conversational"])


def has_live_llm_config() -> bool:
    return bool(settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY)


def _mock_llm_response(prompt: str, system: Optional[str] = None, json_mode: bool = False) -> str:
    if json_mode:
        return json.dumps(_mock_json_response(prompt))

    if 'section of an article titled' in prompt:
        return _mock_section_text(prompt)

    return "Mock response generated because no external LLM provider is configured."


def _mock_json_response(prompt: str) -> dict:
    if "Generate a comprehensive SEO content brief" in prompt:
        topic = _extract_between(prompt, "Topic:", "\n") or "Untitled Topic"
        topic_clean = topic.strip()
        topic_words = [word for word in topic_clean.split() if word]
        base_phrase = " ".join(topic_words[:5]) or topic_clean
        h2s = [
            f"What {base_phrase} means",
            f"Why {base_phrase} matters",
            f"How to implement {base_phrase}",
            f"Common mistakes in {base_phrase}",
            f"Best practices for {base_phrase}",
        ]
        return {
            "h1": f"{topic_clean}: A Practical Guide",
            "h2s": h2s,
            "h3s": {
                h2s[0]: [f"Key concepts behind {base_phrase}", f"When {base_phrase} matters most"],
                h2s[1]: [f"Business impact of {base_phrase}", f"Signals to measure success"],
            },
            "keywords": _derive_keywords(topic_clean),
            "questions": [
                f"What is {base_phrase}?",
                f"How do teams start with {base_phrase}?",
                f"What mistakes should be avoided in {base_phrase}?",
                f"How do you measure success for {base_phrase}?",
                f"Which examples show {base_phrase} working well?",
            ],
            "entities": _derive_entities(topic_clean),
        }

    if "Extract all verifiable factual claims" in prompt:
        article_text = _extract_between(prompt, "Article text:\n---", "\n---") or prompt
        sentences = [
            sentence.strip()
            for sentence in re.split(r"(?<=[.!?])\s+", article_text)
            if sentence.strip()
        ]
        claims = []
        for sentence in sentences:
            lowered = sentence.lower()
            if any(char.isdigit() for char in sentence) or any(
                token in lowered for token in (" is ", " was ", " has ", " have ", " includes ", " contains ")
            ):
                claims.append(sentence)
            if len(claims) >= 15:
                break
        return {"claims": claims[:15]}

    if "Verify the following claim against the provided source context" in prompt:
        claim = _extract_between(prompt, 'CLAIM TO VERIFY:\n"', '"\n\nSOURCE CONTEXT') or ""
        context = _extract_after(prompt, "SOURCE CONTEXT FROM BRAND KNOWLEDGE BASE:\n")
        claim_tokens = {token for token in _tokenize(claim) if len(token) > 3}
        context_tokens = set(_tokenize(context))
        overlap = len(claim_tokens & context_tokens)
        confidence = round(min(1.0, overlap / max(len(claim_tokens), 1) + 0.2), 2)

        if overlap >= max(2, len(claim_tokens) // 3):
            status = "verified"
        elif overlap > 0:
            status = "unverified"
        else:
            status = "flagged"

        return {
            "status": status,
            "confidence": confidence,
            "reasoning": "Local fallback used lexical overlap between the claim and retrieved brand context.",
        }

    return {}


def _mock_section_text(prompt: str) -> str:
    section = _extract_between(prompt, 'Write the "', '" section of an article') or "Section"
    title = _extract_between(prompt, 'article titled "', '"') or "the topic"
    keywords_line = _extract_after(prompt, "Naturally incorporate these keywords where relevant:")
    keywords = [keyword.strip() for keyword in keywords_line.split(",")] if keywords_line else []
    keyword_text = ", ".join(keywords[:3]) if keywords else title

    return (
        f"{section} is where readers connect {title.lower()} to practical action. "
        f"This part should explain the core takeaway, show why it matters in day-to-day work, "
        f"and keep the language clear enough for non-specialists. "
        f"Use concrete examples, stay consistent with the brand point of view, and naturally reinforce {keyword_text}. "
        f"\n\n### Key takeaway\n"
        f"A strong section gives the reader context, a simple mental model, and a clear next step."
    )


def _derive_keywords(topic: str) -> list[str]:
    tokens = [token for token in _tokenize(topic) if len(token) > 2]
    if not tokens:
        return [topic]
    primary = " ".join(tokens[:2]) or topic
    return [
        primary,
        topic.lower(),
        f"{topic.lower()} guide",
        f"{topic.lower()} best practices",
        f"{topic.lower()} checklist",
        f"{topic.lower()} examples",
        f"how to improve {topic.lower()}",
        f"{topic.lower()} strategy",
    ]


def _derive_entities(topic: str) -> list[str]:
    tokens = [word.strip(",.:") for word in topic.split() if word]
    entities = [word for word in tokens if word[:1].isupper()]
    if not entities:
        entities = [tokens[0]] if tokens else ["Brand"]
    while len(entities) < 5:
        entities.append(f"{topic} framework".strip())
    return entities[:5]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _extract_between(text: str, start: str, end: str) -> str:
    if start not in text:
        return ""
    after_start = text.split(start, 1)[1]
    if end not in after_start:
        return after_start.strip()
    return after_start.split(end, 1)[0].strip()


def _extract_after(text: str, start: str) -> str:
    if start not in text:
        return ""
    return text.split(start, 1)[1].strip()
