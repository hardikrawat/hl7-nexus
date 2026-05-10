from abc import ABC, abstractmethod
from typing import Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system: str, model: str = None) -> str:
        pass
    
    @abstractmethod
    async def get_models(self) -> list:
        pass
