import csv
import logging
from pathlib import Path

from google.adk.tools import ToolContext
from typing import Dict, Any, List

from infra.neo4j import get_graphdb
from agents.tools.cypher_tools import create_uniqueness_constraint
from agents.common.tool_result import tool_success, tool_error

logger = logging.getLogger(__name__)

graphdb = get_graphdb()

APPROVED_CONSTRUCTION_PLAN = "approved_construction_plan"

# Fallback data directory: project root / data/
_FALLBACK_DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data"


def _resolve_csv_path(source_file: str) -> Path | None:
    """Resolve a source file name to an absolute path in the data directory."""
    from agents.tools.cypher_tools import get_neo4j_import_dir

    result = get_neo4j_import_dir()
    if result["status"] == "success":
        p = Path(result["neo4j_import_dir"]) / source_file
        if p.exists():
            return p

    p = _FALLBACK_DATA_DIR / source_file
    if p.exists():
        return p

    return None


def _read_csv(source_file: str) -> tuple[list[dict], str | None]:
    """Read a CSV file and return (rows_as_dicts, error_message)."""
    path = _resolve_csv_path(source_file)
    if path is None:
        return [], f"CSV file not found: {source_file}"

    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        return rows, None
    except Exception as e:
        return [], f"Error reading {source_file}: {e}"


BATCH_SIZE = 500


def load_nodes_from_csv(
    source_file: str,
    label: str,
    unique_column_name: str,
    properties: list[str],
) -> Dict[str, Any]:
    """Batch loading of nodes from a CSV file using UNWIND."""

    rows, err = _read_csv(source_file)
    if err:
        return tool_error(err)

    all_props = list({unique_column_name} | set(properties))
    set_clauses = ", ".join(f"n.`{prop}` = row.`{prop}`" for prop in properties)

    query = f"""UNWIND $rows AS row
    MERGE (n:`{label}` {{ `{unique_column_name}`: row.`{unique_column_name}` }})
    SET {set_clauses}
    """

    total_loaded = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = [{k: r.get(k) for k in all_props} for r in rows[i:i + BATCH_SIZE]]
        result = graphdb.send_query(query, {"rows": batch})
        if result["status"] == "error":
            return result
        total_loaded += len(batch)

    logger.info(f"Loaded {total_loaded} {label} nodes from {source_file}")
    return tool_success("records", [{"nodes_loaded": total_loaded, "label": label}])


def import_nodes(node_construction: dict) -> dict:
    """Import nodes as defined by a node construction rule."""

    uniqueness_result = create_uniqueness_constraint(
        node_construction["label"],
        node_construction["unique_column_name"]
    )

    if (uniqueness_result["status"] == "error"):
        return uniqueness_result

    load_nodes_result = load_nodes_from_csv(
        node_construction["source_file"],
        node_construction["label"],
        node_construction["unique_column_name"],
        node_construction["properties"]
    )

    return load_nodes_result


def import_relationships(relationship_construction: dict) -> Dict[str, Any]:
    """Import relationships as defined by a relationship construction rule."""

    from_node_column = relationship_construction["from_node_column"]
    to_node_column = relationship_construction["to_node_column"]
    from_label = relationship_construction["from_node_label"]
    to_label = relationship_construction["to_node_label"]
    rel_type = relationship_construction["relationship_type"]
    properties = relationship_construction["properties"]
    source_file = relationship_construction["source_file"]

    rows, err = _read_csv(source_file)
    if err:
        return tool_error(err)

    needed_cols = list({from_node_column, to_node_column} | set(properties))
    set_clauses = ", ".join(f"r.`{prop}` = row.`{prop}`" for prop in properties)
    set_line = f"SET {set_clauses}" if properties else ""

    query = f"""UNWIND $rows AS row
    MATCH (from_node:`{from_label}` {{ `{from_node_column}`: row.`{from_node_column}` }}),
          (to_node:`{to_label}` {{ `{to_node_column}`: row.`{to_node_column}` }})
    MERGE (from_node)-[r:`{rel_type}`]->(to_node)
    {set_line}
    """

    total_loaded = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = [{k: r.get(k) for k in needed_cols} for r in rows[i:i + BATCH_SIZE]]
        result = graphdb.send_query(query, {"rows": batch})
        if result["status"] == "error":
            return result
        total_loaded += len(batch)

    logger.info(f"Created {total_loaded} {rel_type} relationships from {source_file}")
    return tool_success("records", [{"relationships_loaded": total_loaded, "type": rel_type}])


def construct_domain_graph(construction_plan: dict) -> Dict[str, Any]:
    """Construct a domain graph according to a construction plan."""

    logger.info(f"Building domain graph from approved construction plan")

    node_constructions = [value for value in construction_plan.values() if value['construction_type'] == 'node']
    for node_construction in node_constructions:
        result = import_nodes(node_construction)
        if result["status"] == "error":
            return result

    relationship_constructions = [value for value in construction_plan.values() if value['construction_type'] == 'relationship']
    for relationship_construction in relationship_constructions:
        result = import_relationships(relationship_construction)
        if result["status"] == "error":
            return result

    return tool_success("domain_graph_constructed", construction_plan)

def build_graph_from_construction_rules(tool_context: ToolContext) -> Dict[str, Any]:
    """Build a graph from the approved construction rules."""
    if not APPROVED_CONSTRUCTION_PLAN in tool_context.state:
        return tool_error(f"{APPROVED_CONSTRUCTION_PLAN} not set.")

    approved_construction_plan = tool_context.state[APPROVED_CONSTRUCTION_PLAN]

    return construct_domain_graph(approved_construction_plan)
