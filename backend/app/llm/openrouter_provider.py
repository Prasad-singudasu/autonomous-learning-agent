import logging
from typing import Optional
import httpx
from app.llm.base import BaseLLMProvider, QuotaExceededError, FatalProviderError
from app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterProvider(BaseLLMProvider):
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        logger.info("[LLM] OpenRouter provider ready with model: %s", self.model)

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7, max_tokens: Optional[int] = None) -> str:
        logger.info("[LLM] Using OpenRouter model: %s", self.model)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or 4096,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://autonomous-learning-agent.app",
            "X-Title": "Autonomous Learning Agent",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)

            if resp.status_code == 401 or resp.status_code == 403:
                raise FatalProviderError(f"OpenRouter auth error: {resp.status_code} {resp.text[:120]}")
            if resp.status_code == 404:
                raise FatalProviderError(f"OpenRouter model not found: {self.model}")
            if resp.status_code == 429:
                raise QuotaExceededError(f"OpenRouter rate limit: {resp.text[:120]}")
            if resp.status_code >= 400:
                raise RuntimeError(f"OpenRouter error {resp.status_code}: {resp.text[:120]}")

            data = resp.json()
            result = data["choices"][0]["message"]["content"]
            if not result:
                raise ValueError("OpenRouter returned empty content")
            logger.info("[LLM] OpenRouter response received, length=%d", len(result))
            return result
        except (FatalProviderError, QuotaExceededError):
            raise
        except Exception as e:
            err = str(e)
            logger.warning("[LLM] OpenRouter error: %s", err[:120])
            raise

    def get_provider_name(self) -> str:
        return "openrouter"
