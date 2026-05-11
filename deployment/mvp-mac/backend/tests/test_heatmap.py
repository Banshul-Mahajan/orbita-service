import pytest
from unittest.mock import patch, AsyncMock

MOCK_SERP = [
    {"position": i+1, "domain": d, "entities": []}
    for i, d in enumerate(["hubspot.com","moz.com","semrush.com","ahrefs.com","backlinko.com"])
]

MOCK_AI = [
    {"engine": "openai",     "cited_domains": ["hubspot.com", "neilpatel.com"]},
    {"engine": "gemini",     "cited_domains": ["moz.com", "searchenginejournal.com"]},
    {"engine": "perplexity", "cited_domains": ["ahrefs.com", "backlinko.com"]},
]


@pytest.mark.asyncio
async def test_heatmap_requires_data(client, project):
    """Heatmap returns error when no SERP/AI data exists for the query."""
    resp = await client.get(f"/api/v1/heatmap/{project['id']}", params={"query": "no-data-query"})
    assert resp.status_code == 200
    assert resp.json()["success"] is False
    assert "No data found" in resp.json()["error"]


@pytest.mark.asyncio
async def test_heatmap_built_from_stored_data(client, project):
    # Seed SERP + AI data
    with patch("app.routers.serp.analyze_serp", new=AsyncMock(return_value=MOCK_SERP)):
        await client.post("/api/v1/serp/analyze", json={
            "project_id": project["id"], "query": "content marketing",
        })
    with patch("app.routers.ai_scan.scan_ai_engines", new=AsyncMock(return_value=MOCK_AI)):
        await client.post("/api/v1/ai-scan", json={
            "project_id": project["id"], "query": "content marketing",
            "engines": ["openai", "gemini", "perplexity"],
        })

    resp = await client.get(f"/api/v1/heatmap/{project['id']}", params={"query": "content marketing"})
    assert resp.status_code == 200
    data = resp.json()["data"]

    # Should have google + 3 AI channels
    assert len(data["channels"]) == 4
    channel_names = [c["channel"] for c in data["channels"]]
    assert "google" in channel_names
    assert "openai" in channel_names

    # Coverage scores should be 0.0–1.0
    for ch in data["channels"]:
        assert 0.0 <= ch["coverage_score"] <= 1.0

    # Overlap analysis should exist
    assert "overlap_analysis" in data
    assert "insight" in data


@pytest.mark.asyncio
async def test_heatmap_invalid_project(client):
    resp = await client.get("/api/v1/heatmap/bad-id", params={"query": "test"})
    assert resp.status_code == 404
