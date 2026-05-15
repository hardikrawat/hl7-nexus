from .base import LLMProvider
from services.event_bus import event_bus
import httpx

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def get_models(self) -> list:
        if not self.api_key:
            return []
        
        await event_bus.publish("EventType.AI_CALL_START", "cloud_ai", "Fetching Gemini models via REST API")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    params={"key": self.api_key},
                    timeout=15.0,
                )
                response.raise_for_status()
                data = response.json()

            models = []
            for m in data.get("models", []):
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" in methods:
                    name = m.get("name", "").replace("models/", "")
                    if not name:
                        continue
                    is_free = 'flash' in name.lower() or '1.0' in name.lower()
                    models.append({
                        "id": name,
                        "name": m.get("displayName", name),
                        "isFree": is_free,
                        "rateLimit": "15 RPM" if is_free else "Pay-as-you-go"
                    })
            
            await event_bus.publish("EventType.AI_CALL_COMPLETE", "cloud_ai", f"Fetched {len(models)} Gemini models.")
            return models
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "cloud_ai", f"Failed to fetch models: {str(e)}", "ERROR")
            return []

    async def generate(self, prompt: str, system: str, model: str = "gemini-2.5-flash-lite") -> str:
        if not self.api_key:
            raise ValueError("Gemini API key not configured")
            
        await event_bus.publish("EventType.AI_CALL_START", "cloud_ai", f"Initializing inference on {model}...")
        
        try:
            payload = {
                "systemInstruction": {
                    "parts": [{"text": system}]
                },
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                },
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/models/{model}:generateContent",
                    params={"key": self.api_key},
                    json=payload,
                    timeout=120.0,
                )
                response.raise_for_status()
                data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini returned no candidates")
            parts = candidates[0].get("content", {}).get("parts", [])
            text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
            if not text:
                raise ValueError("Gemini returned an empty response")

            await event_bus.publish("EventType.AI_CALL_COMPLETE", "cloud_ai", f"Inference complete on {model}.")
            return text
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "cloud_ai", f"Inference failed: {str(e)}", "ERROR")
            raise e
