"""
In-memory audit trail (no database). Entries are capped to avoid unbounded RAM.

Only user-meaningful actions should be appended (HL7/API/auth). Listing defaults
to the same set so the audit UI stays focused on what people did in the app.
"""

from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timezone
from itertools import count
from typing import Any

_MAX_ENTRIES = 10_000
_lock = asyncio.Lock()
_entries: deque[dict[str, Any]] = deque(maxlen=_MAX_ENTRIES)
_id_seq = count(1)

# Actions shown by default in GET /api/v1/audit (user-facing work + account).
USER_RELEVANT_ACTIONS: frozenset[str] = frozenset(
    {
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "LOGOUT",
        "ALGO_PROCESS",
        "ALGO_GENERATE",
        "ENGINE_NL_PARSE",
        "ENGINE_GEMINI_MODELS",
        "ENGINE_GATEWAY_MODELS",
        "ENGINE_STATUS",
        "ENGINE_AI_PROCESS",
        "CHAT_MESSAGE",
    }
)


async def append_audit(
    username: str,
    action: str,
    detail: str = "",
    *,
    outcome: str = "success",
    client_host: str | None = None,
    user_agent: str | None = None,
) -> None:
    async with _lock:
        record = {
            "id": next(_id_seq),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "username": username,
            "action": action,
            "detail": (detail or "")[:2000],
            "ip": client_host or "",
            "user_agent": (user_agent or "")[:500],
            "outcome": outcome,
        }
        _entries.append(record)


async def list_audits(
    skip: int = 0,
    limit: int = 100,
    *,
    user_relevant_only: bool = True,
) -> tuple[list[dict[str, Any]], int]:
    limit = min(max(limit, 1), 500)
    skip = max(skip, 0)
    async with _lock:
        snapshot = list(_entries)
    if user_relevant_only:
        snapshot = [r for r in snapshot if r.get("action") in USER_RELEVANT_ACTIONS]
    total = len(snapshot)
    snapshot.reverse()
    page = snapshot[skip : skip + limit]
    return page, total
