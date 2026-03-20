"""
Phase 2: KG construction tools test — direct Python CSV import via Cypher UNWIND.

Reads CSV files locally (data/) and imports them into Neo4j using UNWIND + MERGE.
This works with any Neo4j instance (local or Aura) without needing public URLs.

Run from repo root:
    python tests/test_kg_construction.py

WARNING: This test resets the Neo4j database before running.
"""
import sys
import os
import csv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

from src.api.agents.tools.cypher_tools import (
    neo4j_is_ready,
    reset_neo4j_data,
    write_neo4j_cypher,
    read_neo4j_cypher,
    create_uniqueness_constraint,
    get_physical_schema,
)


def read_csv(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def import_nodes_unwind(rows: list[dict], label: str, unique_key: str, batch_size=500) -> dict:
    """Import nodes using UNWIND batches. Returns last result."""
    result = {"status": "success", "records": []}
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        query = f"""UNWIND $rows AS row
        MERGE (n:{label} {{{unique_key}: row['{unique_key}']}})
        SET n += row"""
        r = write_neo4j_cypher(query, {"rows": batch})
        if r["status"] == "error":
            return r
        result = r
    return result


def import_relationships_unwind(rows: list[dict], from_label, from_key, to_label, to_key, rel_type, batch_size=500) -> dict:
    """Import relationships using UNWIND batches."""
    result = {"status": "success", "records": []}
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        query = f"""UNWIND $rows AS row
        MATCH (a:{from_label} {{{from_key}: row['{from_key}']}})
        MATCH (b:{to_label} {{{to_key}: row['{to_key}']}})
        MERGE (a)-[r:{rel_type}]->(b)
        SET r += row"""
        r = write_neo4j_cypher(query, {"rows": batch})
        if r["status"] == "error":
            return r
        result = r
    return result


def ok(label, result):
    status = result.get("status") if isinstance(result, dict) else "unknown"
    mark = "OK" if status == "success" else "FAIL"
    print(f"  [{mark}] {label}")
    if status != "success":
        print(f"         Error: {result.get('error_message', result)}")
    return status == "success"


def count_nodes(label):
    r = read_neo4j_cypher(f"MATCH (n:{label}) RETURN count(n) AS c")
    return r["records"][0]["c"] if r["status"] == "success" else -1


def main():
    print("=== KG Construction Tools Test (UNWIND Direct Import) ===\n")
    print(f"Reading CSVs from: {os.path.abspath(DATA_DIR)}\n")

    # 1. Health check
    print("[1] Health check...")
    r = neo4j_is_ready()
    assert ok("neo4j_is_ready", r), "ABORT: DB not ready"
    print()

    # 2. Reset
    print("[2] Reset DB...")
    r = reset_neo4j_data()
    assert ok("reset_neo4j_data", r), "ABORT: could not reset"
    print()

    # 3. Load Products
    print("[3] Import Product nodes from products.csv...")
    rows = read_csv("products.csv")
    print(f"    CSV rows: {len(rows)}  |  columns: {list(rows[0].keys())}")
    create_uniqueness_constraint("Product", "product_id")
    r = import_nodes_unwind(rows, "Product", "product_id")
    ok("import Product nodes", r)
    count = count_nodes("Product")
    print(f"    Product count in Neo4j: {count}")
    assert count == len(rows), f"FAILED: expected {len(rows)} got {count}"
    print()

    # 4. Load Suppliers
    print("[4] Import Supplier nodes from suppliers.csv...")
    rows = read_csv("suppliers.csv")
    print(f"    CSV rows: {len(rows)}  |  columns: {list(rows[0].keys())}")
    create_uniqueness_constraint("Supplier", "supplier_id")
    r = import_nodes_unwind(rows, "Supplier", "supplier_id")
    ok("import Supplier nodes", r)
    count = count_nodes("Supplier")
    print(f"    Supplier count in Neo4j: {count}")
    assert count == len(rows), f"FAILED: expected {len(rows)} got {count}"
    print()

    # 5. Load Components
    print("[5] Import Component nodes from components.csv...")
    rows = read_csv("components.csv")
    print(f"    CSV rows: {len(rows)}  |  columns: {list(rows[0].keys())}")
    create_uniqueness_constraint("Component", "part_id")
    r = import_nodes_unwind(rows, "Component", "part_id")
    ok("import Component nodes", r)
    count = count_nodes("Component")
    print(f"    Component count in Neo4j: {count}")
    print()

    # 6. Load Assemblies
    print("[6] Import Assembly nodes from assemblies.csv...")
    rows = read_csv("assemblies.csv")
    print(f"    CSV rows: {len(rows)}  |  columns: {list(rows[0].keys())}")
    print(f"    (columns: {list(rows[0].keys())})")
    # Use first column as unique key
    unique_key = list(rows[0].keys())[0]
    create_uniqueness_constraint("Assembly", unique_key)
    r = import_nodes_unwind(rows, "Assembly", unique_key)
    ok("import Assembly nodes", r)
    count = count_nodes("Assembly")
    print(f"    Assembly count in Neo4j: {count}")
    print()

    # 7. Load SUPPLIES relationships (Supplier → Component)
    print("[7] Import SUPPLIES relationships from part_supplier_mapping.csv...")
    rows = read_csv("part_supplier_mapping.csv")
    print(f"    CSV rows: {len(rows)}  |  columns: {list(rows[0].keys())}")
    r = import_relationships_unwind(rows, "Supplier", "supplier_id", "Component", "part_id", "SUPPLIES")
    ok("import SUPPLIES relationships", r)
    r2 = read_neo4j_cypher("MATCH ()-[r:SUPPLIES]->() RETURN count(r) AS c")
    rel_count = r2["records"][0]["c"] if r2["status"] == "success" else -1
    print(f"    SUPPLIES relationship count: {rel_count}")
    print()

    # 8. Schema
    print("[8] Physical schema after full import...")
    r = get_physical_schema()
    ok("get_physical_schema", r)
    if r["status"] == "success":
        node_labels = list(r["schema"].get("node_props", {}).keys())
        rel_types = list(r["schema"].get("rel_props", {}).keys())
        print(f"    Node labels: {node_labels}")
        print(f"    Relationship types: {rel_types}")
    print()

    # 9. Sample analytics query
    print("[9] Top suppliers by components supplied...")
    r = read_neo4j_cypher("""
        MATCH (s:Supplier)-[:SUPPLIES]->(c:Component)
        RETURN s.name AS supplier, count(c) AS parts
        ORDER BY parts DESC LIMIT 5
    """)
    ok("analytics query", r)
    if r["status"] == "success":
        for row in r["records"]:
            print(f"    {row['supplier']}: {row['parts']} parts")
    print()

    print("=== KG construction tests complete ===")


if __name__ == "__main__":
    main()
