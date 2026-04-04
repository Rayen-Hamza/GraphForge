"""Session management endpoints.

Handles anonymous session creation and lifecycle for the ephemeral
Redis-backed session system.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from core.session import (
    create_session,
    get_session,
    delete_session,
    get_session_ttl,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])


class InitSessionResponse(BaseModel):
    session_id: str
    is_demo: bool = True


class SessionInfoResponse(BaseModel):
    session_id: str
    is_demo: bool
    neo4j_connected: bool
    ttl_seconds: int


async def _resolve_session_id(x_session_id: Optional[str]) -> str:
    """Extract and validate the session ID from the X-Session-ID header."""
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-ID header")
    session = await get_session(x_session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return x_session_id


@router.post("/init", response_model=InitSessionResponse)
async def init_session():
    """Create a new anonymous session. Returns the session ID to store in localStorage."""
    data = await create_session()
    return InitSessionResponse(
        session_id=data["session_id"],
        is_demo=True,
    )


@router.get("/me", response_model=SessionInfoResponse)
async def get_session_info(x_session_id: Optional[str] = Header(default=None)):
    """Get metadata about the current session."""
    sid = await _resolve_session_id(x_session_id)
    data = await get_session(sid)
    ttl = await get_session_ttl(sid)

    return SessionInfoResponse(
        session_id=sid,
        is_demo=data.get("is_demo", True),
        neo4j_connected=data.get("neo4j_dsn") is not None,
        ttl_seconds=max(ttl, 0),
    )


@router.delete("/me")
async def clear_session(x_session_id: Optional[str] = Header(default=None)):
    """Clear and delete the current session."""
    sid = await _resolve_session_id(x_session_id)
    await delete_session(sid)
    return {"status": "ok", "message": "Session cleared"}
