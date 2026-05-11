from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import httpx
import logging

from app.database import get_db
from app.models import CorpusDocument, CorpusStatus
from app.schemas import CorpusDocCreate, CorpusDocOut, CorpusQueryRequest, CorpusQueryResult
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_platform_context
from app.services import rag_service

router = APIRouter(prefix="/corpus", tags=["corpus"])
logger = logging.getLogger(__name__)


@router.post("/ingest/text", response_model=CorpusDocOut, status_code=201)
def ingest_text(
    payload: CorpusDocCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Ingest a plain-text document into the corpus."""
    if not payload.content or len(payload.content.strip()) < 50:
        raise HTTPException(400, "Content must be at least 50 characters")

    context = get_platform_context(request, current_user)

    # Create DB record
    doc = CorpusDocument(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        user_id=current_user.id,
        title=payload.title,
        source_type="text",
        content=payload.content,
        status=CorpusStatus.indexing,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Run ingestion (sync for MVP — no Celery)
    try:
        chunk_count = rag_service.ingest_document(
            scope_id=context.brand_id,
            doc_id=doc.id,
            title=doc.title,
            content=payload.content,
        )
        doc.chunk_count = chunk_count
        doc.status = CorpusStatus.indexed
        doc.indexed_at = datetime.utcnow()
    except Exception as e:
        logger.error(f"Ingestion failed for doc {doc.id}: {e}")
        doc.status = CorpusStatus.failed
        doc.error_message = str(e)

    db.commit()
    db.refresh(doc)
    return doc


@router.post("/ingest/url", response_model=CorpusDocOut, status_code=201)
async def ingest_url(
    payload: CorpusDocCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Fetch a URL and ingest its text content."""
    if not payload.source_url:
        raise HTTPException(400, "source_url is required")

    context = get_platform_context(request, current_user)

    # Fetch the URL content
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(payload.source_url)
            response.raise_for_status()
            raw_html = response.text
    except Exception as e:
        raise HTTPException(400, f"Failed to fetch URL: {e}")

    # Simple HTML stripping — good enough for MVP
    import re
    # Remove script and style tags
    clean = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', '', raw_html, flags=re.DOTALL)
    # Remove all HTML tags
    clean = re.sub(r'<[^>]+>', ' ', clean)
    # Collapse whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()

    if len(clean) < 50:
        raise HTTPException(400, "Could not extract meaningful text from URL")

    doc = CorpusDocument(
        organization_id=context.organization_id,
        brand_id=context.brand_id,
        user_id=current_user.id,
        title=payload.title,
        source_type="url",
        content=clean[:50000],  # cap at 50k chars for MVP
        source_url=payload.source_url,
        status=CorpusStatus.indexing,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        chunk_count = rag_service.ingest_document(
            scope_id=context.brand_id,
            doc_id=doc.id,
            title=doc.title,
            content=clean[:50000],
        )
        doc.chunk_count = chunk_count
        doc.status = CorpusStatus.indexed
        doc.indexed_at = datetime.utcnow()
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        doc.status = CorpusStatus.failed
        doc.error_message = str(e)

    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=List[CorpusDocOut])
def list_documents(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    return _scoped_documents_query(db, context).order_by(CorpusDocument.created_at.desc()).all()


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)

    doc = _scoped_documents_query(db, context).filter(CorpusDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete from ChromaDB
    try:
        rag_service.delete_document_chunks(context.brand_id, doc_id)
    except Exception as e:
        logger.warning(f"ChromaDB delete failed: {e}")

    db.delete(doc)
    db.commit()


@router.post("/query", response_model=List[CorpusQueryResult])
def query_corpus(
    payload: CorpusQueryRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Test RAG retrieval — useful for debugging corpus quality."""
    context = get_platform_context(request, current_user)
    results = rag_service.retrieve_context(
        scope_id=context.brand_id,
        query=payload.query,
        top_k=payload.top_k,
    )
    return [CorpusQueryResult(**r) for r in results]


@router.get("/stats")
def corpus_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = get_platform_context(request, current_user)
    docs = _scoped_documents_query(db, context).all()
    total_chunks = sum(d.chunk_count for d in docs if d.status == CorpusStatus.indexed)
    return {
        "total_documents": len(docs),
        "indexed_documents": sum(1 for d in docs if d.status == CorpusStatus.indexed),
        "total_chunks": total_chunks,
        "failed_documents": sum(1 for d in docs if d.status == CorpusStatus.failed),
    }


def _scoped_documents_query(db: Session, context):
    query = db.query(CorpusDocument).filter(
        CorpusDocument.organization_id == context.organization_id,
        CorpusDocument.brand_id == context.brand_id,
    )
    project_id = getattr(context, "project_id", None)
    if project_id and hasattr(CorpusDocument, "project_id"):
        query = query.filter(
            or_(CorpusDocument.project_id == project_id, CorpusDocument.project_id.is_(None))
        )
    return query
