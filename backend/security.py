"""JWT helpers for API and WebSocket authentication."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from config_auth import get_jwt_expire_minutes, get_jwt_secret

ALGORITHM = "HS256"


def create_access_token(subject_username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=get_jwt_expire_minutes()
    )
    payload = {"sub": subject_username, "exp": expire}
    return jwt.encode(payload, get_jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not isinstance(sub, str) or not sub.strip():
            raise ValueError("missing subject")
        return sub.strip()
    except JWTError as exc:
        raise ValueError("invalid token") from exc
