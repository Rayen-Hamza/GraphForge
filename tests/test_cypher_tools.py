"""
Phase 2: Cypher tool tests against Neo4j Aura.

Tests: reset, write, read, schema, constraints.
WARNING: reset_neo4j_data() DELETES all data. Only run on a test/dev instance.

Run from repo root:
    python tests/test_cypher_tools.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.api.agents.tools.cypher_tools import (
    neo4j_is_ready,
    reset_neo4j_data,
    get_physical_schema,
    write_neo4j_cypher,
    read_neo4j_cypher,
    create_uniqueness_constraint,
)


def ok(label, result):
    status = result.get("status") if isinstance(result, dict) else "unknown"
    mark = "OK" if status == "success" else "WARN"
    print(f"  [{mark}] {label}: {result}")
    return status == "success"


def main():
    print("=== Cypher Tools Test ===\n")

    # 1. Health check
    print("[1] Health check...")
    r = neo4j_is_ready()
    assert ok("neo4j_is_ready", r), "ABORT: DB not ready"
    print()

    # 2. Reset DB
    print("[2] Reset DB (deletes all data)...")
    r = reset_neo4j_data()
    ok("reset_neo4j_data", r)
    print()

    # 3. Schema after reset (should be empty)
    print("[3] Schema after reset...")
    r = get_physical_schema()
    ok("get_physical_schema", r)
    if r["status"] == "success":
        schema = r["schema"]
        node_labels = schema.get("node_props", {})
        print(f"    Node labels: {list(node_labels.keys()) or '(empty)'}")
    print()

    # 4. Write a test node
    print("[4] Write test node...")
    r = write_neo4j_cypher(
        "CREATE (:TestNode {name: $name, value: $val})",
        {"name": "hello", "val": 42}
    )
    ok("write_neo4j_cypher CREATE", r)
    print()

    # 5. Read it back
    print("[5] Read test node back...")
    r = read_neo4j_cypher("MATCH (n:TestNode) RETURN n.name AS name, n.value AS value")
    ok("read_neo4j_cypher MATCH", r)
    if r["status"] == "success" and r["records"]:
        rec = r["records"][0]
        print(f"    Got: name={rec['name']}, value={rec['value']}")
        assert rec["name"] == "hello" and rec["value"] == 42, f"Unexpected values: {rec}"
    print()

    # 6. Create uniqueness constraint
    print("[6] Create uniqueness constraint...")
    r = create_uniqueness_constraint("TestNode", "name")
    ok("create_uniqueness_constraint", r)
    print()

    # 7. Verify constraint appears in schema
    print("[7] Schema after constraint...")
    r = get_physical_schema()
    ok("get_physical_schema (post-constraint)", r)
    print()

    # 8. Reject write queries through read_neo4j_cypher
    print("[8] Read tool blocks write queries...")
    r = read_neo4j_cypher("CREATE (:Sneaky)")
    assert r["status"] == "error", "FAILED: write query should be blocked"
    print(f"  [OK] Blocked as expected: {r['error_message']}")
    print()

    # 9. Cleanup
    print("[9] Cleanup...")
    r = reset_neo4j_data()
    ok("reset_neo4j_data (cleanup)", r)
    print()

    print("=== Cypher tools tests complete ===")


if __name__ == "__main__":
    main()
