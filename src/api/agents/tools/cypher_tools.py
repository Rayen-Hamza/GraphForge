from typing import Any, Optional, Dict

from google.adk.tools import ToolContext

from neo4j_graphrag.schema import get_structured_schema

from infra.neo4j import is_write_query, is_symbol
from infra.neo4j_manager import neo4j_manager, get_db_or_error
from agents.common.tool_result import tool_success, tool_error


def _get_db(tool_context: ToolContext):
    """Resolve Neo4j connection from tool context. Returns (db, error_dict, is_read_only)."""
    return get_db_or_error(tool_context)


def neo4j_is_ready(tool_context: ToolContext):
    """Tool to check that the Neo4j database is ready.
    Replies with either a positive message about the database being ready or an error message.
    """
    db, err, _ = _get_db(tool_context)
    if err:
        return err

    results = db.send_query("RETURN 'Neo4j is Ready!' as message")
    return results


def get_physical_schema(tool_context: ToolContext) -> Dict[str, Any]:
    """Tool to get the physical schema of a Neo4j graph database.

    Returns:
        A dictionary containing:
        - "status": "success" or "error"
        - "schema": the schema as a JSON object if "success"
        - "error_message": the error message if "error"
    """
    db, err, _ = _get_db(tool_context)
    if err:
        return err

    driver = db.get_driver()
    database_name = db.get_config().database

    try:
        schema = get_structured_schema(driver, database=database_name)
        return tool_success("schema", schema)
    except Exception as e:
        return tool_error(str(e))

def read_neo4j_cypher(
    query: str,
    tool_context: ToolContext,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Submits a Cypher query to read from a Neo4j database.

    Args:
        query: The Cypher query string to execute.
        tool_context: ToolContext object.
        params: Optional parameters to pass to the query.

    Returns:
        A list of dictionaries containing the results of the query.
        Returns an empty list "[]" if no results are found.

    """
    if is_write_query(query):
        return tool_error("Only MATCH queries are allowed for read-query")

    db, err, _ = _get_db(tool_context)
    if err:
        return err

    results = db.send_query(query, params)
    return results

def write_neo4j_cypher(
    query: str,
    tool_context: ToolContext,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Submits a Cypher query to write to a Neo4j database.
    Make sure you have permission to write before calling this.

    Args:
        query: The Cypher query string to execute.
        tool_context: ToolContext object.
        params: Optional parameters to pass to the query.

    Returns:
        A list of dictionaries containing the results of the query.
        Returns an empty list "[]" if no results are found.
    """
    db, err, is_read_only = _get_db(tool_context)
    if err:
        return err
    if is_read_only:
        return tool_error("Demo mode: write operations are not allowed. Connect your own Neo4j instance in Settings.")

    results = db.send_query(query, params)
    return results

def reset_neo4j_data(tool_context: ToolContext) -> Dict[str, Any]:
    """Resets the neo4j graph database by removing all data,
    indexes and constraints.
    Use with caution! Confirm with the user
    that they know this will completely reset the database.

    Returns:
        Success or an error.
    """
    db, err, is_read_only = _get_db(tool_context)
    if err:
        return err
    if is_read_only:
        return tool_error("Demo mode: cannot reset database. Connect your own Neo4j instance in Settings.")

    # First, remove all nodes and relationships in batches
    data_removed = db.send_query("""MATCH (n) CALL (n) { DETACH DELETE n } IN TRANSACTIONS OF 10000 ROWS""")
    if (data_removed["status"] == "error"):
        return data_removed

    # remove all constraints
    list_constraints = db.send_query(
        """SHOW CONSTRAINTS YIELD name"""
    )
    if (list_constraints == "error"):
        return list_constraints
    constraint_names = [row["name"] for row in list_constraints["records"]]
    for constraint_name in constraint_names:
        dropped_constraint = db.send_query("""DROP CONSTRAINT $constraint_name""", {"constraint_name": constraint_name})
        if (dropped_constraint["status"] == "error"):
            return dropped_constraint

    # remove all indexes
    list_indexes = db.send_query(
        """SHOW INDEXES YIELD name"""
    )
    if (list_indexes == "error"):
        return list_indexes
    index_names = [row["name"] for row in list_indexes["records"]]
    for index_name in index_names:
        dropped_index = db.send_query("""DROP INDEX $index_name""", {"index_name": index_name})
        if (dropped_index["status"] == "error"):
            return dropped_index

    return tool_success("message", "Neo4j database has been reset.")


def create_uniqueness_constraint(
    label: str,
    unique_property_key: str,
    tool_context: ToolContext,
) -> Dict[str, Any]:
    """Creates a uniqueness constraint for a node label and property key.
    A uniqueness constraint ensures that no two nodes with the same label and property key have the same value.

    Args:
        label: The label of the node to create a constraint for.
        unique_property_key: The property key that should have a unique value.
        tool_context: ToolContext object.

    Returns:
        A dictionary with a status key ('success' or 'error').
    """
    if not is_symbol(label):
        return tool_error(f"Invalid label: '{label}'. Labels cannot contain spaces or be Cypher keywords.")

    if not is_symbol(unique_property_key):
        return tool_error(f"Invalid property key: '{unique_property_key}'. Property keys cannot contain spaces or be Cypher keywords.")

    db, err, is_read_only = _get_db(tool_context)
    if err:
        return err
    if is_read_only:
        return tool_error("Demo mode: cannot create constraints. Connect your own Neo4j instance in Settings.")

    constraint_name = f"{label}_{unique_property_key}_constraint"
    query = f"""CREATE CONSTRAINT {constraint_name} IF NOT EXISTS
    FOR (n:{label})
    REQUIRE n.{unique_property_key} IS UNIQUE"""
    results = db.send_query(query)
    return results

def merge_node_into_graph(label_name: str, id_property_name: str, properties: Dict[str, Any], tool_context: ToolContext) -> Dict[str, Any]:
    """Merges a node into the graph. The label_name/id_property_name pair will
    be used for the MERGE pattern to ensure uniqueness.

    Args:
        label_name: the label of the node to create
        id_property_name: the name of the property that will be used to set the id of the node
        properties: a dictionary of properties to set on the node
        tool_context: ToolContext object.

    Returns:
        dict: A dictionary indicating success or failure.
    """
    query = "MERGE (t:$($label_name) {id: $props[$id_property_name]}) SET t += $props"
    properties = {
        "label_name": label_name,
        "id_property_name": id_property_name,
        "props": properties
    }
    return write_neo4j_cypher(query, tool_context, properties)


def merge_singleton_node_into_graph(label_name: str, properties: Dict[str, Any], tool_context: ToolContext) -> Dict[str, Any]:
    """Merges a singleton node into the graph.

    Args:
        label_name: the label of the node to create
        properties: a dictionary of properties to set on the node
        tool_context: ToolContext object.

    Returns:
        dict: A dictionary indicating success or failure.
    """
    query = "MERGE (t:$($label_name)) SET t += $props"
    properties = {
        "label_name": label_name,
        "props": properties
    }
    return write_neo4j_cypher(query, tool_context, properties)


def get_neo4j_import_dir(tool_context: ToolContext):
    """Get the Neo4j import directory path."""
    db, err, _ = _get_db(tool_context)
    if err:
        return err

    results = db.send_query("""
        Call dbms.listConfig() YIELD name, value
        WHERE name CONTAINS 'directories.import'
        RETURN value as import_dir
        """)
    if results["status"] == "success":
        return tool_success("neo4j_import_dir", results["records"][0]["import_dir"])
    else:
        return tool_error(results["error_message"])
