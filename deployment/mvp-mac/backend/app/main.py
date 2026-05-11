from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import create_tables
from app.routers import (
    ai_scan,
    competitors,
    content,
    heatmap,
    keywords,
    onboarding,
    questions,
    serp,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="DISCOVER ORBIT API",
    description="Research & Intelligence Hub — MVP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NOTE: projects router removed — projects now managed by Auth Service (port 8000)
PREFIX = "/api/v1"
app.include_router(onboarding.router, prefix=PREFIX)
app.include_router(keywords.router,  prefix=PREFIX)
app.include_router(serp.router,      prefix=PREFIX)
app.include_router(ai_scan.router,   prefix=PREFIX)
app.include_router(heatmap.router,   prefix=PREFIX)
app.include_router(questions.router, prefix=PREFIX)
app.include_router(competitors.router, prefix=PREFIX)
app.include_router(content.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "discover-orbit", "version": "0.1.0"}
