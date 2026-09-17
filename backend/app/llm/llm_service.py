import logging
from typing import Optional, List

from app.llm.base import BaseLLMProvider, QuotaExceededError, FatalProviderError
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider
from app.llm.mistral_provider import MistralProvider
from app.llm.openrouter_provider import OpenRouterProvider
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self._providers: List[BaseLLMProvider] = []
        self._initialize_providers()

    def _initialize_providers(self):
        candidates = [
            ("Gemini",      GeminiProvider,      bool(settings.GEMINI_API_KEY)),
            ("Groq",        GroqProvider,         bool(settings.GROQ_API_KEY)),
            ("Mistral",     MistralProvider,      bool(settings.MISTRAL_API_KEY)),
            ("OpenRouter",  OpenRouterProvider,   bool(settings.OPENROUTER_API_KEY)),
        ]
        for name, cls, has_key in candidates:
            if not has_key:
                logger.info("[LLM] %s skipped — API key not configured", name)
                continue
            try:
                self._providers.append(cls())
                logger.info("[LLM] %s provider initialized", name)
            except Exception as e:
                logger.warning("[LLM] %s init failed: %s", name, str(e)[:80])

        if not self._providers:
            logger.error("[LLM] No providers initialized — all API keys missing or init failed")

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        if not self._providers:
            raise RuntimeError("[LLM] No providers available")

        last_error: Optional[Exception] = None

        for provider in self._providers:
            name = provider.get_provider_name().capitalize()
            logger.info("[LLM] Trying %s", name)
            try:
                result = await self._with_retry(provider, prompt, system_prompt, temperature, max_tokens)
                logger.info("[LLM] %s succeeded", name)
                return result
            except QuotaExceededError as e:
                logger.warning("[LLM] %s quota/rate-limit — trying next provider", name)
                last_error = e
            except FatalProviderError as e:
                logger.error("[LLM] %s fatal error: %s — trying next provider", name, str(e)[:80])
                last_error = e
            except Exception as e:
                logger.warning("[LLM] %s failed: %s — trying next provider", name, str(e)[:80])
                last_error = e

        raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")

    async def _with_retry(
        self,
        provider: BaseLLMProvider,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: Optional[int] = None,
    ) -> str:
        # Two attempts with a short pause for transient errors.
        # QuotaExceededError and FatalProviderError skip retry immediately.
        import asyncio
        last_exc: Optional[Exception] = None
        for attempt in range(2):
            try:
                return await provider.generate(prompt, system_prompt, temperature, max_tokens)
            except (QuotaExceededError, FatalProviderError):
                raise
            except Exception as e:
                last_exc = e
                if attempt == 0:
                    await asyncio.sleep(2)
        raise last_exc  # type: ignore[misc]


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
