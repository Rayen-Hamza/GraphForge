"""OpenTelemetry setup for GraphForge agent tracing.

Activates ADK's built-in OTel tracing by configuring a TracerProvider
with an OTLP exporter. ADK automatically emits spans for:
  - invocation (per runner.run_async call)
  - invoke_agent {name} (per agent invocation)
  - call_llm (per LLM call, with model/tokens/request/response)
  - execute_tool {name} (per tool call, with args/response)
"""

import logging
import os

logger = logging.getLogger(__name__)


def setup_tracing():
    """Initialize OTel tracing for ADK agents.

    Reads OTEL_EXPORTER_OTLP_ENDPOINT from environment (set in .env).
    Call once at app startup, before the Runner is used.
    """
    from dotenv import load_dotenv
    from google.adk.telemetry.setup import maybe_set_otel_providers  # type: ignore[import-untyped]

    load_dotenv()
    os.environ.setdefault("OTEL_SERVICE_NAME", "graphforge")

    maybe_set_otel_providers()

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if endpoint:
        logger.info("OTel tracing enabled, exporting to %s", endpoint)
    else:
        logger.info("OTel tracing initialized (no OTLP endpoint configured)")
