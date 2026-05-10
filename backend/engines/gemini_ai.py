import google.generativeai as genai
from .base import LLMProvider
from services.event_bus import event_bus
import httpx

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        if api_key:
            genai.configure(api_key=api_key)

    async def get_models(self) -> list:
        if not self.api_key:
            return []
        
        await event_bus.publish("EventType.AI_CALL_START", "cloud_ai", "Fetching Gemini models via REST API")
        
        try:
            # The python SDK doesn't have an async list_models, so we can use httpx
            # Alternatively use the synchronous one
            models = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    name = m.name.replace('models/', '')
                    is_free = 'flash' in name.lower() or '1.0' in name.lower()
                    models.append({
                        "id": name,
                        "name": m.display_name,
                        "isFree": is_free,
                        "rateLimit": "15 RPM" if is_free else "Pay-as-you-go"
                    })
            
            await event_bus.publish("EventType.AI_CALL_COMPLETE", "cloud_ai", f"Fetched {len(models)} Gemini models.")
            return models
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "cloud_ai", f"Failed to fetch models: {str(e)}", "ERROR")
            return []

    async def generate(self, prompt: str, system: str, model: str = "gemini-1.5-flash") -> str:
        if not self.api_key:
            raise ValueError("Gemini API key not configured")
            
        await event_bus.publish("EventType.AI_CALL_START", "cloud_ai", f"Initializing inference on {model}...")
        
        try:
            m = genai.GenerativeModel(
                model_name=model,
                system_instruction=system,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                )
            )
            # Async generate_content
            response = await m.generate_content_async(prompt)
            
            await event_bus.publish("EventType.AI_CALL_COMPLETE", "cloud_ai", f"Inference complete on {model}.")
            return response.text
        except Exception as e:
            await event_bus.publish("EventType.AI_CALL_ERROR", "cloud_ai", f"Inference failed: {str(e)}", "ERROR")
            raise e
