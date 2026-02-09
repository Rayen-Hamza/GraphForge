from fastapi import APIRouter
from ...schemas.user import User, UserCreate

router = APIRouter()

# Minimal in-memory users example
_USERS = []
_NEXT = 1


@router.post("/", response_model=User)
def create_user(user: UserCreate):
    global _NEXT
    obj = user.dict()
    obj["id"] = _NEXT
    _NEXT += 1
    _USERS.append(obj)
    return obj


@router.get("/", response_model=list[User])
def list_users():
    return _USERS
