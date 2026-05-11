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
    # Database — shared platform DB, knowledge schema
    DATABASE_URL: str = "postgresql+asyncpg://orbita:orbita_dev@localhost:5432/orbita"
    ASYNC_DATABASE_URL: str | None = None
    DB_SCHEMA: str = "knowledge"

    # Weaviate
    WEAVIATE_URL: str = "http://localhost:8080"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/3"

    # Auth (shared JWT secret)
    JWT_SECRET_KEY: str = "change-this-shared-dev-secret-minimum-32-chars"

    # LLM
    OPENAI_API_KEY: str = ""
    SECRET_KEY: str = "dev-secret-key-change-in-prod"

    # Inter-service URLs
    AUTH_SERVICE_URL: str = "http://localhost:8000"
    SERVICE_TOKEN: str = "change-this-internal-service-token"

    @model_validator(mode="after")
    def normalize_database_urls(self):
        if self.ASYNC_DATABASE_URL:
            self.DATABASE_URL = _to_async_database_url(self.ASYNC_DATABASE_URL)
        else:
            self.DATABASE_URL = _to_async_database_url(self.DATABASE_URL)
        return self

    # CORS
    CORS_ORIGINS: str = (
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

    class Config:
        env_file = str(ROOT_ENV_FILE)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
