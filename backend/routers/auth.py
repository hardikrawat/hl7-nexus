from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from config_auth import verify_credentials
from deps import get_current_username
from security import create_access_token
from services.audit_helpers import client_host_user_agent
from services.audit_log import append_audit

router = APIRouter()


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=128)
    password: str = Field(..., min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request):
    host, ua = client_host_user_agent(request)
    if not verify_credentials(body.username, body.password):
        await append_audit(
            body.username,
            "LOGIN_FAILED",
            "invalid username or password",
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(body.username)
    await append_audit(
        body.username,
        "LOGIN_SUCCESS",
        "",
        outcome="success",
        client_host=host,
        user_agent=ua,
    )
    return TokenResponse(access_token=token, username=body.username)


@router.post("/logout")
async def logout(request: Request, username: str = Depends(get_current_username)):
    host, ua = client_host_user_agent(request)
    await append_audit(
        username,
        "LOGOUT",
        "",
        outcome="success",
        client_host=host,
        user_agent=ua,
    )
    return {"ok": True}


@router.get("/me")
async def me(username: str = Depends(get_current_username)):
    return {"username": username}
