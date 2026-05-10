from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from engines.gemini_ai import GeminiProvider
from engines.local_ai import OllamaProvider
from services.event_bus import event_bus
import google.generativeai as genai

router = APIRouter()

class GeminiConfigRequest(BaseModel):
    api_key: str

@router.post("/gemini/models")
async def get_gemini_models(config: GeminiConfigRequest):
    provider = GeminiProvider(api_key=config.api_key)
    models = await provider.get_models()
    return {"models": models}

class NLParseRequest(BaseModel):
    engine_mode: str
    model: str
    api_key: str = ""
    ollama_url: str = "http://localhost:11434"
    text: str

@router.post("/nl_parse")
async def nl_parse_hl7(req: NLParseRequest):
    system_prompt = """You are an HL7 v2.5.1 expert system. 
Given a natural language description of a clinical event, generate a valid, raw HL7 v2.5.1 message.
Output ONLY the raw HL7 message without any markdown formatting, explanation, or code blocks.
Ensure fields are pipe-delimited and segments are newline-separated."""

    try:
        if req.engine_mode == 'cloud_ai':
            provider = GeminiProvider(api_key=req.api_key)
        else:
            provider = OllamaProvider(base_url=req.ollama_url)
            
        hl7_msg = await provider.generate(prompt=req.text, system=system_prompt, model=req.model)
        
        # Clean up any potential markdown formatting the model might still return
        hl7_msg = hl7_msg.strip().removeprefix("```hl7").removeprefix("```").removesuffix("```").strip()
        
        return {"hl7": hl7_msg}
    except Exception as e:
        await event_bus.publish("EventType.PROC_ERROR", req.engine_mode, f"NL to HL7 generation failed: {str(e)}", "ERROR")
        raise HTTPException(status_code=500, detail=str(e))
