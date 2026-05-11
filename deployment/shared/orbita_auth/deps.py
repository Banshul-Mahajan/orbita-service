"""
FastAPI dependencies for ORBITA shared authentication.

Usage in any service router:

    from orbita_auth import require_auth, TokenPayload

    @router.get("/protected")
    def protected_route(token: TokenPayload = Depends(require_auth)):
        print(token.user_id, token.org_id)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from orbita_auth.jwt_utils import decode_token, TokenPayload

_bearer_scheme = HTTPBearer()


def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> TokenPayload:
    """
    FastAPI dependency that extracts and validates the JWT from the
    Authorization header. Returns a TokenPayload with user_id, org_id, etc.

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
