"""Multi-hop graph exploration tools for the GraphRAG agent."""

from typing import Any, Optional, Dict

from google.adk.tools import ToolContext

from infra.neo4j import is_symbol
from infra.neo4j_manager import get_db_or_error
from agents.common.tool_result import tool_success, tool_error


def _validate_symbol(value: str, kind: str) -> Optional[Dict[str, Any]]:
    """Validate a label or relationship type name. Returns a tool_error dict if invalid, else None."""
    if not value or not is_symbol(value):
        return tool_error(f"Invalid {kind}: '{value}'. Must be a valid Neo4j symbol (no spaces or Cypher keywords).")
    return None


def _build_direction_pattern(relationship_expr: str, direction: str) -> str:
    """Build a Cypher relationship pattern with the correct arrow direction."""
    if direction == "outgoing":
        return f"-[{relationship_expr}]->"
    elif direction == "incoming":
        return f"<-[{relationship_expr}]-"
    else:
        return f"-[{relationship_expr}]-"


def get_node_neighbors(
    node_label: str,
    property_filter: Dict[str, Any],
    tool_context: ToolContext,
    relationship_type: Optional[str] = None,
    direction: str = "both",
    max_depth: int = 1,
    limit: int = 25,
) -> Dict[str, Any]:
    """Find neighbors of a node by traversing relationships, with optional depth control for multi-hop exploration.

    Args:
        node_label: The label of the starting node (e.g. 'Person', 'Company').
        property_filter: Properties to identify the starting node (e.g. {"name": "Alice"}).
        tool_context: ToolContext object.
        relationship_type: Optional relationship type to filter traversal (e.g. 'WORKS_AT'). If omitted, follows all relationship types.
        direction: Traversal direction - 'outgoing', 'incoming', or 'both' (default 'both').
        max_depth: Maximum traversal depth / number of hops (1-3, default 1).
        limit: Maximum number of results to return (default 25).

    Returns:
        A dict with status and records containing start node, relationships, and neighbor nodes.
    """
    db, db_err, _ = get_db_or_error(tool_context)
    if db_err:
        return db_err

    err = _validate_symbol(node_label, "node label")
    if err:
        return err

    if relationship_type:
        err = _validate_symbol(relationship_type, "relationship type")
        if err:
            return err

    max_depth = max(1, min(max_depth, 3))
    limit = max(1, min(limit, 100))

    # Build relationship expression
    rel_type_expr = f":{relationship_type}" if relationship_type else ""
    if max_depth == 1:
        rel_expr = f"r{rel_type_expr}"
    else:
        rel_expr = f"r{rel_type_expr}*1..{max_depth}"

    direction_pattern = _build_direction_pattern(rel_expr, direction)

    # Build property filter as Cypher parameter conditions
    where_clauses = [f"start.`{k}` = $filter.`{k}`" for k in property_filter]
    where_str = " AND ".join(where_clauses) if where_clauses else "true"

    query = (
        f"MATCH (start:`{node_label}`){direction_pattern}(neighbor) "
        f"WHERE {where_str} "
        f"RETURN start, r, neighbor "
        f"LIMIT {limit}"
    )

    results = db.send_query(query, {"filter": property_filter})
    return results


def find_paths_between(
    start_label: str,
    start_filter: Dict[str, Any],
    end_label: str,
    end_filter: Dict[str, Any],
    tool_context: ToolContext,
    max_length: int = 5,
    relationship_type: Optional[str] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """Find shortest paths between two nodes in the graph. Useful for discovering indirect connections.

    Args:
        start_label: Label of the starting node (e.g. 'Person').
        start_filter: Properties to identify the start node (e.g. {"name": "Alice"}).
        end_label: Label of the ending node (e.g. 'Company').
        end_filter: Properties to identify the end node (e.g. {"name": "Acme"}).
        tool_context: ToolContext object.
        max_length: Maximum path length in hops (1-6, default 5).
        relationship_type: Optional relationship type to constrain the path. If omitted, any relationship type is followed.
        limit: Maximum number of paths to return (default 5).

    Returns:
        A dict with status and records containing the discovered paths (nodes and relationships along each path).
    """
    db, db_err, _ = get_db_or_error(tool_context)
    if db_err:
        return db_err

    for label, kind in [(start_label, "start node label"), (end_label, "end node label")]:
        err = _validate_symbol(label, kind)
        if err:
            return err

    if relationship_type:
        err = _validate_symbol(relationship_type, "relationship type")
        if err:
            return err

    max_length = max(1, min(max_length, 6))
    limit = max(1, min(limit, 20))

    rel_type_expr = f":{relationship_type}" if relationship_type else ""

    # Build WHERE clauses for start and end nodes
    start_where = [f"start.`{k}` = $start_filter.`{k}`" for k in start_filter]
    end_where = [f"end.`{k}` = $end_filter.`{k}`" for k in end_filter]
    all_where = start_where + end_where
    where_str = " AND ".join(all_where) if all_where else "true"

    query = (
        f"MATCH path = shortestPath("
        f"(start:`{start_label}`)-[{rel_type_expr}*..{max_length}]-(end:`{end_label}`)"
        f") "
        f"WHERE {where_str} "
        f"RETURN path "
        f"LIMIT {limit}"
    )

    results = db.send_query(query, {"start_filter": start_filter, "end_filter": end_filter})
    return results


def count_and_summarize(
    label_or_type: str,
    tool_context: ToolContext,
    kind: str = "node",
    group_by_property: Optional[str] = None,
    limit: int = 10,
) -> Dict[str, Any]:
    """Get counts and property distributions for a node label or relationship type. Useful for understanding the data landscape before writing targeted queries.

    Args:
        label_or_type: The node label (e.g. 'Person') or relationship type (e.g. 'WORKS_AT') to summarize.
        tool_context: ToolContext object.
        kind: Whether label_or_type refers to a 'node' or 'relationship' (default 'node').
        group_by_property: Optional property to group by and show value distribution (e.g. 'department').
        limit: Maximum number of groups to return when using group_by_property (default 10).

    Returns:
        A dict with status and records containing total count and optionally a breakdown by property value.
    """
    db, db_err, _ = get_db_or_error(tool_context)
    if db_err:
        return db_err

    err = _validate_symbol(label_or_type, "label or relationship type")
    if err:
        return err

    if group_by_property and not is_symbol(group_by_property):
        return tool_error(f"Invalid property name: '{group_by_property}'.")

    limit = max(1, min(limit, 50))

    if kind == "relationship":
        if group_by_property:
            query = (
                f"MATCH ()-[r:`{label_or_type}`]->() "
                f"RETURN r.`{group_by_property}` AS value, count(r) AS count "
                f"ORDER BY count DESC LIMIT {limit}"
            )
        else:
            query = (
                f"MATCH ()-[r:`{label_or_type}`]->() "
                f"RETURN count(r) AS total_count"
            )
    else:
        if group_by_property:
            query = (
                f"MATCH (n:`{label_or_type}`) "
                f"RETURN n.`{group_by_property}` AS value, count(n) AS count "
                f"ORDER BY count DESC LIMIT {limit}"
            )
        else:
            query = (
                f"MATCH (n:`{label_or_type}`) "
                f"RETURN count(n) AS total_count"
            )

    results = db.send_query(query)
    return results
