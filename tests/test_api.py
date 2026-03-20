"""
Phase 5: Full API test using HTTP + SSE.

Prerequisite: API must be running:
    uvicorn src.api.main:app --reload --port 8000

Run from repo root:
    python tests/test_api.py [base_url]

Default base_url: http://localhost:8000

Install httpx if needed:
    pip install httpx
"""
import sys
import os
import json
import uuid

# httpx is required; give a helpful error if missing
try:
    import httpx
except ImportError:
    print("ERROR: httpx is not installed. Run: pip install httpx")
    sys.exit(1)

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
AGENTS_BASE = f"{BASE_URL}/api/v1/agents"


def sep(title=""):
    print(f"\n{'=' * 50}")
    if title:
        print(title)
        print("=" * 50)


def check_health(client):
    sep("STEP 0: Health check")
    r = client.get(f"{BASE_URL}/")
    print(f"  GET /  ->  {r.status_code}: {r.text[:100]}")
    assert r.status_code == 200, f"API not reachable: {r.status_code}"
    print("  OK")


def create_session(client, user_id, session_id):
    sep("STEP 1: Create session")
    r = client.post(f"{AGENTS_BASE}/sessions", json={
        "user_id": user_id,
        "session_id": session_id,
        "initial_state": {}
    })
    print(f"  POST /sessions  ->  {r.status_code}: {r.text[:200]}")
    assert r.status_code == 200, f"Failed to create session: {r.text}"
    print("  OK")
    return r.json()


def get_session_state(client, session_id, user_id="test_user"):
    r = client.get(f"{AGENTS_BASE}/sessions/{session_id}", params={"user_id": user_id})
    print(f"  GET /sessions/{session_id}  ->  {r.status_code}")
    if r.status_code == 200:
        state = r.json()
        print(f"  State keys: {list(state.get('state', {}).keys())}")
        return state
    else:
        print(f"  WARN: {r.text[:200]}")
        return {}


def stream_run(client, session_id, user_id, message, max_events=50):
    """POST a message and stream SSE events. Returns list of parsed event dicts."""
    print(f"\n  >> User: {message}")
    events = []
    with client.stream("POST", f"{AGENTS_BASE}/sessions/{session_id}/run",
                       json={"user_id": user_id, "message": message},
                       timeout=120.0) as resp:
        assert resp.status_code == 200, f"Stream failed: {resp.status_code}"
        for line in resp.iter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                data = line[6:]
                if data == "[DONE]":
                    print("  [DONE]")
                    break
                try:
                    event = json.loads(data)
                    events.append(event)
                    author = event.get("author", "?")
                    content = event.get("content", {})
                    # Print final text parts
                    if not event.get("partial") and content:
                        parts = content.get("parts", [])
                        for part in parts:
                            text = part.get("text", "")
                            if text and text.strip():
                                print(f"  [{author}]: {text[:300]}")
                    if len(events) >= max_events:
                        print(f"  (max_events={max_events} reached, stopping)")
                        break
                except json.JSONDecodeError:
                    pass
    return events


def main():
    sep("GraphForge API Test")
    print(f"Target: {BASE_URL}\n")

    user_id = "test_user"
    session_id = f"test_{uuid.uuid4().hex[:8]}"

    with httpx.Client(timeout=30.0) as client:
        # 0. Health check
        check_health(client)

        # 1. Create session
        create_session(client, user_id, session_id)

        # 2. Turn 1 — user intent
        sep("STEP 2: Turn 1 — User intent (SSE stream)")
        events = stream_run(client, session_id, user_id,
            "I want to build a furniture supply chain knowledge graph "
            "that tracks products, components, and suppliers.",
            max_events=100
        )
        print(f"  Events received: {len(events)}")
        get_session_state(client, session_id)

        # 3. Turn 2 — file selection
        sep("STEP 3: Turn 2 — File selection (SSE stream)")
        events = stream_run(client, session_id, user_id,
            "Use products.csv, suppliers.csv, components.csv, and part_supplier_mapping.csv.",
            max_events=100
        )
        print(f"  Events received: {len(events)}")
        get_session_state(client, session_id)

        # 4. Turn 3 — schema proposal
        sep("STEP 4: Turn 3 — Schema proposal (SSE stream)")
        events = stream_run(client, session_id, user_id,
            "Propose a graph schema for those files and approve it.",
            max_events=150
        )
        print(f"  Events received: {len(events)}")
        get_session_state(client, session_id)

        # 5. Turn 4 — build graph
        sep("STEP 5: Turn 4 — Build graph (SSE stream)")
        events = stream_run(client, session_id, user_id,
            "Build the knowledge graph now.",
            max_events=100
        )
        print(f"  Events received: {len(events)}")
        get_session_state(client, session_id)

        # 6. Turn 5 — query
        sep("STEP 6: Turn 5 — Graph query (SSE stream)")
        events = stream_run(client, session_id, user_id,
            "Which supplier provides the most components? Give me the top 3.",
            max_events=100
        )
        print(f"  Events received: {len(events)}")

    sep("ALL API TESTS COMPLETE")


if __name__ == "__main__":
    main()
