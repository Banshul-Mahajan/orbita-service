from typing import Any, Optional

import httpx
from fastapi import HTTPException, Request, status

from app.config import get_settings
from app.core.deps import CurrentUser

settings = get_settings()


def get_request_token(request: Request) -> str:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()

    token = request.cookies.get("orbit_token")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )


def get_request_project_id(request: Request) -> Optional[str]:
    return request.headers.get("x-orbita-project-id") or request.cookies.get("orbit_project_id")


def _service_json(
    *,
    base_url: str,
    path: str,
    token: str,
    method: str = "GET",
    json: Optional[dict[str, Any]] = None,
    params: Optional[dict[str, Any]] = None,
    not_found_detail: str = "Resource not found",
) -> Any:
    url = f"{base_url}{path}"

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.request(
                method,
                url,
                json=json,
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Service-Name": "visibility-orbit",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Service request failed: {exc}",
        ) from exc

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream service is unavailable",
        )
    if response.status_code >= 400:
        detail = response.json().get("detail") if response.headers.get("content-type", "").startswith("application/json") else response.text
        raise HTTPException(status_code=response.status_code, detail=detail or "Request failed")

    if not response.content:
        return {}
    return response.json()


def auth_service_json(
    request: Request,
    path: str,
    *,
    method: str = "GET",
    json: Optional[dict[str, Any]] = None,
    params: Optional[dict[str, Any]] = None,
    not_found_detail: str = "Resource not found",
) -> Any:
    return _service_json(
        base_url=settings.AUTH_SERVICE_URL,
        path=path,
        token=get_request_token(request),
        method=method,
        json=json,
        params=params,
        not_found_detail=not_found_detail,
    )


def knowledge_core_json(
    request: Request,
    path: str,
    *,
    method: str = "GET",
    json: Optional[dict[str, Any]] = None,
    params: Optional[dict[str, Any]] = None,
    not_found_detail: str = "Resource not found",
) -> Any:
    return _service_json(
        base_url=settings.KNOWLEDGE_CORE_URL,
        path=path,
        token=get_request_token(request),
        method=method,
        json=json,
        params=params,
        not_found_detail=not_found_detail,
    )


def get_brand_or_404(request: Request, current_user: CurrentUser, brand_id: str) -> dict[str, Any]:
    brand = auth_service_json(
        request,
        f"/api/brands/{brand_id}",
        not_found_detail="Brand not found",
    )
    if brand.get("organization_id") != current_user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    return brand


def serialize_brand(brand: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": brand["id"],
        "name": brand["name"],
        "slug": brand["slug"],
        "industry": brand.get("industry"),
        "description": brand.get("description"),
        "website": brand.get("website_url"),
        "created_at": brand.get("created_at"),
    }


def serialize_fact(fact: dict[str, Any], brand_id: Optional[str] = None) -> dict[str, Any]:
    return {
        "id": fact["id"],
        "brand_id": brand_id or fact.get("brand_id"),
        "category": fact.get("category") or fact.get("attribute") or "general",
        "claim": fact.get("claim") or fact.get("value") or "",
        "source_url": fact.get("source_url"),
        "is_active": fact.get("is_active", True),
        "created_at": fact.get("created_at"),
    }
