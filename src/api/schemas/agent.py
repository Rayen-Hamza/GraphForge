from typing import Optional

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    initial_state: dict = {}


class CreateSessionResponse(BaseModel):
    session_id: str


class RunAgentRequest(BaseModel):
    user_id: str
    message: str
    streaming: bool = True


class SessionStateResponse(BaseModel):
    session_id: str
    state: dict


class SessionSummary(BaseModel):
    session_id: str
    user_id: str
    last_update_time: float = 0.0
    state: dict = {}


class ListSessionsResponse(BaseModel):
    sessions: list[SessionSummary]


class SessionEventsResponse(BaseModel):
    session_id: str
    events: list[dict]
