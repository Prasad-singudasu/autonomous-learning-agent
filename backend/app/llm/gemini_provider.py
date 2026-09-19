import logging
from typing import Optional
from google import genai
from google.genai import types
from app.llm.base import BaseLLMProvider, QuotaExceededError, FatalProviderError, TruncatedResponseError
from app.config import settings

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.GEMINI_MODEL

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        logger.info("[LLM] Using Gemini model: %s", self.model)
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens or 8192,
                    ),
                )
            )
            # Detect truncation
            candidate = response.candidates[0] if response.candidates else None
            if candidate and str(getattr(candidate, 'finish_reason', '')).upper() in ('MAX_TOKENS', '2'):
                logger.warning("[LLM] Gemini response truncated (finish_reason=MAX_TOKENS)")
                raise TruncatedResponseError("Gemini response truncated at max_output_tokens")
            return response.text
        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
                logger.warning("[LLM] Gemini quota exceeded — switching to fallback immediately")
                raise QuotaExceededError(f"Gemini quota exhausted: {err}")
            if "401" in err or "403" in err or "PERMISSION_DENIED" in err or "API_KEY" in err.upper():
                logger.error("[LLM] Gemini auth/permission error")
                raise FatalProviderError(f"Gemini auth error: {err}")
            if "404" in err or "NOT_FOUND" in err:
                logger.error("[LLM] Gemini model not found: %s", self.model)
                raise FatalProviderError(f"Gemini model not found: {err}")
            # Retryable error (network, timeout, 500)
            logger.warning("[LLM] Gemini retryable error: %s", err[:120])
            raise

    def get_provider_name(self) -> str:
        return "gemini"
