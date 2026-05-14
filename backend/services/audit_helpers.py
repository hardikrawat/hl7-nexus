"""Extract client metadata from FastAPI Request or WebSocket."""

from __future__ import annotations

from fastapi import Request
from starlette.websockets import WebSocket


def client_host_user_agent(source: Request | WebSocket) -> tuple[str | None, str | None]:
    client = source.client
    host = client.host if client else None
    ua = source.headers.get("user-agent")
    return host, ua
