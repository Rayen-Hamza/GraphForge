"""Graph visualization data endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from core.session import get_session
from infra.neo4j_manager import neo4j_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["graph"])


class GraphNode(BaseModel):
    id: str
    label: str
    properties: dict = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str
    properties: dict = {}


class GraphSnapshot(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    total_nodes: int = 0
    total_edges: int = 0


async def _get_session_id(x_session_id: Optional[str]) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Missing X-Session-ID header")
    session = await get_session(x_session_id)
    if session is None:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return x_session_id


@router.get("/snapshot", response_model=GraphSnapshot)
async def graph_snapshot(
    limit: int = 200,
    x_session_id: Optional[str] = Header(default=None),
):
    """Return a sample of nodes and edges for visualization."""
    sid = await _get_session_id(x_session_id)
    conn, _ = neo4j_manager.resolve_connection(sid)

    if conn is None:
        return GraphSnapshot(nodes=[], edges=[])

    nodes_map: dict[str, GraphNode] = {}
    edges_list: list[GraphEdge] = []

    # Fetch nodes and relationships
    result = conn.send_query(
        f"MATCH (n)-[r]->(m) RETURN n, r, m LIMIT $limit",
        {"limit": limit},
    )

    if result["status"] == "success":
        for record in result.get("records", []):
            n = record.get("n", {})
            m = record.get("m", {})
            r = record.get("r", {})

            # Add nodes
            for node in [n, m]:
                nid = str(node.get("id", ""))
                if nid and nid not in nodes_map:
                    labels = node.get("labels", [])
                    props = node.get("properties", {})
                    nodes_map[nid] = GraphNode(
                        id=nid,
                        label=labels[0] if labels else "Node",
                        properties=props,
                    )

            # Add edge
            rid = str(r.get("id", ""))
            if rid:
                edges_list.append(GraphEdge(
                    id=rid,
                    source=str(r.get("start_node", "")),
                    target=str(r.get("end_node", "")),
                    type=r.get("type", "RELATED_TO"),
                    properties=r.get("properties", {}),
                ))

    # Get total counts
    total_nodes = 0
    total_edges = 0
    count_result = conn.send_query("MATCH (n) RETURN count(n) AS c")
    if count_result["status"] == "success" and count_result.get("records"):
        total_nodes = count_result["records"][0].get("c", 0)

    count_result = conn.send_query("MATCH ()-[r]->() RETURN count(r) AS c")
    if count_result["status"] == "success" and count_result.get("records"):
        total_edges = count_result["records"][0].get("c", 0)

    return GraphSnapshot(
        nodes=list(nodes_map.values()),
        edges=edges_list,
        total_nodes=total_nodes,
        total_edges=total_edges,
    )
