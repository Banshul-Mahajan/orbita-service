import anthropic
from openai import OpenAI
import google.generativeai as genai
from app.config import get_settings

settings = get_settings()

# Initialize clients once
_anthropic = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None
_openai = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)


async def call_claude(prompt: str, system: str = "") -> str:
    """Call Anthropic Claude Sonnet."""
    if not settings.ANTHROPIC_API_KEY or _anthropic is None:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    messages = [{"role": "user", "content": prompt}]
    kwargs = {"model": "claude-sonnet-4-5", "max_tokens": 1024, "messages": messages}
    if system:
        kwargs["system"] = system
    try:
        response = _anthropic.messages.create(**kwargs)
        return response.content[0].text
    except Exception as exc:
        raise RuntimeError(f"Claude call failed: {exc}") from exc


async def call_gpt4(prompt: str, system: str = "") -> str:
    """Call OpenAI GPT-4o."""
    if not settings.OPENAI_API_KEY or _openai is None:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    try:
        response = _openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as exc:
        raise RuntimeError(f"GPT-4o call failed: {exc}") from exc


async def call_gemini(prompt: str, system: str = "") -> str:
    """Call Google Gemini Pro."""
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    model = genai.GenerativeModel("gemini-1.5-pro")
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    try:
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as exc:
        raise RuntimeError(f"Gemini call failed: {exc}") from exc


ENGINE_MAP = {
    "claude": call_claude,
    "gpt4": call_gpt4,
    "gemini": call_gemini,
}


async def call_analysis_model(prompt: str, system: str = "") -> str:
    """
    Internal analysis helper for parsing/watchdog tasks.
    Prefer OpenAI when available, then Claude, then Gemini.
    """
    if settings.OPENAI_API_KEY:
        return await call_gpt4(prompt, system)
    if settings.ANTHROPIC_API_KEY:
        return await call_claude(prompt, system)
    if settings.GOOGLE_API_KEY:
        return await call_gemini(prompt, system)
    raise RuntimeError("No analysis-capable LLM key is configured")


async def call_llm(engine: str, prompt: str, system: str = "") -> str:
    """Route to the correct LLM engine."""
    fn = ENGINE_MAP.get(engine)
    if not fn:
        raise ValueError(f"Unknown engine: {engine}")
    return await fn(prompt, system)
