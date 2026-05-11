from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Request, status

from app.core.deps import CurrentUser


@dataclass
class PlatformContext:
    user_id: str
    organization_id: str
    brand_id: str
    project_id: Optional[str]


def _get_request_value(request: Request, header_name: str, cookie_name: str) -> Optional[str]:
    return request.headers.get(header_name) or request.cookies.get(cookie_name)


def get_platform_context(
    request: Request,
    current_user: CurrentUser,
    *,
    require_brand: bool = True,
) -> PlatformContext:
    organization_id = (
        current_user.org_id
        or _get_request_value(request, "x-orbita-org-id", "orbit_org_id")
    )
    brand_id = _get_request_value(request, "x-orbita-brand-id", "orbit_brand_id")
    project_id = _get_request_value(request, "x-orbita-project-id", "orbit_project_id")

    if not organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context is missing. Sign in again and retry.",
        )

    if require_brand and not brand_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand context is missing. Select a brand and retry.",
        )

    return PlatformContext(
        user_id=current_user.id,
        organization_id=organization_id,
        brand_id=brand_id or "",
        project_id=project_id,
    )
