from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from .database import engine, Base
from .config import settings
from .services.embedding import setup_weaviate_collections

# Import all models so SQLAlchemy registers them before create_all
from .models import Entity, Fact, Source, AuthorProfile  # noqa: F401
from .routers import entities, facts, sources, factguard, authors, vectors


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create knowledge schema and tables on startup
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS knowledge"))
        await conn.run_sync(Base.metadata.create_all)
    try:
        setup_weaviate_collections()
    except Exception as exc:
        print(f"⚠️ Knowledge Core Weaviate setup skipped: {exc}")
    print("✅ Knowledge Core tables created / verified")
    yield


app = FastAPI(
    title="ORBITA Knowledge Core API",
    description="Brand Brain — Verified Facts, Citations & Author Profiles",
    version="1.0.0-mvp",
    lifespan=lifespan,
)

# CORS — allow component frontends
origins = settings.CORS_ORIGINS.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entities.router, prefix="/api")
app.include_router(facts.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(factguard.router, prefix="/api")
app.include_router(authors.router, prefix="/api")
app.include_router(vectors.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "knowledge-core", "version": "1.0.0-mvp"}
