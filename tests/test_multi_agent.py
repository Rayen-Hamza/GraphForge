"""
Phase 4: Full multi-agent pipeline test.

Drives the full_workflow_agent through all 5 stages in a single session.
The agent will orchestrate: user_intent → file_suggestion → schema_proposal
→ graph_construction → graphrag.

Prerequisite: Start a local HTTP server from data/ BEFORE running:
    python -m http.server 8080 --directory data/

Run from repo root:
    python tests/test_multi_agent.py

WARNING: This test resets the Neo4j database.
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

APP_NAME = "graphforge_test"
USER_ID = "test_user"
SESSION_ID = "test_session_full"


async def send_message(runner, svc, message: str):
    """Send a message and stream all events, printing key ones."""
    print(f"\n  >> User: {message}")
    content = types.Content(role="user", parts=[types.Part(text=message)])
    async for event in runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=content):
        author = getattr(event, "author", "?")

        # Tool calls
        if hasattr(event, "get_function_calls"):
            for fc in (event.get_function_calls() or []):
                args_preview = str(dict(fc.args))[:150]
                print(f"  [{author}] TOOL CALL: {fc.name}({args_preview})")

        # Final text responses (non-partial)
        if hasattr(event, "content") and event.content and not getattr(event, "partial", False):
            for part in (event.content.parts or []):
                if hasattr(part, "text") and part.text and part.text.strip():
                    print(f"  [{author}]: {part.text[:400]}")

    session = await svc.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    return session


async def main():
    print("=" * 60)
    print("FULL MULTI-AGENT PIPELINE TEST")
    print("=" * 60)

    # Import here so module-level singletons (graphdb, etc.) are initialized after sys.path
    from src.api.agents.multi_agent.agent import full_workflow_agent
    from src.api.agents.tools.cypher_tools import reset_neo4j_data, read_neo4j_cypher

    # Reset DB
    print("\n[0] Resetting Neo4j DB...")
    r = reset_neo4j_data()
    print("   ", "OK" if r["status"] == "success" else f"WARN: {r}")

    # Create session
    svc = InMemorySessionService()
    await svc.create_session(
        app_name=APP_NAME,
        user_id=USER_ID,
        session_id=SESSION_ID,
        state={}
    )
    runner = Runner(agent=full_workflow_agent, app_name=APP_NAME, session_service=svc)

    # Turn 1: Establish user intent
    print("\n" + "-" * 50)
    print("TURN 1: User intent")
    print("-" * 50)
    session = await send_message(runner, svc,
        "I want to build a furniture supply chain knowledge graph "
        "that tracks products, their components, and which suppliers provide those components."
    )
    print(f"\n  State keys after turn 1: {list(session.state.keys())}")

    # Turn 2: File selection
    print("\n" + "-" * 50)
    print("TURN 2: File selection")
    print("-" * 50)
    session = await send_message(runner, svc,
        "Please suggest and use the available CSV files. "
        "Use products.csv, suppliers.csv, components.csv, and part_supplier_mapping.csv."
    )
    print(f"\n  State keys after turn 2: {list(session.state.keys())}")
    print(f"  Suggested files: {session.state.get('suggested_file_list') or session.state.get('approved_file_list')}")

    # Turn 3: Schema proposal
    print("\n" + "-" * 50)
    print("TURN 3: Schema proposal")
    print("-" * 50)
    session = await send_message(runner, svc,
        "Propose a graph schema for those files and approve it."
    )
    print(f"\n  State keys after turn 3: {list(session.state.keys())}")
    plan = session.state.get("approved_construction_plan")
    if plan:
        print(f"  Construction plan: {len(plan)} rules")

    # Turn 4: Build the graph
    print("\n" + "-" * 50)
    print("TURN 4: Build the graph")
    print("-" * 50)
    session = await send_message(runner, svc,
        "Build the knowledge graph now using the approved construction plan."
    )
    print(f"\n  State keys after turn 4: {list(session.state.keys())}")

    # Verify Neo4j state after construction
    print("\n  Verifying Neo4j after construction...")
    r = read_neo4j_cypher("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c ORDER BY c DESC")
    if r["status"] == "success":
        for row in r["records"]:
            print(f"    {row['label']}: {row['c']} nodes")
    r2 = read_neo4j_cypher("MATCH ()-[r]->() RETURN type(r) AS rel_type, count(r) AS c ORDER BY c DESC")
    if r2["status"] == "success":
        for row in r2["records"]:
            print(f"    :{row['rel_type']}: {row['c']} relationships")

    # Turn 5: Query the graph
    print("\n" + "-" * 50)
    print("TURN 5: GraphRAG query")
    print("-" * 50)
    session = await send_message(runner, svc,
        "Which supplier provides the most components? Give me the top 3."
    )
    print(f"\n  State keys after turn 5: {list(session.state.keys())}")

    print("\n" + "=" * 60)
    print("FULL PIPELINE TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
