from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_ID: str
    APP_KEY: str
    DATABASE_URL: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings() 