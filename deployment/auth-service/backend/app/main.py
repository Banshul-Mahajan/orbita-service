"""
ORBITA Auth Service — Main Application

Runs on port 8000. Owns the 'core' schema:
organizations, users, organization_members, brands, projects.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.routers import auth, organizations, brands, projects

# Create core schema tables on startup (safe for MVP)
create_tables()

app = FastAPI(
    title="ORBITA Auth Service",
    description="Centralized Authentication, Organizations, Brands & Projects",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow all component frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(brands.router, prefix="/api")
app.include_router(projects.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "auth-service", "version": "0.1.0"}


@app.get("/")
def root():
    return {"message": "ORBITA Auth Service", "docs": "/docs"}
