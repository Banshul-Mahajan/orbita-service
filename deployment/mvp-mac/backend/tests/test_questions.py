import pytest
from unittest.mock import patch, AsyncMock

MOCK_QUESTIONS = [
    {"question_text": "What is content marketing?",        "source": "paa", "q_type": "what"},
    {"question_text": "How does content marketing work?",  "source": "paa", "q_type": "how"},
    {"question_text": "Why is content marketing important?","source": "ai",  "q_type": "why"},
    {"question_text": "When should I use content marketing?","source": "ai", "q_type": "when"},
    {"question_text": "Who uses content marketing?",       "source": "ai",  "q_type": "who"},
]


@pytest.mark.asyncio
async def test_mine_questions(client, project):
    with patch("app.routers.questions.mine_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        resp = await client.post("/api/v1/questions/mine", json={
            "project_id": project["id"],
            "topic": "content marketing",
        })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total"] == 5
    assert "what" in data["grouped"]
    assert "how" in data["grouped"]


@pytest.mark.asyncio
async def test_questions_grouped_by_type(client, project):
    with patch("app.routers.questions.mine_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        resp = await client.post("/api/v1/questions/mine", json={
            "project_id": project["id"],
            "topic": "content marketing",
        })
    grouped = resp.json()["data"]["grouped"]
    assert "What is content marketing?" in grouped["what"]
    assert "How does content marketing work?" in grouped["how"]


@pytest.mark.asyncio
async def test_questions_persisted_and_retrievable(client, project):
    with patch("app.routers.questions.mine_questions", new=AsyncMock(return_value=MOCK_QUESTIONS)):
        await client.post("/api/v1/questions/mine", json={
            "project_id": project["id"],
            "topic": "content marketing",
        })
    resp = await client.get(f"/api/v1/questions/{project['id']}", params={"topic": "content marketing"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["total"] == 5


@pytest.mark.asyncio
async def test_mine_invalid_project(client):
    resp = await client.post("/api/v1/questions/mine", json={
        "project_id": "bad-id",
        "topic": "test",
    })
    assert resp.status_code == 404
