"""
Runtime auth configuration without a database.

Set NEXUS_AUTH_USERS as comma-separated user:password pairs, for example:
  NEXUS_AUTH_USERS=alice:secret1,bob:secret2

If unset, a single default account is used (override via NEXUS_LOGIN_USERNAME /
NEXUS_LOGIN_PASSWORD). Change NEXUS_JWT_SECRET in any shared or production
deployment.
"""

import os
from functools import lru_cache


def _parse_user_map() -> dict[str, str]:
    raw = os.getenv("NEXUS_AUTH_USERS", "").strip()
    users: dict[str, str] = {}
    if raw:
        for segment in raw.split(","):
            segment = segment.strip()
            if not segment or ":" not in segment:
                continue
            username, password = segment.split(":", 1)
            username = username.strip()
            password = password.strip()
            if username:
                users[username] = password
    if not users:
        default_user = os.getenv("NEXUS_LOGIN_USERNAME", "admin").strip() or "admin"
        default_pass = os.getenv("NEXUS_LOGIN_PASSWORD", "admin").strip() or "admin"
        users[default_user] = default_pass
    return users


@lru_cache
def get_auth_users() -> dict[str, str]:
    return _parse_user_map()


def get_jwt_secret() -> str:
    return os.getenv(
        "NEXUS_JWT_SECRET",
        "hl7-nexus-dev-only-change-with-NEXUS_JWT_SECRET",
    )


def get_jwt_expire_minutes() -> int:
    return int(os.getenv("NEXUS_JWT_EXPIRE_MINUTES", "480"))


def verify_credentials(username: str, password: str) -> bool:
    users = get_auth_users()
    expected = users.get(username)
    return expected is not None and expected == password
