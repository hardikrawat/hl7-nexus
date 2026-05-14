from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from security import decode_access_token

security = HTTPBearer()


async def get_current_username(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        return decode_access_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        ) from None
