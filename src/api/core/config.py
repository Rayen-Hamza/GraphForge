from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "GraphForge API"
    debug: bool = True
    session_db_url: str = "sqlite+aiosqlite:///data/sessions.db"

    class Config:
        env_prefix = "GF_"


settings = Settings()
