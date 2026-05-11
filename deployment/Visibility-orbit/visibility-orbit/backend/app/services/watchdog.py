"""
ORBITA Visibility Orbit — Watchdog Service

Compares extracted facts from probe runs against Knowledge Core.

CRITICAL CHANGE: Instead of querying a local KnowledgeFact table,
this now calls Knowledge Core's API to get verified facts.
"""

import json
import httpx
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Alert, AlertType, AlertSeverity, ProbeRun
from app.services.llm_clients import call_analysis_model
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

KNOWLEDGE_CORE_URL = settings.KNOWLEDGE_CORE_URL


async def check_claim_against_fact(
    stated_claim: str,
    known_fact: str,
) -> dict:
    """Use LLM to compare a stated claim against a known fact."""
    prompt = f"""Compare these two statements:

KNOWN FACT (verified): "{known_fact}"
AI-STATED CLAIM: "{stated_claim}"

Does the AI-stated claim contradict, significantly misrepresent, or conflict with the known fact?

Respond ONLY with JSON (no markdown):
{{"contradicts": true|false, "confidence": "high"|"medium"|"low", "explanation": "<one sentence>"}}"""

    try:
        response = await call_analysis_model(prompt)
        clean = response.strip().strip("```json").strip("```").strip()
        return json.loads(clean)
    except Exception:
        return {"contradicts": False, "confidence": "low", "explanation": "Check failed"}


async def fetch_knowledge_core_facts(brand_id: str) -> list[dict]:
    """
    Fetch verified facts from Knowledge Core API.
    Replaces the old db.query(KnowledgeFact) call.
    """
    return await fetch_knowledge_core_facts_with_token(brand_id)


async def fetch_knowledge_core_facts_with_token(
    brand_id: str,
    user_token: Optional[str] = None,
) -> list[dict]:
    try:
        headers = {
            "X-Service-Name": "visibility-orbit",
            "Content-Type": "application/json",
        }
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{KNOWLEDGE_CORE_URL}/api/facts",
                params={"brand_id": brand_id},
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            # Knowledge Core returns facts in a list
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and "data" in data:
                return data["data"]
            return []
    except Exception as e:
        logger.error(f"Failed to fetch facts from Knowledge Core: {e}")
        return []


async def run_hallucination_check(
    db: Session,
    probe_run: ProbeRun,
    extracted_facts: list[str],
    brand_id: str,
    organization_id: str = "",
    user_token: Optional[str] = None,
) -> list[dict]:
    """
    Compare all extracted facts from a probe run against Knowledge Core.
    Creates Alert records for any hallucinations found.
    """
    if not extracted_facts:
        return []

    # CHANGED: fetch facts from Knowledge Core API instead of local DB
    known_facts = await fetch_knowledge_core_facts_with_token(brand_id, user_token)

    if not known_facts:
        return []

    hallucinations = []

    for stated_claim in extracted_facts:
        for known_fact in known_facts:
            # Extract the claim text from different possible response formats
            fact_claim = known_fact.get("value", known_fact.get("claim", ""))
            if not fact_claim:
                continue

            result = await check_claim_against_fact(stated_claim, fact_claim)

            if result.get("contradicts") and result.get("confidence") in ("high", "medium"):
                severity = (
                    AlertSeverity.high
                    if result["confidence"] == "high"
                    else AlertSeverity.medium
                )

                alert = Alert(
                    organization_id=organization_id or probe_run.organization_id,
                    brand_id=brand_id,
                    project_id=probe_run.project_id,
                    probe_run_id=probe_run.id,
                    alert_type=AlertType.hallucination,
                    severity=severity,
                    title=f"Hallucination detected ({probe_run.llm_engine})",
                    description=f"{probe_run.llm_engine.value} stated something that contradicts a known fact.",
                    details={
                        "stated_claim": stated_claim,
                        "known_fact": fact_claim,
                        "fact_category": known_fact.get("category", known_fact.get("attribute", "")),
                        "llm_engine": probe_run.llm_engine.value,
                        "confidence": result["confidence"],
                        "explanation": result.get("explanation", ""),
                    },
                )
                db.add(alert)
                hallucinations.append(alert.details)

    db.commit()
    return hallucinations


async def check_sentiment_alert(
    db: Session,
    probe_run: ProbeRun,
    sentiment: str,
    sentiment_score: float,
    brand_id: str,
    organization_id: str = "",
):
    """Create alert if sentiment is strongly negative."""
    if sentiment == "negative" and sentiment_score < -0.5:
        alert = Alert(
            organization_id=organization_id or probe_run.organization_id,
            brand_id=brand_id,
            project_id=probe_run.project_id,
            probe_run_id=probe_run.id,
            alert_type=AlertType.negative_sentiment,
            severity=AlertSeverity.medium,
            title=f"Negative sentiment detected ({probe_run.llm_engine})",
            description=f"{probe_run.llm_engine.value} expressed negative sentiment about your brand (score: {sentiment_score:.2f}).",
            details={
                "llm_engine": probe_run.llm_engine.value,
                "sentiment_score": sentiment_score,
                "prompt_text": probe_run.prompt_text[:300],
            },
        )
        db.add(alert)
        db.commit()
