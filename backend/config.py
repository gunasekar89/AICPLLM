from pathlib import Path
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "Local AI Chat"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    sqlite_path: Path = Field(default=Path(__file__).resolve().parent / "chat.db")
    ollama_host: str | None = None
    default_model: str = "llama2"
    default_temperature: float = 0.7
    default_max_tokens: int = 512

    class Config:
        env_prefix = "LOCAL_CHAT_"


settings = Settings()
