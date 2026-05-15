from typing import Literal

from .gateway_ai import GatewayProvider
from .gemini_ai import GeminiProvider
from .local_ai import OllamaProvider


DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"
DEFAULT_LOCAL_MODEL = "llama3"
DEFAULT_GATEWAY_MODEL = "gemini-2.5-flash-lite"


def normalize_cloud_provider(provider: str | None) -> Literal["gemini_direct", "gateway"]:
    value = (provider or "gemini_direct").strip().lower()
    if value in {"gateway", "proxy", "hub_gateway", "hub-proxy"}:
        return "gateway"
    return "gemini_direct"


def resolve_provider(
    *,
    engine_mode: str,
    model: str | None = None,
    cloud_provider: str | None = None,
    api_key: str = "",
    gemini_api_key: str = "",
    gateway_url: str = "",
    gateway_api_key: str = "",
    ollama_url: str = "http://localhost:11434",
):
    if engine_mode == "cloud_ai":
        provider_name = normalize_cloud_provider(cloud_provider)
        if provider_name == "gateway":
            return (
                GatewayProvider(base_url=gateway_url, api_key=gateway_api_key),
                model or DEFAULT_GATEWAY_MODEL,
                "gateway",
            )
        return (
            GeminiProvider(api_key=gemini_api_key or api_key),
            model or DEFAULT_GEMINI_MODEL,
            "gemini_direct",
        )

    if engine_mode == "local_ai":
        return (
            OllamaProvider(base_url=ollama_url),
            model or DEFAULT_LOCAL_MODEL,
            "ollama",
        )

    raise ValueError("AI provider resolution requires cloud_ai or local_ai engine mode")
