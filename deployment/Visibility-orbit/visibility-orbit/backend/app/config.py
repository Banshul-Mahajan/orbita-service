from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

ROOT_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    # Database — shared platform DB, visibility schema
    DATABASE_URL: str = "postgresql://orbita:orbita_dev@localhost:5432/orbita"
    DB_SCHEMA: str = "visibility"

    # Auth (shared JWT secret — same across all services)
    JWT_SECRET_KEY: str = "change-this-shared-dev-secret-minimum-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # LLM
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Inter-service URLs
    AUTH_SERVICE_URL: str = "http://localhost:8000"
    KNOWLEDGE_CORE_URL: str = "http://localhost:8002"
    DISCOVER_SERVICE_URL: str = "http://localhost:8001"

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

    APP_ENV: str = "development"

    class Config:
        env_file = str(ROOT_ENV_FILE)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
