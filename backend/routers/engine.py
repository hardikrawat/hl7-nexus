import json
import re
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from deps import get_current_username
from engines.algorithm.fhir_bridge import fhir_bridge
from engines.algorithm.lexer import lexer
from engines.algorithm.parser import parser
from engines.algorithm.validator import validator
from engines.gateway_ai import DEFAULT_GATEWAY_MODELS, GatewayProvider
from engines.gemini_ai import GeminiProvider
from engines.local_ai import OllamaProvider
from engines.providers import DEFAULT_GEMINI_MODEL, normalize_cloud_provider, resolve_provider
from services.audit_helpers import client_host_user_agent
from services.audit_log import append_audit
from services.event_bus import event_bus

router = APIRouter()

class GeminiConfigRequest(BaseModel):
    api_key: str


class GatewayConfigRequest(BaseModel):
    gateway_url: str = ""
    gateway_api_key: str = ""


class EngineStatusRequest(BaseModel):
    engine_mode: Literal["cloud_ai", "local_ai", "algorithm"] = "algorithm"
    cloud_provider: Literal["gemini_direct", "gateway"] = "gemini_direct"
    api_key: str = ""
    gemini_api_key: str = ""
    gateway_url: str = ""
    gateway_api_key: str = ""
    ollama_url: str = "http://localhost:11434"


@router.post("/gemini/models")
async def get_gemini_models(
    config: GeminiConfigRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        provider = GeminiProvider(api_key=config.api_key)
        models = await provider.get_models()
        await append_audit(
            username,
            "ENGINE_GEMINI_MODELS",
            f"model_count={len(models)}",
            client_host=host,
            user_agent=ua,
        )
        return {"models": models}
    except Exception as e:
        await append_audit(
            username,
            "ENGINE_GEMINI_MODELS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gateway/models")
async def get_gateway_models(
    config: GatewayConfigRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        provider = GatewayProvider(
            base_url=config.gateway_url,
            api_key=config.gateway_api_key,
        )
        models = await provider.get_models()
        await append_audit(
            username,
            "ENGINE_GATEWAY_MODELS",
            f"model_count={len(models)}",
            client_host=host,
            user_agent=ua,
        )
        return {"models": models}
    except Exception as e:
        await append_audit(
            username,
            "ENGINE_GATEWAY_MODELS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        return {"models": DEFAULT_GATEWAY_MODELS, "warning": str(e)}


@router.post("/status")
async def engine_status(
    config: EngineStatusRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        if config.engine_mode == "algorithm":
            payload = {
                "engine": "algorithm",
                "available": True,
                "detail": "Deterministic algorithm engine is available",
            }
        elif config.engine_mode == "local_ai":
            provider = OllamaProvider(base_url=config.ollama_url)
            models = await provider.get_models()
            payload = {
                "engine": "local_ai",
                "available": len(models) > 0,
                "detail": "Ollama reachable" if models else "Ollama not reachable or no models installed",
                "models": models,
            }
        elif normalize_cloud_provider(config.cloud_provider) == "gateway":
            provider = GatewayProvider(
                base_url=config.gateway_url,
                api_key=config.gateway_api_key,
            )
            payload = {
                "engine": "cloud_ai",
                "provider": "gateway",
                **await provider.health(),
            }
        else:
            has_key = bool((config.gemini_api_key or config.api_key).strip())
            payload = {
                "engine": "cloud_ai",
                "provider": "gemini_direct",
                "available": has_key,
                "detail": "Gemini API key configured" if has_key else "Gemini API key is not configured",
            }

        await append_audit(
            username,
            "ENGINE_STATUS",
            f"engine={config.engine_mode} available={payload.get('available')}",
            client_host=host,
            user_agent=ua,
        )
        return payload
    except Exception as e:
        await append_audit(
            username,
            "ENGINE_STATUS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        return {
            "engine": config.engine_mode,
            "available": False,
            "detail": str(e),
        }


class NLParseRequest(BaseModel):
    engine_mode: Literal["cloud_ai", "local_ai"]
    model: Optional[str] = ""
    cloud_provider: Literal["gemini_direct", "gateway"] = "gemini_direct"
    api_key: str = ""
    gemini_api_key: str = ""
    gateway_url: str = ""
    gateway_api_key: str = ""
    ollama_url: str = "http://localhost:11434"
    text: str = Field(min_length=1, max_length=80_000)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value):
        if not value.strip():
            raise ValueError("Text cannot be empty")
        return value


class AIProcessRequest(BaseModel):
    engine_mode: Literal["cloud_ai", "local_ai"]
    model: Optional[str] = ""
    cloud_provider: Literal["gemini_direct", "gateway"] = "gemini_direct"
    api_key: str = ""
    gemini_api_key: str = ""
    gateway_url: str = ""
    gateway_api_key: str = ""
    ollama_url: str = "http://localhost:11434"
    message: str = Field(min_length=1, max_length=1_000_000)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value):
        if not value.strip():
            raise ValueError("Message cannot be empty")
        return value


def clean_model_text(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_ai_json(text: str) -> dict[str, Any]:
    cleaned = clean_model_text(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


async def run_algorithm_pipeline(message: str) -> dict[str, Any]:
    lexer_output = await lexer.tokenize(message)
    ast = await parser.parse(lexer_output)
    validation = await validator.validate(ast)
    fhir = await fhir_bridge.to_fhir(ast)
    return {"ast": ast, "validation": validation, "fhir": fhir}


async def validate_generated_hl7(message: str) -> dict[str, Any]:
    try:
        return await run_algorithm_pipeline(message)
    except Exception as exc:
        return {
            "ast": None,
            "validation": {
                "status": "FAIL",
                "errors": [{
                    "segment": "MSH",
                    "field": 0,
                    "rule": "AI-GEN-VALIDATION",
                    "message": str(exc),
                }],
                "warnings": [],
                "rules_checked": 1,
                "rules_passed": 0,
            },
            "fhir": {"resourceType": "Bundle", "type": "transaction", "entry": []},
        }


AI_REVIEW_SYSTEM_PROMPT = """You are an HL7 v2.5.1 and FHIR R4 compliance reviewer.
Return ONLY valid JSON. Do not include markdown.
Use this exact top-level shape:
{
  "summary": "one concise engineering summary",
  "confidence": 0-100,
  "syntax": {"status": "CLEAR|WARNING|ALERT", "score": 0-100, "issues": []},
  "semantic": {"status": "CLEAR|WARNING|ALERT", "score": 0-100, "issues": []},
  "compliance": {"status": "COMPLIANT|WARNING|VIOLATION", "score": 0-100, "issues": []},
  "fhir_review": {"status": "CLEAR|WARNING|ALERT", "issues": []},
  "fixes": [{"segment": "", "field": "", "original_value": "", "corrected_value": "", "confidence": 0-100}]
}"""


async def build_ai_analysis(req: AIProcessRequest, pipeline: dict[str, Any]) -> dict[str, Any]:
    try:
        provider, model, provider_name = resolve_provider(
            engine_mode=req.engine_mode,
            model=req.model,
            cloud_provider=req.cloud_provider,
            api_key=req.api_key,
            gemini_api_key=req.gemini_api_key,
            gateway_url=req.gateway_url,
            gateway_api_key=req.gateway_api_key,
            ollama_url=req.ollama_url,
        )

        prompt = f"""Review this HL7/FHIR processing result.

Raw HL7 message:
{req.message[:20000]}

Deterministic validation result:
{json.dumps(pipeline.get("validation"), indent=2, default=str)[:12000]}

FHIR bundle preview:
{json.dumps(pipeline.get("fhir"), indent=2, default=str)[:12000]}

Identify syntax, semantic, compliance, and FHIR mapping issues. Provide safe corrections only when obvious."""

        raw = await provider.generate(
            prompt=prompt,
            system=AI_REVIEW_SYSTEM_PROMPT,
            model=model,
        )
        try:
            parsed = parse_ai_json(raw)
        except Exception:
            parsed = {
                "summary": clean_model_text(raw)[:2000],
                "confidence": None,
                "syntax": {"status": "WARNING", "score": None, "issues": ["AI returned non-JSON review text"]},
                "semantic": {"status": "WARNING", "score": None, "issues": []},
                "compliance": {"status": "WARNING", "score": None, "issues": []},
                "fhir_review": {"status": "WARNING", "issues": []},
                "fixes": [],
            }

        parsed["status"] = "COMPLETE"
        parsed["engine"] = req.engine_mode
        parsed["provider"] = provider_name
        parsed["model"] = model
        return parsed
    except Exception as exc:
        await event_bus.publish(
            "EventType.AI_CALL_ERROR",
            req.engine_mode,
            f"AI analysis failed: {str(exc)}",
            "ERROR",
        )
        return {
            "status": "ERROR",
            "engine": req.engine_mode,
            "summary": "AI analysis failed",
            "error": str(exc),
            "confidence": 0,
            "syntax": {"status": "ALERT", "score": 0, "issues": [str(exc)]},
            "semantic": {"status": "ALERT", "score": 0, "issues": []},
            "compliance": {"status": "VIOLATION", "score": 0, "issues": []},
            "fhir_review": {"status": "ALERT", "issues": []},
            "fixes": [],
        }

@router.post("/nl_parse")
async def nl_parse_hl7(
    req: NLParseRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    system_prompt = """You are an HL7 v2.5.1 expert system. 
Given a natural language description of a clinical event, generate a valid, raw HL7 v2.5.1 message.
Output ONLY the raw HL7 message without any markdown formatting, explanation, or code blocks.
Ensure fields are pipe-delimited and segments are newline-separated."""

    host, ua = client_host_user_agent(request)
    try:
        provider, model, provider_name = resolve_provider(
            engine_mode=req.engine_mode,
            model=req.model,
            cloud_provider=req.cloud_provider,
            api_key=req.api_key,
            gemini_api_key=req.gemini_api_key,
            gateway_url=req.gateway_url,
            gateway_api_key=req.gateway_api_key,
            ollama_url=req.ollama_url,
        )
            
        hl7_msg = await provider.generate(prompt=req.text, system=system_prompt, model=model)
        
        # Clean up any potential markdown formatting the model might still return
        hl7_msg = clean_model_text(hl7_msg)
        pipeline = await validate_generated_hl7(hl7_msg)
        
        await append_audit(
            username,
            "ENGINE_NL_PARSE",
            f"mode={req.engine_mode} provider={provider_name} model={model} "
            f"prompt_chars={len(req.text)} out_chars={len(hl7_msg)} "
            f"validation={pipeline['validation'].get('status')}",
            client_host=host,
            user_agent=ua,
        )
        return {
            "hl7": hl7_msg,
            "validation": pipeline["validation"],
            "ast": pipeline["ast"],
            "fhir": pipeline["fhir"],
            "engine": req.engine_mode,
            "provider": provider_name,
            "model": model,
        }
    except Exception as e:
        await append_audit(
            username,
            "ENGINE_NL_PARSE",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", req.engine_mode, f"NL to HL7 generation failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process")
async def ai_process_hl7(
    req: AIProcessRequest,
    request: Request,
    username: str = Depends(get_current_username),
):
    host, ua = client_host_user_agent(request)
    try:
        await event_bus.publish(
            "EventType.AI_CALL_START",
            req.engine_mode,
            "AI-assisted HL7 review started",
        )
        pipeline = await run_algorithm_pipeline(req.message)
        ai_analysis = await build_ai_analysis(req, pipeline)
        await event_bus.publish(
            "EventType.AI_CALL_COMPLETE",
            req.engine_mode,
            "AI-assisted HL7 review completed",
            "INFO" if ai_analysis.get("status") != "ERROR" else "ERROR",
        )

        await append_audit(
            username,
            "ENGINE_AI_PROCESS",
            f"mode={req.engine_mode} model={req.model or DEFAULT_GEMINI_MODEL} "
            f"chars={len(req.message)} validation={pipeline['validation'].get('status')} "
            f"ai_status={ai_analysis.get('status')}",
            client_host=host,
            user_agent=ua,
        )
        return {
            **pipeline,
            "ai_analysis": ai_analysis,
            "engine": req.engine_mode,
        }
    except ValueError as e:
        await append_audit(
            username,
            "ENGINE_AI_PROCESS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", req.engine_mode, f"AI process failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await append_audit(
            username,
            "ENGINE_AI_PROCESS",
            str(e)[:500],
            outcome="failure",
            client_host=host,
            user_agent=ua,
        )
        await event_bus.publish("EventType.PROC_ERROR", req.engine_mode, f"AI process failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=500, detail=str(e))
