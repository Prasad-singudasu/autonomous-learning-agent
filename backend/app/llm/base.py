from abc import ABC, abstractmethod
from typing import Optional


class QuotaExceededError(Exception):
    """Raised when provider quota/rate-limit is exhausted. Skip retry, go to fallback."""
    pass


class FatalProviderError(Exception):
    """Raised for auth, permission, or model-not-found errors. No retry, no fallback."""
    pass


class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7) -> str:
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass
