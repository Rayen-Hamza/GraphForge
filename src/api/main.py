from fastapi import FastAPI
from .api_v1 import api as api_v1


def create_app() -> FastAPI:
    app = FastAPI(title="GraphForge API")
    app.include_router(api_v1.api_router, prefix="/api/v1")
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api.main:app", host="127.0.0.1", port=8000, reload=True)
