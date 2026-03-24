from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from core.config import settings
from core.telemetry import setup_tracing
from routers.chat import router as chat_router
from services.runner import init_runner, shutdown_runner

root_router = APIRouter()


@root_router.get("/")
async def root():
    return {"status": "ok", "service": "GraphForge API"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_runner(db_url=settings.session_db_url)
    yield
    await shutdown_runner()


def create_app() -> FastAPI:
    setup_tracing()

    app = FastAPI(
        title="GraphForge API",
        description="Agentic knowledge graph construction and retrieval API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(root_router)
    app.include_router(chat_router, prefix="/api/v1")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=True)
