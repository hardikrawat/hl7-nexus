import httpx
from .base import LLMProvider
from services.event_bus import event_bus

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url

    async def get_models(self) -> list:
        await event_bus.publish("EventType.AI_CALL_START", "local_ai", f"Fetching Ollama models from {self.base_url}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags", timeout=5.0)
                response.raise_for_status()
                data = response.json()
                
                models = []
                for m in data.get("models", []):
                    models.append({
                        "id": m["name"],
                        "name": m["name"],
                        "isFree": True,
                        "rateLimit": "Local Compute"
                    })
                
                await event_bus.publish("EventType.AI_CALL_COMPLETE", "local_ai", f"Fetched {len(models)} local models.")
                return models
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "local_ai", f"Ollama connection failed: {str(e)}", "ERROR")
            return []

    async def generate(self, prompt: str, system: str, model: str = "llama3") -> str:
        await event_bus.publish("EventType.AI_CALL_START", "local_ai", f"Initializing local inference on {model}...")
        
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "system": system,
                    "stream": False,
                    "options": {
                        "temperature": 0.1
                    }
                }
                response = await client.post(f"{self.base_url}/api/generate", json=payload, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                
                await event_bus.publish("EventType.AI_CALL_COMPLETE", "local_ai", f"Local inference complete on {model}.")
                return data.get("response", "")
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "local_ai", f"Local inference failed: {str(e)}", "ERROR")
            raise e
