import logging
from typing import Optional
from groq import AsyncGroq
from app.llm.base import BaseLLMProvider, FatalProviderError
from app.config import settings

logger = logging.getLogger(__name__)


class GroqProvider(BaseLLMProvider):
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
        logger.info("[LLM] Groq provider ready with model: %s", self.model)

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
        logger.info("[LLM] Using Groq model: %s", self.model)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens or 4096,
            )
            result = response.choices[0].message.content
            if not result:
                raise ValueError("Groq returned empty content")
            logger.info("[LLM] Groq response received, length=%d", len(result))
            logger.debug("[LLM] Groq preview: %s", result[:200])
            return result
        except Exception as e:
            err = str(e)
            if "401" in err or "403" in err:
                raise FatalProviderError(f"Groq auth error: {err}")
            if "404" in err or "model_not_found" in err or "decommissioned" in err:
                raise FatalProviderError(f"Groq model not found: {err}")
            if "429" in err or "rate_limit" in err.lower():
                from app.llm.base import QuotaExceededError
                raise QuotaExceededError(f"Groq rate limit: {err}")
            logger.warning("[LLM] Groq error: %s", err[:120])
            raise

    def get_provider_name(self) -> str:
        return "groq"
