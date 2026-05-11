"""
HTTP client for inter-service communication within the ORBITA platform.

Usage:
    from orbita_auth import ServiceClient

    kc_client = ServiceClient(base_url="http://localhost:8002", service_name="create-orbit")
    facts = await kc_client.get("/api/facts", params={"brand_id": brand_id})
"""

import os
from typing import Optional, Any
import httpx


SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "change-this-internal-service-token")


class ServiceClient:
    """
    Async HTTP client for calling other ORBITA services.
    Automatically adds service-to-service auth headers.
    """

    def __init__(self, base_url: str, service_name: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.service_name = service_name
        self.timeout = timeout

    def _headers(self, user_token: Optional[str] = None) -> dict:
        """Build request headers with service auth and optional user context."""
        headers = {
            "X-Service-Name": self.service_name,
            "X-Service-Token": SERVICE_TOKEN,
            "Content-Type": "application/json",
        }
        if user_token:
            headers["Authorization"] = f"Bearer {user_token}"
        return headers

    async def get(
        self,
        path: str,
        params: Optional[dict] = None,
        user_token: Optional[str] = None,
    ) -> Any:
        """Send a GET request to the target service."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.base_url}{path}",
                params=params,
                headers=self._headers(user_token),
            )
            response.raise_for_status()
            return response.json()

    async def post(
        self,
        path: str,
        json: Optional[dict] = None,
        user_token: Optional[str] = None,
    ) -> Any:
        """Send a POST request to the target service."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}{path}",
                json=json,
                headers=self._headers(user_token),
            )
            response.raise_for_status()
            return response.json()

    async def put(
        self,
        path: str,
        json: Optional[dict] = None,
        user_token: Optional[str] = None,
    ) -> Any:
        """Send a PUT request to the target service."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.put(
                f"{self.base_url}{path}",
                json=json,
                headers=self._headers(user_token),
            )
            response.raise_for_status()
            return response.json()

    async def delete(
        self,
        path: str,
        user_token: Optional[str] = None,
    ) -> Any:
        """Send a DELETE request to the target service."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.delete(
                f"{self.base_url}{path}",
                headers=self._headers(user_token),
            )
            response.raise_for_status()
            return response.json()
