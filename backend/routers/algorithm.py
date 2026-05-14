from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from deps import get_current_username
from engines.algorithm.lexer import lexer
from engines.algorithm.parser import parser
from engines.algorithm.validator import validator
from engines.algorithm.generator import generator
from engines.algorithm.fhir_bridge import fhir_bridge
from services.audit_helpers import client_host_user_agent
from services.audit_log import append_audit
from services.event_bus import event_bus

router = APIRouter()

# H-04: Input size limits
MAX_MESSAGE_LENGTH = 1_000_000  # 1 MB max per message


class ParseRequest(BaseModel):
    message: str

    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        if len(v) > MAX_MESSAGE_LENGTH:
            raise ValueError(f"Message too large ({len(v)} chars). Maximum is {MAX_MESSAGE_LENGTH} chars.")
        return v


class GenerateRequest(BaseModel):
    template: str
    data: dict


@router.post("/process")
async def process_message(
    req: ParseRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        # 1. Lexer
        lexer_output = await lexer.tokenize(req.message)

        # 2. Parser
        ast = await parser.parse(lexer_output)

        # 3. Validator
        val_result = await validator.validate(ast)

        # 4. FHIR Bridge
        fhir = await fhir_bridge.to_fhir(ast)

        await append_audit(
            username,
            "ALGO_PROCESS",
            f"chars={len(req.message)} status={val_result.get('status', '')}",
            client_host=host,
            user_agent=ua,
        )
        return {
            "ast": ast,
            "validation": val_result,
            "fhir": fhir
        }
    except ValueError as e:
        await append_audit(
            username,
            "ALGO_PROCESS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", "algorithm", f"Pipeline failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await append_audit(
            username,
            "ALGO_PROCESS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", "algorithm", f"Pipeline failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_message(
    req: GenerateRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        msg = await generator.generate(req.data, req.template)
        await append_audit(
            username,
            "ALGO_GENERATE",
            f"template={req.template} out_chars={len(msg)}",
            client_host=host,
            user_agent=ua,
        )
        return {"message": msg}
    except ValueError as e:
        await append_audit(
            username,
            "ALGO_GENERATE",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", "algorithm", f"Generation failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await append_audit(
            username,
            "ALGO_GENERATE",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", "algorithm", f"Generation failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=500, detail=str(e))
