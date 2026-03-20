import json
import uuid
import logging
import base64
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse


class _BytesEncoder(json.JSONEncoder):
    def default(self, o: Any) -> Any:
        if isinstance(o, bytes):
            return base64.b64encode(o).decode("utf-8")
        return super().default(o)

from services.runner import create_session, run_agent_stream, get_session_state
from schemas.agent import (
    CreateSessionRequest,
    CreateSessionResponse,
    RunAgentRequest,
    SessionStateResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=CreateSessionResponse)
async def post_session(req: CreateSessionRequest):
    """Create a new agent session. Returns the session_id."""
    session_id = req.session_id or str(uuid.uuid4())
    await create_session(req.user_id, session_id, req.initial_state)
    return CreateSessionResponse(session_id=session_id)


@router.post("/sessions/{session_id}/run")
async def run_session(session_id: str, req: RunAgentRequest):
    """Run the agent for a given message and stream events via SSE.

    Each SSE event is a JSON object with:
    - author: the agent/tool that produced the event
    - content: the event content (may be None for non-text events)
    - partial: whether this is a partial streaming chunk
    - is_final: whether this is the final response in the turn
    """
    async def event_generator():
        try:
            async for event in run_agent_stream(session_id, req.user_id, req.message):
                content_data = None
                if event.content:
                    try:
                        content_data = event.content.model_dump()
                    except Exception:
                        content_data = str(event.content)

                data = {
                    "author": event.author,
                    "content": content_data,
                    "partial": getattr(event, "partial", False),
                    "is_final": event.is_final_response(),
                }
                yield f"data: {json.dumps(data, cls=_BytesEncoder)}\n\n"
        except Exception as e:
            logger.error(f"Error streaming agent events: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/sessions/{session_id}", response_model=SessionStateResponse)
async def get_session(session_id: str, user_id: str):
    """Get the current state of an agent session."""
    state = await get_session_state(user_id, session_id)
    return SessionStateResponse(session_id=session_id, state=state)
