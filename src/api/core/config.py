from pydantic import BaseSettings


class Settings(BaseSettings):
    app_name: str = "GraphForge API"
    debug: bool = True

    class Config:
        env_prefix = "GF_"


settings = Settings()
