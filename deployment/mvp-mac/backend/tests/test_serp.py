import pytest
from unittest.mock import patch, AsyncMock

MOCK_SERP = [
    {
        "position": 1,
        "title": "The Ultimate Guide to Content Marketing",
        "url": "https://hubspot.com/content-marketing",
        "domain": "hubspot.com",
        "snippet": "Everything you need to know about content marketing.",
        "headings": [{"level": "h1", "text": "Content Marketing Guide"}],
        "entities": ["Content Marketing", "SEO", "Google"],
        "word_count": 2500,
        "readability": 65.0,
    },
    {
        "position": 2,
        "title": "Content Marketing Strategy 2024",
        "url": "https://semrush.com/content-marketing",
        "domain": "semrush.com",
        "snippet": "Build a winning content strategy.",
        "headings": [{"level": "h1", "text": "Strategy Guide"}],
        "entities": ["Strategy", "Marketing"],
        "word_count": 1800,
        "readability": 58.0,
    },
]


@pytest.mark.asyncio
async def test_serp_analyze_success(client, project):
    with patch("app.routers.serp.analyze_serp", new=AsyncMock(return_value=MOCK_SERP)):
        resp = await client.post("/api/v1/serp/analyze", json={
            "project_id": project["id"],
            "query": "content marketing",
            "num_results": 10,
        })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["query"] == "content marketing"
    assert len(data["results"]) == 2
    assert data["results"][0]["domain"] == "hubspot.com"


@pytest.mark.asyncio
async def test_serp_analyze_invalid_project(client):
    with patch("app.routers.serp.analyze_serp", new=AsyncMock(return_value=MOCK_SERP)):
        resp = await client.post("/api/v1/serp/analyze", json={
            "project_id": "bad-id",
            "query": "test",
        })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_serp_get_stored_results(client, project):
    with patch("app.routers.serp.analyze_serp", new=AsyncMock(return_value=MOCK_SERP)):
        await client.post("/api/v1/serp/analyze", json={
            "project_id": project["id"],
            "query": "content marketing",
        })

    resp = await client.get(f"/api/v1/serp/{project['id']}", params={"query": "content marketing"})
    assert resp.status_code == 200
    results = resp.json()["data"]["results"]
    assert len(results) == 2
    assert results[0]["position"] == 1


@pytest.mark.asyncio
async def test_serp_empty_for_unknown_query(client, project):
    resp = await client.get(f"/api/v1/serp/{project['id']}", params={"query": "nonexistent query xyz"})
    assert resp.status_code == 200
    assert resp.json()["data"]["results"] == []
