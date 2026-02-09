from fastapi import APIRouter
from .routes import items as items_route, users as users_route

api_router = APIRouter()

api_router.include_router(items_route.router, prefix="/items", tags=["items"])
api_router.include_router(users_route.router, prefix="/users", tags=["users"])
