"""Redis-backed ephemeral session management.

Anonymous users get a UUID stored in their browser's localStorage.
The backend stores session metadata (Neo4j connection, upload dir, etc.)
in Redis with a configurable TTL.
"""

import json
import logging
import uuid
from typing import Any, Optional

import redis.asyncio as redis

from core.config import settings

logger = logging.getLogger(__name__)

ANONYMOUS_TTL = 60 * 60 * 24       # 24 hours
CONFIGURED_TTL = 60 * 60 * 24 * 7  # 7 days
SESSION_PREFIX = "gf:session:"

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get or create the Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection closed")


def _key(session_id: str) -> str:
    return f"{SESSION_PREFIX}{session_id}"


async def create_session() -> dict[str, Any]:
    """Create a new anonymous session. Returns session metadata."""
    r = await get_redis()
    session_id = str(uuid.uuid4())
    data = {
        "session_id": session_id,
        "neo4j_dsn": None,
        "upload_dir": None,
        "is_demo": True,
    }
    await r.set(_key(session_id), json.dumps(data), ex=ANONYMOUS_TTL)
    logger.info(f"Created anonymous session: {session_id}")
    return data


async def get_session(session_id: str) -> Optional[dict[str, Any]]:
    """Retrieve session data from Redis. Returns None if expired/missing."""
    r = await get_redis()
    raw = await r.get(_key(session_id))
    if raw is None:
        return None
    return json.loads(raw)


async def update_session(session_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Update session fields and optionally extend TTL."""
    r = await get_redis()
    raw = await r.get(_key(session_id))
    if raw is None:
        return None

    data = json.loads(raw)
    data.update(updates)

    # Extend TTL if user has configured Neo4j (they're invested)
    ttl = CONFIGURED_TTL if data.get("neo4j_dsn") else ANONYMOUS_TTL
    await r.set(_key(session_id), json.dumps(data), ex=ttl)
    return data


async def delete_session(session_id: str) -> bool:
    """Delete a session from Redis."""
    r = await get_redis()
    deleted = await r.delete(_key(session_id))
    return deleted > 0


async def get_session_ttl(session_id: str) -> int:
    """Get remaining TTL in seconds for a session. Returns -1 if no TTL, -2 if missing."""
    r = await get_redis()
    return await r.ttl(_key(session_id))
