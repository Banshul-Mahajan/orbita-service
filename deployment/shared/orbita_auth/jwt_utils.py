"""
Stateless JWT token utilities for ORBITA platform.

Every service uses this module to decode and validate JWT tokens
issued by the Auth Service. No database call is needed — the service
trusts the JWT claims after verifying the signature.
"""

import os
from dataclasses import dataclass
from typing import Optional, List
from jose import JWTError, jwt


# Read from env — must be the same value across all services
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-shared-dev-secret-minimum-32-chars")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


@dataclass
class TokenPayload:
    """Decoded JWT claims available to every service."""
    user_id: str
    org_id: str
    email: str
    roles: List[str]

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles


def decode_token(token: str) -> Optional[TokenPayload]:
    """
    Decode and validate a JWT token.
    Returns TokenPayload on success, None on failure.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        org_id = payload.get("org_id", "")
        email = payload.get("email", "")
        roles = payload.get("roles", [])

        if not user_id:
            return None

        return TokenPayload(
            user_id=user_id,
            org_id=org_id,
            email=email,
            roles=roles if isinstance(roles, list) else [roles],
        )
    except JWTError:
        return None


def create_access_token(data: dict, expires_minutes: int = 1440) -> str:
    """
    Create a signed JWT token. Primarily used by the Auth Service,
    but available here for testing and service-to-service tokens.
    """
    from datetime import datetime, timedelta

    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
