import pytest


@pytest.mark.asyncio
async def test_create_project(client):
    resp = await client.post("/api/v1/projects", json={"name": "My Project", "description": "Test"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["name"] == "My Project"
    assert "id" in data["data"]


@pytest.mark.asyncio
async def test_list_projects(client, project):
    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 200
    projects = resp.json()["data"]
    assert isinstance(projects, list)
    ids = [p["id"] for p in projects]
    assert project["id"] in ids


@pytest.mark.asyncio
async def test_delete_project(client):
    # Create
    resp = await client.post("/api/v1/projects", json={"name": "To Delete"})
    pid = resp.json()["data"]["id"]
    # Delete
    del_resp = await client.delete(f"/api/v1/projects/{pid}")
    assert del_resp.status_code == 200
    assert del_resp.json()["data"]["deleted"] == pid


@pytest.mark.asyncio
async def test_delete_nonexistent_project(client):
    resp = await client.delete("/api/v1/projects/does-not-exist")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_project_missing_name(client):
    resp = await client.post("/api/v1/projects", json={})
    assert resp.status_code == 422
