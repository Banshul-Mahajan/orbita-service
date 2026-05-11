"""
ORBITA Create Orbit — Main Application

Runs on port 8003. Owns the 'create_orbit' schema:
tone_profiles, briefs, articles, claims, corpus_documents.

Auth is now handled by the Auth Service (port 8000).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_tables
from app.routers import auth, briefs, articles, corpus, factguard

# Create create_orbit schema tables on startup
create_tables()

app = FastAPI(
    title="CREATE ORBIT API",
    description="AI-Driven Content Studio — MVP",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow component frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") + [
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
# NOTE: auth router now only has /me — register/login moved to Auth Service
app.include_router(auth.router,      prefix="/api")
app.include_router(briefs.router,    prefix="/api")
app.include_router(articles.router,  prefix="/api")
app.include_router(corpus.router,    prefix="/api")
app.include_router(factguard.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "create-orbit", "version": "0.1.0"}


@app.get("/")
def root():
    return {"message": "CREATE ORBIT API", "docs": "/docs"}
