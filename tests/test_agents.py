"""
Phase 3: Individual agent tests using ADK Runner directly (no HTTP).

Tests each agent in isolation by pre-seeding the required session state.
Prints all events streamed by each agent so you can observe its behavior.

Run from repo root:
    python tests/test_agents.py [agent_name]

Where agent_name is one of:
    user_intent, file_suggestion, schema_proposal, graph_construction, graphrag, all (default)

Examples:
    python tests/test_agents.py user_intent
    python tests/test_agents.py all
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# HTTP base URL for CSVs (used for graph_construction test)
HTTP_BASE = "http://localhost:8080"

APP_NAME = "graphforge_test"


async def run_agent(agent, messages, initial_state=None, user_id="u1", session_id="s1"):
    """Run an agent through one or more messages, printing all events. Returns final session."""
    svc = InMemorySessionService()
    await svc.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state=initial_state or {}
    )
    runner = Runner(agent=agent, app_name=APP_NAME, session_service=svc)

    if isinstance(messages, str):
        messages = [messages]

    for msg in messages:
        print(f"\n  >> User: {msg}")
        content = types.Content(role="user", parts=[types.Part(text=msg)])
        async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
            author = getattr(event, "author", "?")
            # Print text content from final events only (not partials)
            if hasattr(event, "content") and event.content:
                for part in (event.content.parts or []):
                    if hasattr(part, "text") and part.text:
                        partial = getattr(event, "partial", False)
                        if not partial:
                            print(f"  [{author}]: {part.text[:300]}")
            # Print tool calls
            if hasattr(event, "get_function_calls"):
                for fc in (event.get_function_calls() or []):
                    print(f"  [{author}] tool_call: {fc.name}({dict(fc.args)})")
            # Print tool responses
            if hasattr(event, "get_function_responses"):
                for fr in (event.get_function_responses() or []):
                    resp_str = str(fr.response)[:200]
                    print(f"  [{author}] tool_resp ({fr.name}): {resp_str}")

    session = await svc.get_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)
    return session


# ---------------------------------------------------------------------------
# Individual agent test functions
# ---------------------------------------------------------------------------

async def test_user_intent_agent():
    print("\n" + "=" * 60)
    print("TEST: User Intent Agent")
    print("=" * 60)
    from src.api.agents.user_intent_agent.agent import user_intent_agent

    session = await run_agent(
        user_intent_agent,
        messages=[
            "I want to build a furniture supply chain knowledge graph "
            "to track products, components, and suppliers.",
            "Yes, that's correct. Please approve it.",
        ],
    )

    state = session.state
    print("\n  Final session state keys:", list(state.keys()))
    print("  kind_of_graph:", state.get("kind_of_graph"))
    print("  graph_description:", str(state.get("graph_description", ""))[:200])
    print("  status:", state.get("status"))
    print("  PASSED" if state.get("status") == "approved" else "  NOTE: status not yet 'approved'")


async def test_file_suggestion_agent():
    print("\n" + "=" * 60)
    print("TEST: File Suggestion Agent")
    print("=" * 60)
    from src.api.agents.file_suggestion_agent.agent import file_suggestion_agent

    initial = {
        "approved_user_goal": {
            "kind_of_graph": "furniture supply chain",
            "graph_description": "A graph tracking products, components, assemblies, and suppliers.",
        },
    }

    session = await run_agent(
        file_suggestion_agent,
        messages=[
            "Which CSV files should I use to build this graph?",
            "Yes, approve all of them.",
        ],
        initial_state=initial,
    )

    state = session.state
    print("\n  Final session state keys:", list(state.keys()))
    print("  suggested_file_list:", state.get("suggested_file_list"))
    print("  approved_file_list:", state.get("approved_file_list"))


async def test_schema_proposal_agent():
    print("\n" + "=" * 60)
    print("TEST: Schema Proposal Agent")
    print("=" * 60)
    from src.api.agents.schema_proposal_agent.agent import schema_proposal_agent

    initial = {
        "approved_user_goal": {
            "kind_of_graph": "furniture supply chain",
            "graph_description": "A graph tracking products, components, assemblies, and suppliers.",
        },
        "approved_file_list": ["products.csv", "suppliers.csv", "components.csv", "part_supplier_mapping.csv"],
    }

    session = await run_agent(
        schema_proposal_agent,
        messages=[
            "Propose a graph schema for the approved files.",
            "Looks good. Now propose the node and relationship construction rules using the tools.",
            "Good. Approve the construction plan now.",
        ],
        initial_state=initial,
    )

    state = session.state
    print("\n  Final session state keys:", list(state.keys()))
    plan = state.get("approved_construction_plan") or state.get("proposed_construction_plan")
    if plan:
        print(f"  Construction plan has {len(plan)} rules")
        for key, rule in list(plan.items())[:3]:
            print(f"    {key}: {rule.get('construction_type')} - {rule.get('label', rule.get('relationship_type', ''))}")
    else:
        print("  No construction plan in state yet")


async def test_graph_construction_agent():
    print("\n" + "=" * 60)
    print("TEST: Graph Construction Agent")
    print("=" * 60)
    from src.api.agents.graph_construction_agent.agent import graph_construction_agent
    from src.api.agents.tools.cypher_tools import reset_neo4j_data, read_neo4j_cypher

    print("  Resetting DB before test...")
    reset_neo4j_data()

    # NOTE: graph_construction_agent uses LOAD CSV which requires public HTTP URLs on Aura.
    # We use a pre-seeded construction plan that points to the fallback data dir files via
    # relative paths (will try file:/// on local Neo4j, needs HTTP on Aura).
    # For Aura testing, the agent will fail at LOAD CSV — this tests the agent invocation
    # and tool dispatch, not the actual import (covered by test_kg_construction.py).
    initial = {
        "approved_user_goal": {
            "kind_of_graph": "furniture supply chain",
            "graph_description": "A graph tracking products, components, assemblies, and suppliers.",
        },
        "approved_file_list": ["products.csv", "suppliers.csv"],
        "approved_construction_plan": {
            "product_nodes": {
                "construction_type": "node",
                "label": "Product",
                "source_file": "products.csv",
                "unique_column_name": "product_id",
                "properties": ["product_id", "product_name", "price", "description"],
            },
            "supplier_nodes": {
                "construction_type": "node",
                "label": "Supplier",
                "source_file": "suppliers.csv",
                "unique_column_name": "supplier_id",
                "properties": ["supplier_id", "name", "specialty", "city", "country"],
            },
        }
    }

    session = await run_agent(
        graph_construction_agent,
        messages=[
            "Build the graph from the approved construction plan.",
            "Please call build_graph_from_construction_rules now to construct the graph.",
        ],
        initial_state=initial,
    )

    state = session.state
    print("\n  Final session state keys:", list(state.keys()))

    r = read_neo4j_cypher("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c")
    if r["status"] == "success":
        print("  Neo4j node counts after construction:")
        for row in r["records"]:
            print(f"    {row['label']}: {row['c']}")


async def test_graphrag_agent():
    print("\n" + "=" * 60)
    print("TEST: GraphRAG Agent")
    print("=" * 60)
    from src.api.agents.graphrag_agent.agent import graphrag_agent

    session = await run_agent(
        graphrag_agent,
        "How many nodes are there in total in the graph? Also list all node labels.",
    )

    state = session.state
    print("\n  Final session state keys:", list(state.keys()))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

TESTS = {
    "user_intent": test_user_intent_agent,
    "file_suggestion": test_file_suggestion_agent,
    "schema_proposal": test_schema_proposal_agent,
    "graph_construction": test_graph_construction_agent,
    "graphrag": test_graphrag_agent,
}


async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        for name, fn in TESTS.items():
            await fn()
    elif target in TESTS:
        await TESTS[target]()
    else:
        print(f"Unknown agent: {target}. Choose from: {list(TESTS.keys())} or 'all'")
        sys.exit(1)

    print("\n\n=== Agent tests complete ===")


if __name__ == "__main__":
    asyncio.run(main())
