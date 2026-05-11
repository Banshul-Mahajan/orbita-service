from functools import lru_cache
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings

ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


def _to_async_database_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    return url


class Settings(BaseSettings):
    # Database — shared platform DB, discover schema
    database_url: str = "postgresql+asyncpg://orbita:orbita_dev@localhost:5432/orbita"
    async_database_url: str | None = None
    db_schema: str = "discover"

    # Redis
    redis_url: str = "redis://localhost:6379/1"

    # Auth (shared JWT secret)
    jwt_secret_key: str = "change-this-shared-dev-secret-minimum-32-chars"

    # LLM Keys
    openai_api_key: str = ""
    serpapi_key: str = ""

    # CORS — allow all component frontends
    cors_origins: str = (
        "http://localhost:5170,"
        "http://localhost:5172,"
        "http://localhost:5173"
        "http://localhost:5174"
        "http://localhost:5175"
        "http://localhost:5176"
        "http://localhost:5177"
        "http://localhost:5178"
        "http://localhost:5179"
        "http://localhost:5180"
        "http://localhost:5181"
    )

    # Inter-service URLs
    auth_service_url: str = "http://localhost:8000"
    knowledge_core_url: str = "http://localhost:8002"
    create_orbit_url: str = "http://localhost:8003"

    @model_validator(mode="after")
    def normalize_database_urls(self):
        if self.async_database_url:
            self.database_url = _to_async_database_url(self.async_database_url)
        else:
            self.database_url = _to_async_database_url(self.database_url)
        return self

    class Config:
        env_file = str(ROOT_ENV_FILE)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
