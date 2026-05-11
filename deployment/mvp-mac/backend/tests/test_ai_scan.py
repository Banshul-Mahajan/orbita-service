import pytest
from unittest.mock import patch, AsyncMock

MOCK_AI_RESULTS = [
    {
        "engine": "openai",
        "answer_text": "Content marketing is a strategic approach to creating valuable content. See: https://hubspot.com",
        "cited_urls": ["https://hubspot.com"],
        "cited_domains": ["hubspot.com"],
        "answer_length": 15,
    },
    {
        "engine": "gemini",
        "answer_text": "According to experts [source: https://moz.com], content marketing drives organic traffic.",
        "cited_urls": ["https://moz.com"],
        "cited_domains": ["moz.com"],
        "answer_length": 12,
    },
]


@pytest.mark.asyncio
async def test_ai_scan_success(client, project):
    with patch("app.routers.ai_scan.scan_ai_engines", new=AsyncMock(return_value=MOCK_AI_RESULTS)):
        resp = await client.post("/api/v1/ai-scan", json={
            "project_id": project["id"],
            "query": "content marketing",
            "engines": ["openai", "gemini"],
        })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["query"] == "content marketing"
    assert len(data["results"]) == 2
    engines = [r["engine"] for r in data["results"]]
    assert "openai" in engines
    assert "gemini" in engines


@pytest.mark.asyncio
async def test_ai_scan_cites_domains(client, project):
    with patch("app.routers.ai_scan.scan_ai_engines", new=AsyncMock(return_value=MOCK_AI_RESULTS)):
        resp = await client.post("/api/v1/ai-scan", json={
            "project_id": project["id"],
            "query": "content marketing",
            "engines": ["openai"],
        })
    results = resp.json()["data"]["results"]
    openai_result = next(r for r in results if r["engine"] == "openai")
    assert "hubspot.com" in openai_result["cited_domains"]


@pytest.mark.asyncio
async def test_ai_scan_get_stored(client, project):
    with patch("app.routers.ai_scan.scan_ai_engines", new=AsyncMock(return_value=MOCK_AI_RESULTS)):
        await client.post("/api/v1/ai-scan", json={
            "project_id": project["id"],
            "query": "content marketing",
            "engines": ["openai", "gemini"],
        })
    resp = await client.get(f"/api/v1/ai-scan/{project['id']}", params={"query": "content marketing"})
    assert resp.status_code == 200
    assert len(resp.json()["data"]["results"]) == 2


@pytest.mark.asyncio
async def test_ai_scan_invalid_project(client):
    resp = await client.post("/api/v1/ai-scan", json={
        "project_id": "bad-id",
        "query": "test",
        "engines": ["openai"],
    })
    assert resp.status_code == 404
