# GraphForge

![GraphForge banner](docs/assets/graphforge-banner.svg)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white" alt="Neo4j" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Google_ADK-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google ADK" />
  <img src="https://img.shields.io/badge/License-MIT-2f855a?style=for-the-badge" alt="License" />
</p>

GraphForge is a multi-agent intelligence platform that transforms natural language intent into structured knowledge graphs. It orchestrates specialized AI agents to understand queries, research domains, extract entities, and construct Neo4j-based knowledge graphs in real time.

## Highlights

- Multi-agent orchestration for research, extraction, validation, and construction.
- Natural language to graph with real-time SSE streaming.
- BYO Neo4j -- connect your own database or use the built-in demo instance.
- File uploads (CSV, JSON, Markdown, TXT) with drag-and-drop UI.
- Canvas-based graph visualization with live snapshots.
- Redis-backed session management with anonymous and configured modes.
- One-command deployment via Docker Compose.

## Product Preview

![GraphForge UI preview](docs/assets/graphforge-ui-preview.svg)

## Intent-to-Graph Pipeline

![GraphForge pipeline](docs/assets/graphforge-pipeline.svg)

## Tech Stack

<table align="center">
  <tr>
    <th>Layer</th>
    <th>Technologies</th>
  </tr>
  <tr>
    <td><strong>Frontend</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Angular_20-DD0031?style=flat-square&logo=angular&logoColor=white" alt="Angular" />
      <img src="https://img.shields.io/badge/Angular_Material-757575?style=flat-square&logo=angular&logoColor=white" alt="Material" />
      <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    </td>
  </tr>
  <tr>
    <td><strong>Backend</strong></td>
    <td>
      <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
      <img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
      <img src="https://img.shields.io/badge/Uvicorn-2D3748?style=flat-square&logo=gunicorn&logoColor=white" alt="Uvicorn" />
    </td>
  </tr>
  <tr>
    <td><strong>AI / Agents</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Google_ADK-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google ADK" />
      <img src="https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini" />
    </td>
  </tr>
  <tr>
    <td><strong>Database</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Neo4j-008CC1?style=flat-square&logo=neo4j&logoColor=white" alt="Neo4j" />
    </td>
  </tr>
  <tr>
    <td><strong>Infrastructure</strong></td>
    <td>
      <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
      <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
      <img src="https://img.shields.io/badge/nginx-009639?style=flat-square&logo=nginx&logoColor=white" alt="nginx" />
    </td>
  </tr>
  <tr>
    <td><strong>Observability</strong></td>
    <td>
      <img src="https://img.shields.io/badge/OpenTelemetry-000000?style=flat-square&logo=opentelemetry&logoColor=white" alt="OpenTelemetry" />
    </td>
  </tr>
</table>


## Architecture

```mermaid
graph TB
    subgraph Client["Angular UI"]
        UI["Chat Interface<br/>Graph Viewer · File Upload"]
    end

    subgraph API["FastAPI Backend"]
        MW["Middleware<br/>Correlation IDs · Rate Limiting"]
        Router["REST / SSE Routers<br/>chat · sessions · files<br/>connections · graph"]
        Runner["ADK Runner<br/>Session Management"]
    end

    subgraph Orchestrator["Multi-Agent Orchestrator · Google ADK"]
        Root["Root Agent<br/>kg_construction_agent_v1"]

        Root --> A1["User Intent Agent<br/>Parse user goals"]
        Root --> A2["File Suggestion Agent<br/>Dataset exploration"]
        Root --> A3["Schema Proposal Agent<br/>Design graph schema"]
        Root --> A4["Graph Construction Agent<br/>Build knowledge graph"]
        Root --> A5["GraphRAG Agent<br/>Multi-hop retrieval"]
    end

    subgraph Storage["Data Layer"]
        Neo["Neo4j<br/>Knowledge Graph"]
        Redis["Redis<br/>Session Store"]
        Files["CSV / Uploaded Files"]
    end

    UI -- "HTTP / SSE stream" --> MW
    MW --> Router
    Router --> Runner
    Router -- "session ops" --> Redis
    Runner --> Root
    A4 -- "Cypher queries" --> Neo
    A5 -- "Graph traversal" --> Neo
    A2 -- "File analysis" --> Files

    style Client fill:#dd0031,color:#fff,stroke:#dd0031
    style API fill:#009688,color:#fff,stroke:#009688
    style Orchestrator fill:#4285f4,color:#fff,stroke:#4285f4
    style Storage fill:#008cc1,color:#fff,stroke:#008cc1
```

### Agent Pipeline

```mermaid
flowchart LR
    A["User Intent"] --> B["File Suggestion"] --> C["Schema Proposal"] --> D["Graph Construction"]
    E["GraphRAG"] -.->|"query existing graph"| D

    style A fill:#6366f1,color:#fff,stroke:none
    style B fill:#8b5cf6,color:#fff,stroke:none
    style C fill:#a855f7,color:#fff,stroke:none
    style D fill:#c026d3,color:#fff,stroke:none
    style E fill:#059669,color:#fff,stroke:none
```

Each agent is delegated to sequentially by the root orchestrator. The system streams agent output to the Angular UI in real time via SSE.


## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 20+
- Neo4j 5+ (local or [Aura cloud](https://neo4j.com/cloud/aura/))
- Redis 7+
- Docker & Docker Compose (optional -- for containerized deployment)

### Configure Environment

Copy `src/api/.env.example` to `src/api/.env` and fill in your values:

```env
# LLM Provider (required)
GEMINI_API_KEY=your-gemini-api-key

# Neo4j
NEO4J_DSN=bolt://neo4j:password@localhost:7687/neo4j

# Redis (session management)
GF_REDIS_URL=redis://localhost:6379/0

# Session persistence
GF_SESSION_DB_URL=sqlite+aiosqlite:///data/sessions.db

# Application
GF_DEBUG=false
GF_ALLOWED_ORIGINS=["http://localhost:4200"]
GF_UPLOAD_DIR=./uploads
GF_MAX_UPLOAD_SIZE_MB=50
```

### Quick Start with Docker Compose

The fastest way to run the full stack (API + UI + Redis + Neo4j):

```bash
# Create your .env file first
cp src/api/.env.example src/api/.env
# Edit src/api/.env and add your GEMINI_API_KEY

docker compose up --build
```

This starts all four services. The UI is available at http://localhost:4200 and the API at http://localhost:8000.

> **Note:** The Docker Compose setup uses `neo4j/graphforge-dev` as the default Neo4j credentials.

### Install Dependencies (manual setup)

Using Make (recommended):

```bash
make setup
```

Manual setup:

```bash
# Backend
cd src/api
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt  # Windows
# or source .venv/bin/activate && pip install -r requirements.txt  # Linux/Mac

# Frontend
cd ../ui
npm install
```

### Run the Application

Backend:

```bash
make backend/run
# or: cd src/api && python -m uvicorn src.api.main:app --reload --port 8000
```

Frontend:

```bash
make frontend/start
# or: cd src/ui && npm start
```

Endpoints:

- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Liveness: http://localhost:8000/health
- Readiness: http://localhost:8000/health/ready

## Available Make Targets

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies |
| `make backend/setup` | Create Python virtualenv |
| `make backend/install` | Install backend dependencies |
| `make backend/run` | Run backend server |
| `make frontend/install` | Install frontend dependencies |
| `make frontend/start` | Start frontend dev server |
| `make frontend/build` | Build frontend for production |
| `make clean` | Remove virtualenv and node_modules |

## Project Structure

```
GraphForge/
├── src/
│   ├── api/                        # FastAPI backend
│   │   ├── agents/                # ADK agents
│   │   │   ├── multi_agent/       # Root orchestrator
│   │   │   ├── user_intent_agent/
│   │   │   ├── file_suggestion_agent/
│   │   │   ├── schema_proposal_agent/
│   │   │   ├── graph_construction_agent/
│   │   │   ├── graphrag_agent/
│   │   │   ├── tools/             # Shared agent tools
│   │   │   └── common/            # LLM config, tool results
│   │   ├── core/                  # Config, sessions, middleware, telemetry
│   │   ├── infra/                 # Neo4j driver & connection manager
│   │   ├── routers/               # API route handlers
│   │   │   ├── chat.py            # Agent SSE streaming
│   │   │   ├── sessions.py        # Session lifecycle
│   │   │   ├── files.py           # File upload
│   │   │   ├── connections.py     # BYO Neo4j connections
│   │   │   └── graph.py           # Graph visualization
│   │   ├── models/                # Data models
│   │   ├── schemas/               # Pydantic schemas
│   │   ├── services/              # Business logic, ADK runner
│   │   └── main.py                # FastAPI app entry
│   └── ui/                        # Angular frontend
│       └── src/app/
│           ├── chat/              # Chat interface, file upload, graph viewer
│           ├── dashboard/         # Pipeline telemetry
│           ├── settings/          # Neo4j connection settings
│           ├── landing/           # Landing page
│           └── services/          # API services
├── tests/                         # pytest test suite
├── data/                          # Sample CSV data & product reviews
├── docs/                          # Documentation assets
├── Dockerfile                     # API container (Python 3.11)
├── Dockerfile.ui                  # UI container (Node 20 → nginx)
├── docker-compose.yml             # Full stack orchestration
├── nginx.conf                     # Reverse proxy with SSE support
├── Makefile                       # Development commands
└── README.md
```

## Sample Data

The `data/` directory contains CSV files for a furniture product knowledge graph:

- `products.csv` - Furniture products (Stockholm Chair, Malmo Desk, etc.)
- `suppliers.csv` - Supplier information
- `components.csv` - Product components
- `assemblies.csv` - Assembly relationships
- `part_supplier_mapping.csv` - Parts supplied by suppliers
- `product_reviews/` - Sample product reviews


## API Endpoints

All endpoints are prefixed with `/api/v1` unless noted.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe (checks Redis) |
| `/api/v1/sessions/init` | POST | Create anonymous session |
| `/api/v1/sessions/me` | GET | Get session info |
| `/api/v1/chat/sessions` | GET / POST | List or create agent sessions |
| `/api/v1/chat/sessions/{id}/run` | POST | Run agent with SSE streaming |
| `/api/v1/chat/sessions/{id}/events` | GET | Get conversation history |
| `/api/v1/chat/sessions/{id}` | GET | Get session state |
| `/api/v1/files/upload` | POST | Upload file (CSV, JSON, MD, TXT) |
| `/api/v1/files` | GET | List available files |
| `/api/v1/files/{filename}` | DELETE | Delete file |
| `/api/v1/connections/neo4j/test` | POST | Test Neo4j connection |
| `/api/v1/connections/neo4j` | POST / DELETE | Save or remove BYO connection |
| `/api/v1/connections/neo4j/status` | GET | Get connection status |
| `/api/v1/graph/snapshot` | GET | Graph visualization data |

Full interactive docs at [localhost:8000/docs](http://localhost:8000/docs) (Swagger) or [localhost:8000/redoc](http://localhost:8000/redoc) (ReDoc).

## Deployment

### Docker Compose (recommended)

```bash
docker compose up -d --build
```

| Service | Port | Image |
|---------|------|-------|
| API | 8000 | Python 3.11 / Uvicorn |
| UI | 4200 → 80 | nginx (Angular build) |
| Redis | 6379 | redis:7-alpine |
| Neo4j | 7474, 7687 | neo4j:5-community |

The nginx reverse proxy handles SPA routing, API proxying, and SSE buffering. The API container includes a health check at `/health`.

### Vercel (frontend only)

The Angular UI can be deployed to Vercel. A `vercel.json` is included in `src/ui/` with SPA rewrites and API proxy rules. Set the `API_URL` environment variable in your Vercel project to point to your deployed API.

## Tests

```bash
pytest tests/
```

Test coverage includes agent orchestration, API endpoints, Cypher tool execution, knowledge graph construction, multi-agent coordination, and Neo4j integration.

## Related Docs

- UI development notes: [src/ui/README.md](src/ui/README.md)
- API interactive docs: http://localhost:8000/docs
- Environment reference: [src/api/.env.example](src/api/.env.example)

## License

MIT
