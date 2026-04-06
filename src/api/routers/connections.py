"""BYO Neo4j connection management endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from core.session import get_session, update_session
from infra.neo4j_manager import neo4j_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connections", tags=["connections"])


class Neo4jConnectionRequest(BaseModel):
    uri: str
    username: str
    password: str
    database: Optional[str] = None


class Neo4jConnectionStatus(BaseModel):
    connected: bool
    is_demo: bool
    uri: Optional[str] = None
    node_count: Optional[int] = None
    relationship_count: Optional[int] = None


def _build_dsn(req: Neo4jConnectionRequest) -> str:
    """Build a Neo4j DSN string from connection parts."""
    # Extract scheme from URI
    if "://" in req.uri:
        scheme, host_part = req.uri.split("://", 1)
    else:
        scheme = "bolt"
        host_part = req.uri

    db = req.database or "neo4j"
    return f"{scheme}://{req.username}:{req.password}@{host_part}/{db}"


async def _get_session_id(x_session_id: Optional[str]) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-ID header")
    session = await get_session(x_session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return x_session_id


@router.post("/neo4j/test")
async def test_neo4j_connection(
    req: Neo4jConnectionRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    """Test a Neo4j connection without saving it."""
    await _get_session_id(x_session_id)
    dsn = _build_dsn(req)

    from infra.neo4j import Neo4jForADK
    from infra.pydantic_neo4j import Neo4jConfig

    try:
        config = Neo4jConfig(dsn=dsn)
        client = Neo4jForADK(config)
        result = client.send_query("RETURN 1 AS test")
        client.close()

        if result["status"] == "error":
            return {"status": "error", "message": result["error_message"]}

        return {"status": "ok", "message": "Connection successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/neo4j")
async def save_neo4j_connection(
    req: Neo4jConnectionRequest,
    x_session_id: Optional[str] = Header(default=None),
):
    """Save and activate a BYO Neo4j connection for this session."""
    sid = await _get_session_id(x_session_id)
    dsn = _build_dsn(req)

    try:
        neo4j_manager.register_user_connection(sid, dsn)
    except ConnectionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update Redis session
    await update_session(sid, {
        "neo4j_dsn": dsn,
        "neo4j_uri": req.uri,
        "is_demo": False,
    })

    return {"status": "ok", "message": "Neo4j connection saved and activated"}


@router.delete("/neo4j")
async def remove_neo4j_connection(
    x_session_id: Optional[str] = Header(default=None),
):
    """Disconnect BYO Neo4j and revert to demo mode."""
    sid = await _get_session_id(x_session_id)

    neo4j_manager.disconnect_user(sid)
    await update_session(sid, {
        "neo4j_dsn": None,
        "neo4j_uri": None,
        "is_demo": True,
    })

    return {"status": "ok", "message": "Disconnected. Reverted to demo mode."}


@router.get("/neo4j/status", response_model=Neo4jConnectionStatus)
async def get_neo4j_status(
    x_session_id: Optional[str] = Header(default=None),
):
    """Get the current Neo4j connection status for this session."""
    sid = await _get_session_id(x_session_id)

    conn, is_read_only = neo4j_manager.resolve_connection(sid)

    if conn is None:
        return Neo4jConnectionStatus(connected=False, is_demo=True)

    # Get basic stats
    node_count = None
    rel_count = None
    try:
        result = conn.send_query("MATCH (n) RETURN count(n) AS c")
        if result["status"] == "success" and result["records"]:
            node_count = result["records"][0].get("c", 0)

        result = conn.send_query("MATCH ()-[r]->() RETURN count(r) AS c")
        if result["status"] == "success" and result["records"]:
            rel_count = result["records"][0].get("c", 0)
    except Exception:
        pass

    # Get URI for display (mask password)
    session_data = await get_session(sid)
    display_uri = session_data.get("neo4j_uri") if session_data else None

    return Neo4jConnectionStatus(
        connected=True,
        is_demo=is_read_only,
        uri=display_uri,
        node_count=node_count,
        relationship_count=rel_count,
    )
