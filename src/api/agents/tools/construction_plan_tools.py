from google.adk.tools import ToolContext
from typing import Dict, Any

from agents.common.tool_result import tool_success, tool_error
from agents.tools.file_tools import search_file

PROPOSED_CONSTRUCTION_PLAN = "proposed_construction_plan"
APPROVED_CONSTRUCTION_PLAN = "approved_construction_plan"

#  Tool: Propose Node Construction

NODE_CONSTRUCTION = "node_construction"

def propose_node_construction(approved_file: str, proposed_label: str, unique_column_name: str, proposed_properties: list[str], tool_context: ToolContext) -> dict:
    """Propose a node construction for an approved file that supports the user goal.

    Args:
        approved_file: The approved file to propose a node construction for
        proposed_label: The proposed label for constructed nodes
        unique_column_name: The name of the column that will be used to uniquely identify constructed nodes
        proposed_properties: A list of property names for the node

    Returns:
        dict: A dictionary containing metadata about the content.
    """
    search_results = search_file(approved_file, unique_column_name, tool_context)
    if search_results["status"] == "error":
        return search_results
    if search_results["search_results"]["metadata"]["lines_found"] == 0:
        return tool_error(f"{approved_file} does not have the column {unique_column_name}. Check the file content and try again.")

    construction_plan = tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN, {})
    node_construction_rule = {
        "construction_type": "node",
        "source_file": approved_file,
        "label": proposed_label,
        "unique_column_name": unique_column_name,
        "properties": proposed_properties
    }
    construction_plan[proposed_label] = node_construction_rule
    tool_context.state[PROPOSED_CONSTRUCTION_PLAN] = construction_plan
    return tool_success(NODE_CONSTRUCTION, node_construction_rule)

def remove_node_construction(node_label: str, tool_context: ToolContext) -> dict:
    """Remove a node construction from the proposed construction plan based on label."""
    construction_plan = tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN, {})
    if node_label not in construction_plan:
       return tool_success("node construction rule not found. removal not needed.")

    del construction_plan[node_label]

    tool_context.state[PROPOSED_CONSTRUCTION_PLAN] = construction_plan
    return tool_success("node_construction_removed", node_label)

#  Tool: Propose Relationship Construction

RELATIONSHIP_CONSTRUCTION = "relationship_construction"

def propose_relationship_construction(approved_file: str, proposed_relationship_type: str,
    from_node_label: str, from_node_column: str, to_node_label: str, to_node_column: str,
    proposed_properties: list[str],
    tool_context: ToolContext) -> dict:
    """Propose a relationship construction for an approved file that supports the user goal.

    Args:
        approved_file: The approved file to propose a relationship construction for
        proposed_relationship_type: The proposed type for constructed relationships
        from_node_label: The label of the source node
        from_node_column: The column name identifying source nodes
        to_node_label: The label of the target node
        to_node_column: The column name identifying target nodes
        proposed_properties: A list of property names for the relationship

    Returns:
        dict: A dictionary containing metadata about the content.
    """
    search_results = search_file(approved_file, from_node_column, tool_context)
    if search_results["status"] == "error":
      return search_results
    if search_results["search_results"]["metadata"]["lines_found"] == 0:
        return tool_error(f"{approved_file} does not have the from node column {from_node_column}. Check the content of the file and reconsider the relationship.")

    search_results = search_file(approved_file, to_node_column, tool_context)
    if search_results["status"] == "error" or search_results["search_results"]["metadata"]["lines_found"] == 0:
        return tool_error(f"{approved_file} does not have the to node column {to_node_column}. Check the content of the file and reconsider the relationship.")

    construction_plan = tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN, {})
    relationship_construction_rule = {
        "construction_type": "relationship",
        "source_file": approved_file,
        "relationship_type": proposed_relationship_type,
        "from_node_label": from_node_label,
        "from_node_column": from_node_column,
        "to_node_label": to_node_label,
        "to_node_column": to_node_column,
        "properties": proposed_properties
    }
    construction_plan[proposed_relationship_type] = relationship_construction_rule
    tool_context.state[PROPOSED_CONSTRUCTION_PLAN] = construction_plan
    return tool_success(RELATIONSHIP_CONSTRUCTION, relationship_construction_rule)

def remove_relationship_construction(relationship_type: str, tool_context: ToolContext) -> dict:
    """Remove a relationship construction from the proposed construction plan based on type."""
    construction_plan = tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN, {})

    if relationship_type not in construction_plan:
        return tool_success("relationship_construction_removed", "relationship construction rule not found. removal not needed.")

    construction_plan.pop(relationship_type)

    tool_context.state[PROPOSED_CONSTRUCTION_PLAN] = construction_plan
    return tool_success("relationship_construction_removed", relationship_type)


def approve_proposed_construction_plan(tool_context: ToolContext) -> dict:
    """Approve the proposed construction plan."""
    tool_context.state[APPROVED_CONSTRUCTION_PLAN] = tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN)
    return tool_success(APPROVED_CONSTRUCTION_PLAN, tool_context.state[APPROVED_CONSTRUCTION_PLAN])

def get_proposed_construction_plan(tool_context: ToolContext) -> dict:
    """Get the proposed construction plan."""
    return tool_context.state.get(PROPOSED_CONSTRUCTION_PLAN, [])


def get_approved_construction_plan(tool_context: ToolContext) -> dict:
    """Get the approved construction plan."""
    return tool_context.state.get(APPROVED_CONSTRUCTION_PLAN, [])
