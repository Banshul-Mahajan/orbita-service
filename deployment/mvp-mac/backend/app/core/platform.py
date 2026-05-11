from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import HTTPException, Request, status
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


@dataclass
class CurrentUser:
    id: str
    org_id: str
    email: str
    roles: list[str]


@dataclass
class ProjectContext:
    user: CurrentUser
    project_id: str
    organization_id: str
    brand_id: str
    project: dict[str, Any]
    brand: dict[str, Any]


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
        return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
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
    method: str = "GET",
    json: Optional[dict[str, Any]] = None,
    not_found_detail: str = "Resource not found",
) -> dict[str, Any]:
    token = get_request_token(request)
    url = f"{settings.auth_service_url}{path}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.request(
                method,
                url,
                json=json,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Service-Name": "discover-orbit",
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


async def get_project_context(
    request: Request,
    project_id: str,
    current_user: CurrentUser,
) -> ProjectContext:
    cookie_project_id = request.headers.get("x-orbita-project-id") or request.cookies.get("orbit_project_id")
    if cookie_project_id and cookie_project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project context mismatch. Refresh and retry.",
        )

    project = await _auth_service_json(
        request,
        f"/api/projects/{project_id}",
        not_found_detail="Project not found",
    )
    if project.get("organization_id") != current_user.org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    brand = await _auth_service_json(
        request,
        f"/api/brands/{project['brand_id']}",
        not_found_detail="Brand not found",
    )

    return ProjectContext(
        user=current_user,
        project_id=project_id,
        organization_id=project["organization_id"],
        brand_id=project["brand_id"],
        project=project,
        brand=brand,
    )


async def update_brand_profile(
    request: Request,
    brand_id: str,
    **fields: Any,
) -> dict[str, Any]:
    payload = {key: value for key, value in fields.items() if value is not None}
    if not payload:
        return await _auth_service_json(
            request,
            f"/api/brands/{brand_id}",
            not_found_detail="Brand not found",
        )

    return await _auth_service_json(
        request,
        f"/api/brands/{brand_id}",
        method="PUT",
        json=payload,
        not_found_detail="Brand not found",
    )


async def update_project_profile(
    request: Request,
    project_id: str,
    **fields: Any,
) -> dict[str, Any]:
    payload = {key: value for key, value in fields.items() if value is not None}
    if not payload:
        return await _auth_service_json(
            request,
            f"/api/projects/{project_id}",
            not_found_detail="Project not found",
        )

    return await _auth_service_json(
        request,
        f"/api/projects/{project_id}",
        method="PUT",
        json=payload,
        not_found_detail="Project not found",
    )


def project_scope_filters(model: Any, context: ProjectContext) -> list[Any]:
    return [
        model.organization_id == context.organization_id,
        model.brand_id == context.brand_id,
        model.project_id == context.project_id,
    ]
