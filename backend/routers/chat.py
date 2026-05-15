import json
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from deps import get_current_username
from engines.gemini_ai import GeminiProvider
from engines.local_ai import OllamaProvider
from services.audit_helpers import client_host_user_agent
from services.audit_log import append_audit
from services.event_bus import event_bus

router = APIRouter()

MAX_CHAT_MESSAGE_LENGTH = 20_000
MAX_HISTORY_ITEMS = 12


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_CHAT_MESSAGE_LENGTH)


class ChatRequest(BaseModel):
    engine_mode: Literal["cloud_ai", "local_ai", "algorithm"]
    model: Optional[str] = ""
    api_key: str = ""
    ollama_url: str = "http://localhost:11434"
    message: str = Field(min_length=1, max_length=MAX_CHAT_MESSAGE_LENGTH)
    history: List[ChatMessage] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)
    context: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be empty")
        return value


def get_chat_provider(req: ChatRequest):
    if req.engine_mode == "cloud_ai":
        return GeminiProvider(api_key=req.api_key), req.model or "gemini-1.5-flash"

    if req.engine_mode == "local_ai":
        return OllamaProvider(base_url=req.ollama_url), req.model or "llama3"

    raise ValueError("Assistant chat requires AI Engine. Select Gemini Cloud or Ollama Local.")


def build_chat_prompt(req: ChatRequest) -> str:
    history = "\n".join(
        f"{item.role.upper()}: {item.content.strip()}"
        for item in req.history[-MAX_HISTORY_ITEMS:]
        if item.content.strip()
    )
    context_json = json.dumps(req.context or {}, indent=2, default=str)[:12_000]

    return f"""Current application context:
{context_json}

Recent conversation:
{history or "No previous assistant messages in this session."}

User request:
{req.message.strip()}"""


CHAT_SYSTEM_PROMPT = """You are Helix Assistant, the embedded expert assistant for an HL7/FHIR orchestration app.
Help healthcare integration engineers work with HL7 v2.x, FHIR R4, validation results, message generation, parsing, diffing, and batch workflows.
Use the supplied UI context when it is relevant, especially the active workflow and focused field.
Be concise, technical, and practical. Do not claim that you changed application state unless the user explicitly applies your answer in the UI.
When asked to rewrite or fix a focused field, return only the replacement value unless the user asks for explanation.
If context is insufficient, state the assumption and give the most useful next step."""


@router.post("/message")
async def chat_message(
    req: ChatRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        provider, model = get_chat_provider(req)
        await event_bus.publish(
            "EventType.CHAT_START",
            req.engine_mode,
            f"Assistant request submitted to {model}",
        )

        reply = await provider.generate(
            prompt=build_chat_prompt(req),
            system=CHAT_SYSTEM_PROMPT,
            model=model,
        )

        await event_bus.publish(
            "EventType.CHAT_COMPLETE",
            req.engine_mode,
            f"Assistant response completed on {model}",
        )
        await append_audit(
            username,
            "CHAT_MESSAGE",
            f"mode={req.engine_mode} model={model} prompt_chars={len(req.message)} "
            f"reply_chars={len(reply)}",
            client_host=host,
            user_agent=ua,
        )

        return {
            "reply": reply.strip(),
            "engine": req.engine_mode,
            "model": model,
        }
    except ValueError as exc:
        await event_bus.publish("EventType.CHAT_ERROR", req.engine_mode, str(exc), "WARNING")
        await append_audit(
            username,
            "CHAT_MESSAGE",
            str(exc)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        await event_bus.publish("EventType.CHAT_ERROR", req.engine_mode, f"Assistant failed: {str(exc)}", "ERROR")
        await append_audit(
            username,
            "CHAT_MESSAGE",
            str(exc)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        raise HTTPException(status_code=500, detail=str(exc))
