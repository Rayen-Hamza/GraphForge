from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from .routers.agents import router as agents_router

root_router = APIRouter()


@root_router.get("/")
async def root():
    return {"status": "ok", "service": "GraphForge API"}


def create_app() -> FastAPI:
    app = FastAPI(
        title="GraphForge API",
        description="Agentic knowledge graph construction and retrieval API",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(root_router)
    app.include_router(agents_router, prefix="/api/v1")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=True)
