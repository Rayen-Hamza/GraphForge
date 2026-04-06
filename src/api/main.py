import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from core.config import settings
from core.telemetry import setup_tracing
from core.session import get_redis, close_redis
from core.middleware import RequestMiddleware
from routers.chat import router as chat_router
from routers.sessions import router as sessions_router
from routers.connections import router as connections_router
from routers.files import router as files_router
from routers.graph import router as graph_router
from services.runner import init_runner, shutdown_runner
from infra.neo4j_manager import neo4j_manager

logger = logging.getLogger(__name__)

root_router = APIRouter()


@root_router.get("/")
async def root():
    return {"status": "ok", "service": "GraphForge API"}


@root_router.get("/health")
async def health():
    """Liveness probe — always returns ok."""
    return {"status": "ok"}


@root_router.get("/health/ready")
async def readiness():
    """Readiness probe — checks Redis connectivity."""
    checks = {}
    try:
        r = await get_redis()
        await r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "unavailable"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_runner(db_url=settings.session_db_url)
    # Warm up Redis connection
    try:
        r = await get_redis()
        await r.ping()
        logger.info("Redis connected: %s", settings.redis_url)
    except Exception as e:
        logger.warning("Redis unavailable: %s — sessions will fail", e)
    yield
    await shutdown_runner()
    await close_redis()
    neo4j_manager.close_all()


def create_app() -> FastAPI:
    setup_tracing()

    app = FastAPI(
        title="GraphForge API",
        description=(
            "Multi-agent intelligence platform for knowledge graph construction and retrieval. "
            "GraphForge orchestrates 5 specialized AI agents to transform natural language intent "
            "into structured Neo4j knowledge graphs with real-time SSE streaming."
        ),
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(RequestMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(root_router)
    app.include_router(sessions_router, prefix="/api/v1")
    app.include_router(connections_router, prefix="/api/v1")
    app.include_router(files_router, prefix="/api/v1")
    app.include_router(graph_router, prefix="/api/v1")
    app.include_router(chat_router, prefix="/api/v1")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=True)
