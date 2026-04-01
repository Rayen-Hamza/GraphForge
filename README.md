# GraphForge

![GraphForge banner](docs/assets/graphforge-banner.svg)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Angular-20-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white" alt="Neo4j" />
  <img src="https://img.shields.io/badge/Google_ADK-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google ADK" />
  <img src="https://img.shields.io/badge/License-MIT-2f855a?style=for-the-badge" alt="License" />
</p>

GraphForge is a multi-agent intelligence platform that transforms natural language intent into structured knowledge graphs. It orchestrates specialized AI agents to understand queries, research domains, extract entities, and construct Neo4j-based knowledge graphs in real time.

## Highlights

- Multi-agent orchestration for research, extraction, validation, and construction.
- Natural language to graph with real-time streaming updates.
- FastAPI backend with direct Cypher integration.
- Angular UI for live chat and graph build telemetry.
- Sample data for a furniture product knowledge graph.

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
</table>

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- Neo4j database (local or cloud)

### Configure Environment

Copy `src/api/.env.example` to `src/api/.env` and configure:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

### Install Dependencies

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
│   ├── api/                 # FastAPI backend
│   │   ├── agents/         # ADK agents (cypher, file suggestion)
│   │   ├── core/           # Config, logging
│   │   ├── infra/          # Database connections
│   │   ├── models/         # Data models
│   │   ├── repositories/   # Data access layer
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app entry
│   └── ui/                 # Angular frontend
│       └── src/
│           └── app/        # Angular components
├── data/                   # Sample CSV data & product reviews
├── docs/                   # Documentation assets
├── Makefile                # Development commands
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

## Architecture

```mermaid
graph TB
    subgraph Client["Angular UI"]
        UI["Chat Interface<br/>Graph Telemetry"]
    end

    subgraph API["FastAPI Backend"]
        Router["REST / SSE Router<br/>/api/v1/agents"]
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
        Files["CSV / Data Files"]
    end

    UI -- "HTTP / SSE stream" --> Router
    Router --> Runner
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

## Tests

```bash
pytest
```

## Related Docs

- UI development notes: [src/ui/README.md](src/ui/README.md)

## License

MIT
