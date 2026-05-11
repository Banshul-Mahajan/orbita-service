"""
RAG service backed by Knowledge Core + Weaviate.

Create Orbit no longer maintains its own local vector store. Brand corpus
chunks are indexed and queried through Knowledge Core's shared vector API.
"""
from __future__ import annotations

from typing import Dict, List

import httpx

from app.config import settings


VECTOR_BASE_URL = f"{settings.KNOWLEDGE_CORE_URL}/api/vector"


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Service-Token": settings.SERVICE_TOKEN,
    }


def ingest_document(
    scope_id: str,
    doc_id: str,
    title: str,
    content: str,
) -> int:
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            f"{VECTOR_BASE_URL}/documents/ingest",
            json={
                "brand_id": scope_id,
                "doc_id": doc_id,
                "title": title,
                "content": content,
            },
            headers=_headers(),
        )
        response.raise_for_status()
        return int(response.json().get("chunk_count", 0))


def retrieve_context(
    scope_id: str,
    query: str,
    top_k: int = 5,
) -> List[Dict]:
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{VECTOR_BASE_URL}/documents/query",
            json={
                "brand_id": scope_id,
                "query": query,
                "top_k": top_k,
            },
            headers=_headers(),
        )
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, list) else []


def delete_document_chunks(scope_id: str, doc_id: str) -> int:
    with httpx.Client(timeout=30.0) as client:
        response = client.delete(
            f"{VECTOR_BASE_URL}/documents/{doc_id}",
            params={"brand_id": scope_id},
            headers=_headers(),
        )
        if response.status_code == 404:
            return 0
        response.raise_for_status()
        return int(response.json().get("deleted_chunks", 0))
