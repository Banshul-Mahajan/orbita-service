import pytest
from unittest.mock import patch, AsyncMock


MOCK_EXPAND_RESULT = {
    "seed_keyword": "content marketing",
    "total_keywords": 10,
    "clusters": [
        {
            "cluster_id": 0,
            "cluster_name": "content marketing",
            "intent": "informational",
            "keywords": [
                {"keyword": "content marketing", "intent": "informational", "volume": 1000, "difficulty": 45.0},
                {"keyword": "how to content marketing", "intent": "informational", "volume": 500, "difficulty": 40.0},
            ],
        },
        {
            "cluster_id": 1,
            "cluster_name": "best content marketing",
            "intent": "commercial",
            "keywords": [
                {"keyword": "best content marketing tools", "intent": "commercial", "volume": 300, "difficulty": 35.0},
            ],
        },
    ],
}


@pytest.mark.asyncio
async def test_keyword_expand_success(client, project):
    with patch("app.routers.keywords.expand_keywords", new=AsyncMock(return_value=MOCK_EXPAND_RESULT)):
        resp = await client.post("/api/v1/keywords/expand", json={
            "project_id": project["id"],
            "seed_keyword": "content marketing",
            "limit": 50,
        })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["seed_keyword"] == "content marketing"
    assert len(data["clusters"]) == 2
    assert data["total_keywords"] == 10


@pytest.mark.asyncio
async def test_keyword_expand_invalid_project(client):
    with patch("app.routers.keywords.expand_keywords", new=AsyncMock(return_value=MOCK_EXPAND_RESULT)):
        resp = await client.post("/api/v1/keywords/expand", json={
            "project_id": "nonexistent-id",
            "seed_keyword": "test",
        })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_keywords_empty(client, project):
    resp = await client.get(f"/api/v1/keywords/{project['id']}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["clusters"] == []
    assert data["total_keywords"] == 0


@pytest.mark.asyncio
async def test_keyword_expand_persists(client, project):
    """Keywords should be stored and retrievable."""
    with patch("app.routers.keywords.expand_keywords", new=AsyncMock(return_value=MOCK_EXPAND_RESULT)):
        await client.post("/api/v1/keywords/expand", json={
            "project_id": project["id"],
            "seed_keyword": "content marketing",
            "limit": 50,
        })

    resp = await client.get(f"/api/v1/keywords/{project['id']}")
    data = resp.json()["data"]
    assert data["total_keywords"] == 3   # 2 + 1 from mock clusters
    assert len(data["clusters"]) == 2
