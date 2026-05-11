from dataclasses import dataclass
from typing import Any, Optional
import uuid

import httpx
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from ..config import settings


@dataclass
class CurrentUser:
    id: str
    org_id: str
    email: str
    roles: list[str]


@dataclass
class BrandContext:
    user: CurrentUser
    organization_id: str
    brand_id: str
    brand: dict[str, Any]


def normalize_uuid(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        return str(uuid.UUID(cleaned))
    except (ValueError, AttributeError, TypeError):
        return None


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


def decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None


def get_current_user(request: Request) -> CurrentUser:
    token = get_request_token(request)
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return CurrentUser(
        id=user_id,
        org_id=payload.get("org_id", ""),
        email=payload.get("email", ""),
        roles=payload.get("roles", []),
    )


async def _auth_service_json(
    request: Request,
    path: str,
    *,
    not_found_detail: str = "Resource not found",
) -> dict[str, Any]:
    token = get_request_token(request)
    url = f"{settings.AUTH_SERVICE_URL}{path}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "X-Service-Name": "knowledge-core",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Auth service request failed: {exc}",
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
            detail="Auth service is unavailable",
        )
    if response.status_code >= 400:
        detail = response.json().get("detail") if response.headers.get("content-type", "").startswith("application/json") else response.text
        raise HTTPException(status_code=response.status_code, detail=detail or "Request failed")

    return response.json()


async def get_brand_context(
    request: Request,
    current_user: CurrentUser,
    brand_id: Optional[str] = None,
    *,
    require_brand: bool = True,
) -> Optional[BrandContext]:
    resolved_brand_id = normalize_uuid(
        brand_id
        or request.headers.get("x-orbita-brand-id")
        or request.cookies.get("orbit_brand_id")
    )

    if not resolved_brand_id:
        if require_brand:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand context is missing. Select a brand and retry.",
            )
        return None

    brand = await _auth_service_json(
        request,
        f"/api/brands/{resolved_brand_id}",
        not_found_detail="Brand not found",
    )
    if brand.get("organization_id") != current_user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return BrandContext(
        user=current_user,
        organization_id=brand["organization_id"],
        brand_id=resolved_brand_id,
        brand=brand,
    )


def ensure_org_access(record: Any, current_user: CurrentUser) -> None:
    if getattr(record, "organization_id", None) != current_user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
