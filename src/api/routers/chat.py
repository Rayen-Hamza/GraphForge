import asyncio
import json
import uuid
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services.runner import create_session, run_agent_stream, get_session_state, get_session_events, list_sessions
from schemas.agent import (
    CreateSessionRequest,
    CreateSessionResponse,
    ListSessionsResponse,
    RunAgentRequest,
    SessionEventsResponse,
    SessionStateResponse,
)

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL_S = 15

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions", response_model=ListSessionsResponse)
async def get_sessions(user_id: str):
    """List all sessions for a given user."""
    sessions = await list_sessions(user_id)
    return ListSessionsResponse(sessions=sessions)


@router.post("/sessions", response_model=CreateSessionResponse)
async def post_session(req: CreateSessionRequest):
    """Create a new agent session. Returns the session_id."""
    session_id = req.session_id or str(uuid.uuid4())
    await create_session(req.user_id, session_id, req.initial_state)
    return CreateSessionResponse(session_id=session_id)


@router.post("/sessions/{session_id}/run")
async def run_session(session_id: str, req: RunAgentRequest):
    """Run the agent for a given message and stream events via SSE.

    Events are full ADK Event objects serialised as JSON (camelCase keys,
    nulls excluded) — the same format used by the ADK dev-UI.

    A heartbeat comment is sent every 15 s of inactivity to keep the
    connection alive through proxies and prevent browser timeouts.
    """
    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def _consume():
            """Run the agent stream in a background task, forwarding events."""
            try:
                async for event in run_agent_stream(
                    session_id, req.user_id, req.message, streaming=req.streaming
                ):
                    await queue.put(("event", event))
            except Exception as exc:
                await queue.put(("error", exc))
            finally:
                await queue.put(("done", None))

        task = asyncio.create_task(_consume())
        try:
            while True:
                try:
                    kind, payload = await asyncio.wait_for(
                        queue.get(), timeout=HEARTBEAT_INTERVAL_S
                    )
                except asyncio.TimeoutError:
                    # No event for 15 s — send SSE comment to keep alive
                    yield ": heartbeat\n\n"
                    continue

                if kind == "done":
                    break

                if kind == "error":
                    logger.error(f"Error streaming agent events: {payload}")
                    yield f"data: {json.dumps({'error': str(payload)})}\n\n"
                    break

                event = payload
                # Split events with both content and artifact deltas
                events_to_stream = [event]
                if (
                    event.actions.artifact_delta
                    and event.content
                    and event.content.parts
                ):
                    content_event = event.model_copy(deep=True)
                    content_event.actions.artifact_delta = {}
                    artifact_event = event.model_copy(deep=True)
                    artifact_event.content = None
                    events_to_stream = [content_event, artifact_event]

                for evt in events_to_stream:
                    sse_payload = evt.model_dump_json(
                        exclude_none=True,
                        by_alias=True,
                    )
                    yield f"data: {sse_payload}\n\n"
        finally:
            task.cancel()
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/sessions/{session_id}/events", response_model=SessionEventsResponse)
async def get_session_events_endpoint(session_id: str, user_id: str):
    """Return the conversation history (non-partial events) for a session."""
    events = await get_session_events(user_id, session_id)
    return SessionEventsResponse(session_id=session_id, events=events)


@router.get("/sessions/{session_id}", response_model=SessionStateResponse)
async def get_session(session_id: str, user_id: str):
    """Get the current state of an agent session."""
    state = await get_session_state(user_id, session_id)
    return SessionStateResponse(session_id=session_id, state=state)
