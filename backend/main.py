from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from services.event_bus import event_bus
from engines.algorithm.data_fetcher import runtime_data
from routers import engine, algorithm


@asynccontextmanager
async def lifespan(app: FastAPI):
    """M-02: Modern lifespan handler replacing deprecated @app.on_event."""
    # Startup
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
async def websocket_endpoint(websocket: WebSocket):
    await event_bus.connect(websocket)
    try:
        while True:
            # Keep alive — we don't expect messages from client on the event bus
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        event_bus.disconnect(websocket)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "online"}


app.include_router(engine.router, prefix="/api/v1/engine", tags=["engine"])
app.include_router(algorithm.router, prefix="/api/v1/algo", tags=["algorithm"])
