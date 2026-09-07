import asyncio
import logging
from typing import Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.llm.base import BaseLLMProvider, QuotaExceededError, FatalProviderError
from app.llm.gemini_provider import GeminiProvider
from app.llm.groq_provider import GroqProvider

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self._primary: Optional[BaseLLMProvider] = None
        self._fallback: Optional[BaseLLMProvider] = None
        self._initialize_providers()

    def _initialize_providers(self):
        try:
            self._primary = GeminiProvider()
            logger.info("[LLM] Gemini provider initialized as primary")
        except Exception as e:
            logger.warning("[LLM] Gemini init failed: %s", str(e)[:80])

        try:
            self._fallback = GroqProvider()
            logger.info("[LLM] Groq provider initialized as fallback")
        except Exception as e:
            logger.warning("[LLM] Groq init failed: %s", str(e)[:80])

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7) -> str:
        # Try primary (Gemini)
        if self._primary:
            try:
                return await self._with_retry(self._primary, prompt, system_prompt, temperature)
            except QuotaExceededError:
                logger.warning("[LLM] Gemini quota exceeded — switching to Groq fallback")
            except FatalProviderError as e:
                logger.error("[LLM] Gemini fatal error: %s", str(e)[:80])
                logger.warning("[LLM] Switching to Groq fallback")
            except Exception as e:
                logger.warning("[LLM] Gemini failed after retries: %s — switching to Groq", str(e)[:80])

        # Fallback (Groq)
        if self._fallback:
            try:
                logger.info("[LLM] Switching to Groq fallback")
                return await self._with_retry(self._fallback, prompt, system_prompt, temperature)
            except Exception as e:
                logger.error("[LLM] Groq fallback also failed: %s", str(e)[:80])
                raise RuntimeError(f"All LLM providers failed. Last error: {e}")

        raise RuntimeError("[LLM] No providers available")

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=6),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    async def _with_retry(
        self,
        provider: BaseLLMProvider,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
    ) -> str:
        # Do not retry quota or fatal errors
        try:
            return await provider.generate(prompt, system_prompt, temperature)
        except (QuotaExceededError, FatalProviderError):
            raise  # bubble up immediately, tenacity won't catch these
        except Exception:
            raise  # tenacity will retry


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
