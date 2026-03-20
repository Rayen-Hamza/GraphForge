"""
Phase 1: Neo4j Aura connection health check.

Run from repo root:
    python tests/test_neo4j.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.api.agents.tools.cypher_tools import neo4j_is_ready, read_neo4j_cypher, get_neo4j_import_dir
from src.api.infra.neo4j import get_graphdb


def main():
    print("=== Neo4j Aura Connection Test ===\n")

    # 1. Health check
    print("[1] neo4j_is_ready()...")
    result = neo4j_is_ready()
    print("   ", result)
    assert result["status"] == "success", f"FAILED: {result}"
    print("    OK\n")

    # 2. Simple query
    print("[2] RETURN 1 AS ok...")
    result = read_neo4j_cypher("RETURN 1 AS ok")
    print("   ", result)
    assert result["status"] == "success", f"FAILED: {result}"
    assert result["records"][0]["ok"] == 1
    print("    OK\n")

    # 3. DB config (expected to fail on Aura — just informational)
    print("[3] get_neo4j_import_dir() [may fail on Aura]...")
    result = get_neo4j_import_dir()
    if result["status"] == "success":
        print("    Import dir:", result["neo4j_import_dir"])
    else:
        print("    (expected on Aura):", result["error_message"])
    print()

    # 4. Count existing nodes
    print("[4] Node count in DB...")
    result = read_neo4j_cypher("MATCH (n) RETURN count(n) AS total")
    print("    Total nodes:", result["records"][0]["total"])
    print("    OK\n")

    print("=== All connection tests passed ===")


if __name__ == "__main__":
    main()
