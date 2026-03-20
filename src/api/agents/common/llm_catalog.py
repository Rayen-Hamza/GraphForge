from enum import Enum
import logging
import os

from google.adk.models.lite_llm import LiteLlm

from .config import get_settings

logger = logging.getLogger(__name__)

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
