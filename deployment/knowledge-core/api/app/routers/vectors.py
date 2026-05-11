from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..config import settings
from ..core.platform import CurrentUser, get_brand_context, get_current_user
from ..services.embedding import (
    delete_document_chunks,
    query_document_chunks,
    upsert_document_chunks,
)

router = APIRouter(prefix="/vector", tags=["vector"])


class VectorDocumentIngestRequest(BaseModel):
    brand_id: str
    doc_id: str
    title: str
    content: str = Field(min_length=1)


class VectorDocumentQueryRequest(BaseModel):
    brand_id: str
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


async def _authorize_brand(
    request: Request,
    brand_id: str,
) -> None:
    current_user: CurrentUser | None = None
    service_token = request.headers.get("x-service-token")
    if service_token and service_token == settings.SERVICE_TOKEN:
        return

    current_user = await get_current_user(request)
    await get_brand_context(request, current_user, brand_id)


@router.post("/documents/ingest")
async def ingest_document(
    payload: VectorDocumentIngestRequest,
    request: Request,
):
    await _authorize_brand(request, payload.brand_id)
    chunk_count = await upsert_document_chunks(
        brand_id=payload.brand_id,
        doc_id=payload.doc_id,
        title=payload.title,
        content=payload.content,
    )
    return {"doc_id": payload.doc_id, "chunk_count": chunk_count}


@router.post("/documents/query")
async def query_documents(
    payload: VectorDocumentQueryRequest,
    request: Request,
):
    await _authorize_brand(request, payload.brand_id)
    results = await query_document_chunks(
        brand_id=payload.brand_id,
        query=payload.query,
        top_k=payload.top_k,
    )
    return results


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    brand_id: str,
    request: Request,
):
    await _authorize_brand(request, brand_id)
    deleted = delete_document_chunks(brand_id=brand_id, doc_id=doc_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Vector document not found")
    return {"doc_id": doc_id, "deleted_chunks": deleted}
