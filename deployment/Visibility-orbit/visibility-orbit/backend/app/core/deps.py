"""
ORBITA Visibility Orbit — Authentication Dependencies

Uses the shared JWT_SECRET_KEY for token validation.
Returns a lightweight user dataclass from JWT claims instead of DB User.
"""

from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.auth import decode_token

bearer = HTTPBearer()


@dataclass
class CurrentUser:
    """Lightweight user representation from JWT claims."""
    id: str
    org_id: str
    email: str
    roles: list


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> CurrentUser:
    """
    Validate JWT and return user claims.
    No database call needed — we trust the JWT signature.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return CurrentUser(
        id=user_id,
        org_id=payload.get("org_id", ""),
        email=payload.get("email", ""),
        roles=payload.get("roles", []),
    )
