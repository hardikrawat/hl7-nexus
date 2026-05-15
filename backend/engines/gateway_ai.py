import json
from typing import Any

import httpx

from .base import LLMProvider
from services.event_bus import event_bus


DEFAULT_GATEWAY_MODELS = [
    {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite", "isFree": False, "rateLimit": "Gateway"},
    {"id": "gpt-4.1", "name": "GPT-4.1", "isFree": False, "rateLimit": "Gateway"},
    {"id": "gpt-4.1-nano", "name": "GPT-4.1 Nano", "isFree": False, "rateLimit": "Gateway"},
    {"id": "gpt-4o", "name": "GPT-4o", "isFree": False, "rateLimit": "Gateway"},
    {"id": "o3-mini", "name": "o3 Mini", "isFree": False, "rateLimit": "Gateway"},
    {"id": "gpt-5.1-CIO", "name": "GPT-5.1 CIO", "isFree": False, "rateLimit": "Gateway"},
    {"id": "gpt-5.2-CIO", "name": "GPT-5.2 CIO", "isFree": False, "rateLimit": "Gateway"},
    {"id": "anthropic.claude-sonnet-4", "name": "Claude Sonnet 4", "isFree": False, "rateLimit": "Gateway"},
    {"id": "amazon.nova-micro-v1:0", "name": "Amazon Nova Micro", "isFree": False, "rateLimit": "Gateway"},
    {"id": "amazon.nova-2-lite-v1:0", "name": "Amazon Nova 2 Lite", "isFree": False, "rateLimit": "Gateway"},
    {"id": "amazon.nova-lite-v1:0", "name": "Amazon Nova Lite", "isFree": False, "rateLimit": "Gateway"},
]


class GatewayProvider(LLMProvider):
    """
    OpenAI-compatible gateway provider.

    The current gateway details supplied by users are model-router style: one
    base URL, one bearer API key, and provider-prefixed model IDs. We keep this
    provider isolated so direct Gemini and Ollama behavior stay unchanged.
    """

    def __init__(self, base_url: str, api_key: str):
        self.base_url = (base_url or "").strip().rstrip("/")
        self.api_key = (api_key or "").strip()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _candidate_urls(self, path: str) -> list[str]:
        if not self.base_url:
            return []

        if self.base_url.endswith("/v1"):
            return [f"{self.base_url}{path}"]

        return [
            f"{self.base_url}/v1{path}",
            f"{self.base_url}{path}",
        ]

    def _extract_text(self, data: dict[str, Any]) -> str:
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0] or {}
            message = first.get("message") or {}
            content = message.get("content")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = [
                    item.get("text", "")
                    for item in content
                    if isinstance(item, dict)
                ]
                return "".join(parts)
            if isinstance(first.get("text"), str):
                return first["text"]

        if isinstance(data.get("output_text"), str):
            return data["output_text"]

        output = data.get("output")
        if isinstance(output, list):
            parts = []
            for item in output:
                for content in item.get("content", []) if isinstance(item, dict) else []:
                    if isinstance(content, dict) and isinstance(content.get("text"), str):
                        parts.append(content["text"])
            if parts:
                return "".join(parts)

        candidates = data.get("candidates")
        if isinstance(candidates, list) and candidates:
            content = candidates[0].get("content", {})
            parts = content.get("parts", []) if isinstance(content, dict) else []
            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
            if text_parts:
                return "".join(text_parts)

        raise ValueError("Gateway response did not include model text")

    def _normalize_models(self, data: Any) -> list[dict[str, Any]]:
        raw_models = data.get("data", data.get("models", [])) if isinstance(data, dict) else []
        models = []
        for item in raw_models:
            if not isinstance(item, dict):
                continue
            model_id = item.get("id") or item.get("name")
            if not model_id or "embedding" in model_id.lower():
                continue
            clean_id = model_id.replace("models/", "")
            models.append({
                "id": clean_id,
                "name": item.get("display_name") or item.get("name") or clean_id,
                "isFree": False,
                "rateLimit": "Gateway",
            })
        return models

    async def get_models(self) -> list:
        if not self.base_url or not self.api_key:
            return DEFAULT_GATEWAY_MODELS

        await event_bus.publish("EventType.AI_CALL_START", "cloud_ai", "Fetching gateway models")
        last_error = None
        async with httpx.AsyncClient() as client:
            for url in self._candidate_urls("/models"):
                try:
                    response = await client.get(url, headers=self._headers(), timeout=15.0)
                    response.raise_for_status()
                    models = self._normalize_models(response.json())
                    if models:
                        await event_bus.publish(
                            "EventType.AI_CALL_COMPLETE",
                            "cloud_ai",
                            f"Fetched {len(models)} gateway models.",
                        )
                        return models
                except Exception as exc:
                    last_error = exc

        await event_bus.publish(
            "EventType.AI_CALL_ERROR",
            "cloud_ai",
            f"Gateway model fetch failed; using configured model list: {str(last_error)}",
            "WARNING",
        )
        return DEFAULT_GATEWAY_MODELS

    async def health(self) -> dict[str, Any]:
        if not self.base_url:
            return {"available": False, "detail": "Gateway URL is not configured", "models": DEFAULT_GATEWAY_MODELS}
        if not self.api_key:
            return {"available": False, "detail": "Gateway API key is not configured", "models": DEFAULT_GATEWAY_MODELS}

        try:
            models = await self.get_models()
            return {"available": True, "detail": "Gateway reachable", "models": models}
        except Exception as exc:
            return {"available": False, "detail": str(exc), "models": DEFAULT_GATEWAY_MODELS}

    async def generate(self, prompt: str, system: str, model: str = "gemini-2.5-flash-lite") -> str:
        if not self.base_url:
            raise ValueError("Gateway URL not configured")
        if not self.api_key:
            raise ValueError("Gateway API key not configured")

        selected_model = model or "gemini-2.5-flash-lite"
        await event_bus.publish(
            "EventType.AI_CALL_START",
            "cloud_ai",
            f"Submitting gateway inference on {selected_model}...",
        )

        payload = {
            "model": selected_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        }

        last_error = None
        async with httpx.AsyncClient() as client:
            for url in self._candidate_urls("/chat/completions"):
                try:
                    response = await client.post(
                        url,
                        headers=self._headers(),
                        content=json.dumps(payload),
                        timeout=120.0,
                    )
                    response.raise_for_status()
                    text = self._extract_text(response.json())
                    await event_bus.publish(
                        "EventType.AI_CALL_COMPLETE",
                        "cloud_ai",
                        f"Gateway inference complete on {selected_model}.",
                    )
                    return text
                except Exception as exc:
                    last_error = exc

        await event_bus.publish(
            "EventType.AI_CALL_ERROR",
            "cloud_ai",
            f"Gateway inference failed: {str(last_error)}",
            "ERROR",
        )
        raise last_error
