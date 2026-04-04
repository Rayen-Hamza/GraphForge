import json
from typing import Optional
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent.parent / ".env"  # src/api/.env


class Settings(BaseSettings):
    # Application
    app_name: str = "GraphForge API"
    debug: bool = False
    environment: str = "development"

    # Server
    allowed_origins: list[str] = Field(default=["http://localhost:4200"])

    # Session DB (ADK persistence)
    session_db_url: str = "sqlite+aiosqlite:///data/sessions.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Neo4j demo instance
    demo_neo4j_dsn: Optional[str] = Field(default=None)

    # File uploads
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # Rate limiting
    rate_limit_rpm: int = 60
    agent_rate_limit_rpm: int = 10

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    model_config = SettingsConfigDict(
        env_prefix="GF_",
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
