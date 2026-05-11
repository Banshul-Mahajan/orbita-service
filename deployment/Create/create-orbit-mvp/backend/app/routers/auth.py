"""
ORBITA Create Orbit — Auth Router

Register and login endpoints have been REMOVED.
Authentication is now handled by the Auth Service (port 8000).

Only /me endpoint remains for backward compatibility.
"""

from fastapi import APIRouter, Depends
from app.core.deps import get_current_user, CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """
    Return current user info from JWT claims.
    For full user profile, call Auth Service: GET http://localhost:8000/api/auth/me
    """
    return {
        "user_id": current_user.id,
        "org_id": current_user.org_id,
        "email": current_user.email,
        "roles": current_user.roles,
        "note": "For registration/login, use the Auth Service at http://localhost:8000",
    }
