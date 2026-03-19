from pydantic import BaseModel
from typing import Optional


class CreateSessionRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    initial_state: dict = {}


class CreateSessionResponse(BaseModel):
    session_id: str


class RunAgentRequest(BaseModel):
    user_id: str
    message: str


class SessionStateResponse(BaseModel):
    session_id: str
    state: dict
