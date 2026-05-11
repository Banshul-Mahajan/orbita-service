from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

ROOT_ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    # Database — shared platform DB, optimize schema
    DATABASE_URL: str = "postgresql://orbita:orbita_dev@localhost:5432/orbita"
    DB_SCHEMA: str = "optimize"

    # Auth (shared JWT secret)
    JWT_SECRET_KEY: str = "change-this-shared-dev-secret-minimum-32-chars"

    # Inter-service URLs
    KNOWLEDGE_CORE_URL: str = "http://localhost:8002"
    AUTH_SERVICE_URL: str = "http://localhost:8000"

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

    # LLM (for potential E-E-A-T enrichment)
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = str(ROOT_ENV_FILE)
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
