"""
Shared test fixtures.
Uses an in-memory SQLite-compatible approach via SQLAlchemy with
a real async PostgreSQL test DB spun up via docker-compose.
For unit tests we mock external API calls so no real keys are needed.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from unittest.mock import AsyncMock, patch

from app.main import app
from app.database import Base, get_db
from app.config import get_settings

settings = get_settings()

# ── Test database ─────────────────────────────────────────────────────────────
TEST_DB_URL = "postgresql+asyncpg://orbit:orbit123@localhost:5432/discover_orbit_test"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    """Create all tables once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    """Fresh session per test, rolled back after."""
    async with TestSession() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """FastAPI test client with DB override."""
    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def project(client):
    """Create and return a test project."""
    resp = await client.post("/api/v1/projects", json={"name": "Test Project"})
    return resp.json()["data"]
