import logging
from typing import AsyncGenerator

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from ..agents.multi_agent.agent import full_workflow_agent

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


async def run_agent_stream(session_id: str, user_id: str, message: str) -> AsyncGenerator:
    """Async generator that yields ADK events for the given message."""
    content = types.Content(
        role="user",
        parts=[types.Part(text=message)]
    )
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content
    ):
        yield event


async def get_session_state(user_id: str, session_id: str) -> dict:
    """Return the current session state dict."""
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id
    )
    return session.state if session else {}
