from datetime import datetime
from sqlalchemy.orm import Session
from app.models import ProbeRun, ProbeStatus
from app.services.llm_clients import call_llm
from app.services.parser import parse_probe_response
from app.services.watchdog import run_hallucination_check, check_sentiment_alert


def _engine_key_available(engine: str) -> bool:
    """Check if the API key for the given engine is configured."""
    from app.config import get_settings
    settings = get_settings()
    key_map = {
        "gpt4": settings.OPENAI_API_KEY,
        "claude": settings.ANTHROPIC_API_KEY,
        "gemini": settings.GOOGLE_API_KEY,
    }
    return bool(key_map.get(engine))


async def execute_probe_run(
    db: Session,
    run_id: str,
    brand_name: str,
    user_token: str | None = None,
):
    """
    Full probe execution pipeline:
    1. Call LLM
    2. Parse response
    3. Run hallucination watchdog
    4. Store results
    """
    run = db.query(ProbeRun).filter(ProbeRun.id == run_id).first()
    if not run:
        db.close()
        return

    engine_name = run.llm_engine.value

    # Pre-check: is the API key configured for this engine?
    if not _engine_key_available(engine_name):
        run.status = ProbeStatus.failed
        run.error_message = (
            f"API key for {engine_name} is not configured. "
            f"Please set the appropriate key in your .env file."
        )
        run.completed_at = datetime.utcnow()
        db.commit()
        db.close()
        return

    # Mark as running
    run.status = ProbeStatus.running
    db.commit()

    try:
        # Step 1: Call the LLM
        raw_response = await call_llm(
            engine=engine_name,
            prompt=run.prompt_text,
        )
        run.raw_response = raw_response

        # Step 2: Parse the response
        parsed = await parse_probe_response(raw_response, brand_name)
        run.parsed_result = parsed

        # Step 3: Hallucination watchdog
        hallucinations = await run_hallucination_check(
            db=db,
            probe_run=run,
            extracted_facts=parsed.get("extracted_facts", []),
            brand_id=run.brand_id,
            organization_id=run.organization_id,
            user_token=user_token,
        )
        if hallucinations:
            parsed["hallucinations_found"] = len(hallucinations)

        # Step 4: Sentiment alert
        await check_sentiment_alert(
            db=db,
            probe_run=run,
            sentiment=parsed.get("sentiment", "neutral"),
            sentiment_score=parsed.get("sentiment_score", 0.0),
            brand_id=run.brand_id,
            organization_id=run.organization_id,
        )

        run.status = ProbeStatus.completed
        run.completed_at = datetime.utcnow()
        run.parsed_result = parsed

    except Exception as e:
        run.status = ProbeStatus.failed
        run.error_message = f"{type(e).__name__}: {str(e)}"
        run.completed_at = datetime.utcnow()

    db.commit()
    db.close()


def get_preset_prompts(brand_name: str) -> list[dict]:
    """
    Returns a library of preset probe prompt templates for any brand.
    These get seeded automatically when a new brand is created.
    """
    return [
        {
            "category": "general",
            "prompt_text": f"What does {brand_name} do? Give me an overview of what they offer.",
        },
        {
            "category": "general",
            "prompt_text": f"Tell me about {brand_name}. Who are they and what problems do they solve?",
        },
        {
            "category": "pricing",
            "prompt_text": f"What is the pricing for {brand_name}? How much does it cost?",
        },
        {
            "category": "comparison",
            "prompt_text": f"How does {brand_name} compare to its main competitors?",
        },
        {
            "category": "comparison",
            "prompt_text": f"What are the pros and cons of using {brand_name}?",
        },
        {
            "category": "niche",
            "prompt_text": f"Who founded {brand_name} and when was it established?",
        },
        {
            "category": "niche",
            "prompt_text": f"What are the key features of {brand_name}'s product or service?",
        },
        {
            "category": "general",
            "prompt_text": f"Is {brand_name} a good company to work with? What do customers say?",
        },
    ]
