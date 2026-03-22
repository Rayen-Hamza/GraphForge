from enum import Enum
import asyncio
import logging
import os
import time

from google.adk.models.lite_llm import LiteLlm
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from typing import Optional

from agents.common.config import get_settings

logger = logging.getLogger(__name__)


# ── Rate limiter for free-tier Gemini (15 RPM) ──────────────
_RPM_LIMIT = 15
_MIN_INTERVAL = 60.0 / _RPM_LIMIT          # ~4s between calls
_last_call_time: float = 0.0
_rate_lock = asyncio.Lock()


async def rate_limit_before_model(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """before_model_callback that throttles every LLM call to stay under RPM limit."""
    global _last_call_time
    async with _rate_lock:
        now = time.monotonic()
        wait = _MIN_INTERVAL - (now - _last_call_time)
        if wait > 0:
            logger.debug(f"\033[93mRate limiter: sleeping {wait:.1f}s before LLM call\033[0m")
            await asyncio.sleep(wait)
        _last_call_time = time.monotonic()
    return None  # proceed with the actual LLM call

# Native ADK Gemini model names (no litellm prefix)
MODEL_GEMINI_2_0_FLASH = "gemini-3.1-flash-lite-preview"
MODEL_GEMINI_1_5_PRO = "gemini-3.1-flash-lite-preview"

# LiteLlm model names for other providers
MODEL_GPT_4O = "openai/gpt-4o"
MODEL_GPT_4O_MINI = "openai/gpt-4o-mini"
MODEL_CLAUDE_SONNET = "anthropic/claude-3-sonnet-20240229"


class LlmKind(str, Enum):
    reasoning = 'reasoning'
    conversational = 'conversational'


_llm_cache: dict[LlmKind, LiteLlm | str] = {}


def get_llm(kind: LlmKind = LlmKind.reasoning) -> LiteLlm | str:
    """Return the appropriate LLM for the configured provider.

    If GEMINI_API_KEY is set, returns a native ADK model name string so the
    ADK uses google-genai directly (faster, no LiteLlm overhead).
    Otherwise falls back to a LiteLlm instance.
    """
    if kind in _llm_cache:
        return _llm_cache[kind]

    settings = get_settings()

    if settings.gemini_api_key:
        os.environ["GOOGLE_API_KEY"] = settings.gemini_api_key
        model = MODEL_GEMINI_1_5_PRO if kind == LlmKind.reasoning else MODEL_GEMINI_2_0_FLASH
        logger.info(f"Using native ADK Gemini model: {model}")
        _llm_cache[kind] = model
    else:
        model = settings.llm_model or MODEL_GPT_4O_MINI
        logger.info(f"Using LiteLlm model: {model}")
        _llm_cache[kind] = LiteLlm(model=model)

    return _llm_cache[kind]
