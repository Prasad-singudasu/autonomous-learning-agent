import logging
from typing import Optional
from mistralai.client import Mistral
from app.llm.base import BaseLLMProvider, QuotaExceededError, FatalProviderError
from app.config import settings

logger = logging.getLogger(__name__)


class MistralProvider(BaseLLMProvider):
    def __init__(self):
        self.client = Mistral(api_key=settings.MISTRAL_API_KEY)
        self.model = settings.MISTRAL_MODEL
        logger.info("[LLM] Mistral provider ready with model: %s", self.model)

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
        logger.info("[LLM] Using Mistral model: %s", self.model)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.complete_async(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens or 4096,
            )
            result = response.choices[0].message.content
            if not result:
                raise ValueError("Mistral returned empty content")
            logger.info("[LLM] Mistral response received, length=%d", len(result))
            return result
        except Exception as e:
            err = str(e)
            if "401" in err or "403" in err or "Unauthorized" in err:
                raise FatalProviderError(f"Mistral auth error: {err}")
            if "404" in err or "model_not_found" in err or "not found" in err.lower():
                raise FatalProviderError(f"Mistral model not found: {err}")
            if "429" in err or "rate_limit" in err.lower() or "too many" in err.lower():
                raise QuotaExceededError(f"Mistral rate limit: {err}")
            logger.warning("[LLM] Mistral error: %s", err[:120])
            raise

    def get_provider_name(self) -> str:
        return "mistral"
