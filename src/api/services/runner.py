import logging
from contextlib import aclosing
from typing import AsyncGenerator

from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agents.multi_agent.agent import full_workflow_agent

logger = logging.getLogger(__name__)

APP_NAME = "graphforge"

session_service = InMemorySessionService()

runner = Runner(
    agent=full_workflow_agent,
    app_name=APP_NAME,
    session_service=session_service
)


async def create_session(user_id: str, session_id: str, initial_state: dict = {}) -> str:
    """Create a new ADK session and return the session_id."""
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state=initial_state
    )
    logger.info(f"Session created: user={user_id} session={session_id}")
    return session_id


async def run_agent_stream(
    session_id: str,
    user_id: str,
    message: str,
    streaming: bool = True,
) -> AsyncGenerator:
    """Async generator that yields ADK events for the given message.

    When *streaming* is True the runner uses StreamingMode.SSE so that
    partial text chunks are yielded progressively (typewriter effect).
    """
    content = types.Content(
        role="user",
        parts=[types.Part(text=message)]
    )
    stream_mode = StreamingMode.SSE if streaming else StreamingMode.NONE
    run_config = RunConfig(streaming_mode=stream_mode)

    async with aclosing(
        runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content,
            run_config=run_config,
        )
    ) as event_stream:
        async for event in event_stream:
            yield event


async def get_session_state(user_id: str, session_id: str) -> dict:
    """Return the current session state dict."""
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id
    )
    return session.state if session else {}
