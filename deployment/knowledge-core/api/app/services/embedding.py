"""
Shared Weaviate helpers for Knowledge Core.

Knowledge Core is the platform's vector gateway:
- facts are indexed here for semantic FactGuard
- brand corpus chunks are indexed here for Create Orbit RAG
"""
from __future__ import annotations

import hashlib
import math
import re
import uuid
from typing import Any
from urllib.parse import urlparse

import weaviate
import weaviate.classes as wvc
from openai import AsyncOpenAI

from ..config import settings

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

FACT_COLLECTION = "KnowledgeFact"
DOCUMENT_COLLECTION = "BrandDocumentChunk"


def _weaviate_host() -> str:
    parsed = urlparse(settings.WEAVIATE_URL)
    return parsed.hostname or "localhost"


def _weaviate_port() -> int:
    parsed = urlparse(settings.WEAVIATE_URL)
    return parsed.port or 8080


def get_weaviate_client():
    return weaviate.connect_to_local(
        host=_weaviate_host(),
        port=_weaviate_port(),
        grpc_port=50051,
    )


async def get_embedding(text: str) -> list[float]:
    if not settings.OPENAI_API_KEY:
        return _local_embed_text(text)

    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not settings.OPENAI_API_KEY:
        return [_local_embed_text(text) for text in texts]

    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]


def _local_embed_text(text: str, dim: int = 256) -> list[float]:
    vector = [0.0] * dim
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        index = int(digest[:8], 16) % dim
        vector[index] += 1.0

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    step = max(1, chunk_size - chunk_overlap)
    for start in range(0, len(words), step):
        chunk_words = words[start : start + chunk_size]
        if not chunk_words:
            continue
        chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break
    return chunks


def setup_weaviate_collections() -> None:
    client = get_weaviate_client()
    try:
        existing = set(client.collections.list_all().keys())

        if FACT_COLLECTION not in existing:
            client.collections.create(
                name=FACT_COLLECTION,
                vectorizer_config=wvc.config.Configure.Vectorizer.none(),
                properties=[
                    wvc.config.Property(name="fact_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="entity_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="brand_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="text", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="confidence", data_type=wvc.config.DataType.NUMBER),
                    wvc.config.Property(name="attribute", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="value", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="source_url", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="is_verified", data_type=wvc.config.DataType.BOOL),
                ],
            )

        if DOCUMENT_COLLECTION not in existing:
            client.collections.create(
                name=DOCUMENT_COLLECTION,
                vectorizer_config=wvc.config.Configure.Vectorizer.none(),
                properties=[
                    wvc.config.Property(name="brand_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="doc_id", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="title", data_type=wvc.config.DataType.TEXT),
                    wvc.config.Property(name="chunk_index", data_type=wvc.config.DataType.INT),
                    wvc.config.Property(name="text", data_type=wvc.config.DataType.TEXT),
                ],
            )
    finally:
        client.close()


def _deterministic_uuid(seed: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, seed)


async def upsert_fact(
    *,
    fact_id: str,
    entity_id: str,
    entity_name: str,
    attribute: str,
    value: str,
    brand_id: str,
    confidence: float,
    source_url: str | None = None,
    is_verified: bool = True,
) -> None:
    text = f"{entity_name} {attribute} is {value}".strip()
    vector = await get_embedding(text)
    client = get_weaviate_client()
    try:
        collection = client.collections.get(FACT_COLLECTION)
        object_uuid = _deterministic_uuid(f"fact:{fact_id}")
        collection.data.delete_by_id(object_uuid)
        collection.data.insert(
            uuid=object_uuid,
            properties={
                "fact_id": fact_id,
                "entity_id": entity_id,
                "brand_id": brand_id,
                "text": text,
                "attribute": attribute,
                "value": value,
                "confidence": confidence,
                "source_url": source_url or "",
                "is_verified": is_verified,
            },
            vector=vector,
        )
    finally:
        client.close()


def delete_fact(fact_id: str) -> None:
    client = get_weaviate_client()
    try:
        client.collections.get(FACT_COLLECTION).data.delete_by_id(
            _deterministic_uuid(f"fact:{fact_id}")
        )
    finally:
        client.close()


async def search_facts_semantic(claim: str, brand_id: str, limit: int = 5) -> list[dict[str, Any]]:
    vector = await get_embedding(claim)
    client = get_weaviate_client()
    try:
        collection = client.collections.get(FACT_COLLECTION)
        results = collection.query.near_vector(
            near_vector=vector,
            limit=limit,
            filters=wvc.query.Filter.by_property("brand_id").equal(brand_id),
            return_metadata=wvc.query.MetadataQuery(distance=True),
        )
        matches: list[dict[str, Any]] = []
        for obj in results.objects:
            props = obj.properties
            matches.append({
                "id": props.get("fact_id"),
                "entity_id": props.get("entity_id"),
                "attribute": props.get("attribute"),
                "value": props.get("value"),
                "confidence": props.get("confidence", 0.0),
                "is_verified": props.get("is_verified", False),
                "source_url": props.get("source_url"),
                "semantic_distance": getattr(obj.metadata, "distance", None),
            })
        return matches
    finally:
        client.close()


async def upsert_document_chunks(
    *,
    brand_id: str,
    doc_id: str,
    title: str,
    content: str,
) -> int:
    chunks = chunk_text(content)
    if not chunks:
        return 0

    vectors = await get_embeddings(chunks)
    client = get_weaviate_client()
    try:
        collection = client.collections.get(DOCUMENT_COLLECTION)
        collection.data.delete_many(
            where=(
                wvc.query.Filter.by_property("brand_id").equal(brand_id)
                & wvc.query.Filter.by_property("doc_id").equal(doc_id)
            )
        )
        for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
            collection.data.insert(
                uuid=_deterministic_uuid(f"doc:{doc_id}:{index}"),
                properties={
                    "brand_id": brand_id,
                    "doc_id": doc_id,
                    "title": title,
                    "chunk_index": index,
                    "text": chunk,
                },
                vector=vector,
            )
        return len(chunks)
    finally:
        client.close()


async def query_document_chunks(
    *,
    brand_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    vector = await get_embedding(query)
    client = get_weaviate_client()
    try:
        collection = client.collections.get(DOCUMENT_COLLECTION)
        results = collection.query.near_vector(
            near_vector=vector,
            limit=top_k,
            filters=wvc.query.Filter.by_property("brand_id").equal(brand_id),
            return_metadata=wvc.query.MetadataQuery(distance=True),
        )
        output: list[dict[str, Any]] = []
        for obj in results.objects:
            props = obj.properties
            distance = getattr(obj.metadata, "distance", None)
            score = round(max(0.0, 1 - ((distance or 0.0) / 2)), 3)
            output.append({
                "chunk": props.get("text", ""),
                "source_title": props.get("title", "Unknown"),
                "doc_id": props.get("doc_id", ""),
                "relevance_score": score,
                "chunk_index": props.get("chunk_index", 0),
            })
        return output
    finally:
        client.close()


def delete_document_chunks(*, brand_id: str, doc_id: str) -> int:
    client = get_weaviate_client()
    try:
        result = client.collections.get(DOCUMENT_COLLECTION).data.delete_many(
            where=(
                wvc.query.Filter.by_property("brand_id").equal(brand_id)
                & wvc.query.Filter.by_property("doc_id").equal(doc_id)
            ),
            verbose=True,
        )
        return getattr(result, "matches", 0) or 0
    finally:
        client.close()
