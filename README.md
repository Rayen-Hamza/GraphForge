# GraphForge

GraphForge is a multi-agent intelligence platform that transforms natural language intent into structured knowledge graphs. It orchestrates specialized AI agents to understand queries, research domains, extract entities, and construct rich Neo4j-based knowledge graphs in real time.

## Features

- **Multi-Agent Orchestration**: Coordinated pipeline of research, extraction, validation, and construction agents
- **Natural Language to Graph**: Describe what you want to explore in plain language — GraphForge handles the rest
- **Real-time Streaming**: Watch agents think, decide, and build knowledge graphs live
- **Neo4j Integration**: Direct Cypher query access for advanced graph operations
- **Modern Angular UI**: Clean, responsive interface with chat and dashboard views

## Tech Stack

- **Backend**: FastAPI, Google ADK, Neo4j
- **Frontend**: Angular 20, Angular Material
- **Database**: Neo4j

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
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app entry
│   └── ui/                 # Angular frontend
│       └── src/
│           └── app/        # Angular components
├── data/                    # Sample CSV data & product reviews
├── Makefile                # Development commands
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Neo4j database (local or cloud)

### Setup

1. **Clone the repository**

2. **Create and configure environment**
   
   Copy `src/api/.env.example` to `src/api/.env` and configure:
   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=neo4j
   ```

3. **Install dependencies**

   Using Make (recommended):
   ```bash
   make setup
   ```

   Or manually:
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

### Running the Application

**Backend only:**
```bash
make backend/run
# or: cd src/api && python -m uvicorn src.api.main:app --reload --port 8000
```

**Frontend only:**
```bash
make frontend/start
# or: cd src/ui && npm start
```

**Both:**
```bash
make backend/run  # in one terminal
make frontend/start  # in another terminal
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Available Make Commands

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

## Sample Data

The `data/` directory contains CSV files for a furniture product knowledge graph:

- `products.csv` - Furniture products (Stockholm Chair, Malmö Desk, etc.)
- `suppliers.csv` - Supplier information
- `components.csv` - Product components
- `assemblies.csv` - Assembly relationships
- `part_supplier_mapping.csv` - Parts supplied by suppliers
- `product_reviews/` - Sample product reviews

## Architecture

GraphForge uses Google's Agent Development Kit (ADK) to orchestrate multiple specialized agents:

1. **Intent Parser** - Understands user queries
2. **Research Agent** - Gathers domain information
3. **Cypher Agent** - Handles Neo4j database operations
4. **File Suggestion Agent** - Helps with data file analysis

The system streams agent thinking and tool usage in real time to the Angular frontend.

## License

MIT
