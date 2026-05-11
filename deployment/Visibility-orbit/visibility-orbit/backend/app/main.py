"""
ORBITA Visibility Orbit — Main Application

Runs on port 8005. Owns the 'visibility' schema:
probe_prompts, probe_runs, alerts.

Auth is now handled by the Auth Service (port 8000).
Organizations, Users, Brands moved to Auth Service.
Knowledge facts moved to Knowledge Core.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import create_tables
from app.routers import auth, brands, probes, alerts

settings = get_settings()

app = FastAPI(
    title="Visibility Orbit API",
    description="GEO & Search Tracking Engine",
    version="1.0.0",
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


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/health")
def health():
    return {"status": "ok", "service": "visibility-orbit", "version": "1.0.0"}


# Routers
# NOTE: auth router now only has /me — register/login moved to Auth Service
app.include_router(auth.router, prefix="/api/v1")
app.include_router(brands.router, prefix="/api/v1")
app.include_router(probes.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
