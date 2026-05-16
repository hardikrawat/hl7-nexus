from contextlib import asynccontextmanager
from pathlib import Path
import os
import asyncio

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from services.event_bus import event_bus
from services.local_hl7_db import init_local_hl7_db
from engines.algorithm.data_fetcher import runtime_data
from routers import algorithm, audit, auth, chat, engine, local_db
from security import decode_access_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    """M-02: Modern lifespan handler replacing deprecated @app.on_event."""
    # Startup
    init_local_hl7_db()
    asyncio.create_task(runtime_data.fetch_data("hl7_tho"))
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(title="HL7_NEXUS API", lifespan=lifespan)

# H-03: Tightened CORS — still permissive for dev, but not wildcard-with-credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.websocket("/ws/eventbus")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(None, description="JWT from POST /api/v1/auth/login"),
):
    if not token or not token.strip():
        await websocket.close(code=1008)
        return
    try:
        username = decode_access_token(token.strip())
    except ValueError:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    await event_bus.connect(websocket)
    try:
        while True:
            # Keep alive — we do not expect meaningful messages from client
            await websocket.receive_text()
    except WebSocketDisconnect:
        event_bus.disconnect(websocket)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "online"}


app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])
app.include_router(engine.router, prefix="/api/v1/engine", tags=["engine"])
app.include_router(algorithm.router, prefix="/api/v1/algo", tags=["algorithm"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(local_db.router, prefix="/api/v1/local-db", tags=["local-db"])


FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parent / "frontend_dist"))
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        if full_path.startswith(("api/", "ws/")):
            raise HTTPException(status_code=404, detail="Not found")

        requested_file = FRONTEND_DIST / full_path
        if full_path and requested_file.is_file():
            return FileResponse(requested_file)

        return FileResponse(FRONTEND_DIST / "index.html")
