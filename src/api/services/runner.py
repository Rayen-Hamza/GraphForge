import json
import logging
import os
from contextlib import aclosing
from typing import AsyncGenerator, Optional

from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.genai import types
from sqlalchemy.engine import make_url

from agents.multi_agent.agent import full_workflow_agent

logger = logging.getLogger(__name__)

APP_NAME = "graphforge"

session_service: Optional[DatabaseSessionService] = None
runner: Optional[Runner] = None


async def init_runner(db_url: str) -> None:
    """Initialize the DatabaseSessionService and Runner.

    Called during FastAPI lifespan startup.
    """
    global session_service, runner

    # Ensure parent directory exists for file-based SQLite
    url = make_url(db_url)
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        os.makedirs(os.path.dirname(url.database) or ".", exist_ok=True)

    session_service = DatabaseSessionService(db_url=db_url)

    runner = Runner(
        agent=full_workflow_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )
    logger.info("Runner initialized with DatabaseSessionService (db=%s)", db_url)


async def shutdown_runner() -> None:
    """Dispose the database engine and reset module state.

    Called during FastAPI lifespan shutdown.
    """
    global session_service, runner
    if session_service is not None:
        await session_service.close()
        logger.info("DatabaseSessionService closed")
    session_service = None
    runner = None


async def create_session(user_id: str, session_id: str, initial_state: dict = {}) -> str:
    """Create a new ADK session and return the session_id.

    Injects _session_id into state so tools can resolve per-user Neo4j
    connections and upload directories via the connection manager.
    """
    state = {**initial_state, "_session_id": user_id}
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state=state,
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


async def list_sessions(user_id: str) -> list[dict]:
    """Return summary info for all sessions belonging to a user."""
    resp = await session_service.list_sessions(
        app_name=APP_NAME,
        user_id=user_id
    )
    return [
        {
            "session_id": s.id,
            "user_id": s.user_id,
            "last_update_time": s.last_update_time,
            "state": s.state,
        }
        for s in resp.sessions
    ]


async def get_session_state(user_id: str, session_id: str) -> dict:
    """Return the current session state dict."""
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id
    )
    return session.state if session else {}


async def get_session_events(user_id: str, session_id: str) -> list[dict]:
    """Return non-partial events for a session, serialized as dicts."""
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )
    if not session:
        return []

    results = []
    for event in session.events:
        if event.partial:
            continue
        # Use model_dump_json to handle binary bytes (base64-encoded per ADK config),
        # then parse back to dict for JSON-safe serialization.
        json_str = event.model_dump_json(exclude_none=True, by_alias=True)
        results.append(json.loads(json_str))
    return results
