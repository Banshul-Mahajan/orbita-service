import re
import json
from typing import Optional
from app.services.llm_clients import call_analysis_model


def extract_urls(text: str) -> list[str]:
    """Pull all URLs from LLM response text."""
    url_pattern = r'https?://[^\s\)\]\>"\']+[^\s\)\]\>"\'\.,]'
    return list(set(re.findall(url_pattern, text)))


def extract_domains(urls: list[str]) -> list[str]:
    """Get unique domains from a list of URLs."""
    domains = []
    for url in urls:
        m = re.match(r'https?://([^/]+)', url)
        if m:
            domains.append(m.group(1).replace("www.", ""))
    return list(set(domains))


def check_brand_mention(text: str, brand_name: str) -> dict:
    """Check if and how many times the brand is mentioned."""
    pattern = re.compile(re.escape(brand_name), re.IGNORECASE)
    mentions = pattern.findall(text)
    return {
        "mentioned": len(mentions) > 0,
        "mention_count": len(mentions),
    }


async def analyze_sentiment(text: str, brand_name: str) -> dict:
    """Zero-shot sentiment classification via LLM."""
    prompt = f"""Analyze the sentiment of the following AI-generated text toward the brand "{brand_name}".

Text:
\"\"\"
{text[:2000]}
\"\"\"

Respond with ONLY a JSON object like this (no markdown, no explanation):
{{"sentiment": "positive"|"neutral"|"negative", "score": <float -1.0 to 1.0>, "reason": "<one sentence>"}}"""

    try:
        response = await call_analysis_model(prompt)
        # Strip markdown fences if present
        clean = response.strip().strip("```json").strip("```").strip()
        return json.loads(clean)
    except Exception:
        return {"sentiment": "neutral", "score": 0.0, "reason": "Analysis failed"}


async def extract_brand_facts(text: str, brand_name: str) -> list[str]:
    """Extract factual claims about the brand from LLM response."""
    prompt = f"""From the text below, extract all factual claims specifically about "{brand_name}".

Text:
\"\"\"
{text[:2000]}
\"\"\"

Return ONLY a JSON array of strings, each being one factual claim.
Example: ["Brand X was founded in 2015", "Brand X charges $99/month"]
If no facts found, return [].
No markdown, no explanation."""

    try:
        response = await call_analysis_model(prompt)
        clean = response.strip().strip("```json").strip("```").strip()
        return json.loads(clean)
    except Exception:
        return []


async def parse_probe_response(
    raw_response: str,
    brand_name: str,
) -> dict:
    """Full parse pipeline for a single LLM probe response."""
    urls = extract_urls(raw_response)
    domains = extract_domains(urls)
    mention_data = check_brand_mention(raw_response, brand_name)
    sentiment = await analyze_sentiment(raw_response, brand_name)
    extracted_facts = await extract_brand_facts(raw_response, brand_name)

    return {
        "brand_mentioned": mention_data["mentioned"],
        "mention_count": mention_data["mention_count"],
        "sentiment": sentiment.get("sentiment", "neutral"),
        "sentiment_score": sentiment.get("score", 0.0),
        "sentiment_reason": sentiment.get("reason", ""),
        "cited_urls": urls,
        "cited_domains": domains,
        "extracted_facts": extracted_facts,
    }
