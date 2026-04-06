"""Per-session Neo4j connection management.

Provides a connection manager that supports:
- A shared demo connection (read-only) for anonymous users
- Per-user BYO connections stored by session ID
"""

import logging
from typing import Optional

from google.adk.tools import ToolContext

from core.config import settings
from infra.neo4j import Neo4jForADK, is_write_query
from infra.pydantic_neo4j import Neo4jConfig
from agents.common.tool_result import tool_error

logger = logging.getLogger(__name__)


class Neo4jConnectionManager:
    """Manages Neo4j connections: one shared demo + per-session BYO pools."""

    def __init__(self):
        self._demo_connection: Optional[Neo4jForADK] = None
        self._user_pools: dict[str, Neo4jForADK] = {}

    def get_demo_connection(self) -> Optional[Neo4jForADK]:
        """Returns the shared read-only demo connection, or None if not configured."""
        if self._demo_connection is not None:
            return self._demo_connection

        dsn = settings.demo_neo4j_dsn
        if not dsn:
            # Fall back to the agent config's neo4j_dsn
            from agents.common.config import get_settings
            agent_settings = get_settings()
            dsn = agent_settings.neo4j_dsn

        if not dsn:
            return None

        try:
            config = Neo4jConfig(dsn=dsn)
            self._demo_connection = Neo4jForADK(config)
            logger.info("Demo Neo4j connection established: %s", config.uri)
            return self._demo_connection
        except Exception as e:
            logger.warning("Failed to connect to demo Neo4j: %s", e)
            return None

    def get_user_connection(self, session_id: str) -> Optional[Neo4jForADK]:
        """Returns a user's BYO connection, or None if not configured."""
        return self._user_pools.get(session_id)

    def register_user_connection(self, session_id: str, dsn: str) -> Neo4jForADK:
        """Validate and register a user's Neo4j connection.

        Raises ConnectionError if the connection test fails.
        """
        # Close existing connection if any
        self.disconnect_user(session_id)

        config = Neo4jConfig(dsn=dsn)
        client = Neo4jForADK(config)

        # Validate connection
        result = client.send_query("RETURN 1 AS test")
        if result["status"] == "error":
            client.close()
            raise ConnectionError(f"Cannot connect to Neo4j: {result['error_message']}")

        self._user_pools[session_id] = client
        logger.info("Registered BYO Neo4j for session %s: %s", session_id, config.uri)
        return client

    def resolve_connection(self, session_id: Optional[str] = None) -> tuple[Optional[Neo4jForADK], bool]:
        """Resolve the appropriate Neo4j connection for a session.

        Returns:
            (connection, is_read_only): The connection and whether it's demo/read-only.
            connection may be None if no Neo4j is available at all.
        """
        if session_id:
            user_conn = self.get_user_connection(session_id)
            if user_conn:
                return user_conn, False

        demo = self.get_demo_connection()
        return demo, True

    def disconnect_user(self, session_id: str) -> None:
        """Close and remove a user's BYO connection."""
        conn = self._user_pools.pop(session_id, None)
        if conn:
            try:
                conn.close()
            except Exception:
                pass
            logger.info("Disconnected BYO Neo4j for session %s", session_id)

    def close_all(self) -> None:
        """Close all connections (shutdown)."""
        for sid in list(self._user_pools.keys()):
            self.disconnect_user(sid)
        if self._demo_connection:
            try:
                self._demo_connection.close()
            except Exception:
                pass
            self._demo_connection = None


# Module-level singleton
neo4j_manager = Neo4jConnectionManager()


def get_db_for_tool(tool_context: ToolContext) -> tuple[Neo4jForADK, bool]:
    """Resolve the Neo4j connection from a ToolContext.

    Reads _session_id from the tool context state to determine
    which connection to use.

    Returns:
        (connection, is_read_only)
    """
    session_id = tool_context.state.get("_session_id")
    return neo4j_manager.resolve_connection(session_id)


def get_db_or_error(tool_context: ToolContext) -> tuple[Optional[Neo4jForADK], Optional[dict], bool]:
    """Resolve Neo4j connection, returning an error dict if unavailable.

    Returns:
        (connection, error_dict_or_none, is_read_only)
    """
    conn, read_only = get_db_for_tool(tool_context)
    if conn is None:
        return None, tool_error("No Neo4j connection available. Please connect your Neo4j instance in Settings."), False
    return conn, None, read_only
