from pathlib import Path
from typing import List, Literal, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Gemini API Credentials & Models
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")
    GEMINI_API_KEY_FALLBACK: Optional[str] = Field(default=None, description="Optional secondary key for rate-limit rotation")
    GEMINI_CHAT_MODEL: str = Field(default="gemini-3.8-flash", description="Chat model ID")
    GEMINI_EMBED_MODEL: str = Field(default="gemini-embedding-2", description="Embedding model ID")
    GEMINI_TTS_MODEL: str = Field(default="gemini-3.8-flash-tts", description="Text-to-speech model ID")

    # Application Settings
    APP_NAME: str = Field(default="KSRCE Handbook Assistant", description="Application display name")
    HOST: str = Field(default="0.0.0.0", description="Host to bind server")
    PORT: int = Field(default=8000, description="Port to bind server")
    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    )

    # Storage Paths
    DATA_DIR: Path = Field(default=BASE_DIR.parent / "Data")
    STORAGE_DIR: Path = Field(default=BASE_DIR / "storage")

    # RAG Pipeline Configuration
    RERANK_MODE: Literal["gemini", "none"] = Field(default="gemini")
    ENABLE_LONG_CONTEXT_FALLBACK: bool = Field(default=True)
    MAX_CONTEXT_TOKENS: int = Field(default=8000)
    RATE_LIMIT_PER_MINUTE: int = Field(default=60)
    ADMIN_KEY: str = Field(default="dev-ksrce-admin-secret-key")

    @field_validator("DATA_DIR", "STORAGE_DIR", mode="before")
    @classmethod
    def resolve_paths(cls, v: str | Path) -> Path:
        p = Path(v)
        if not p.is_absolute():
            p = (BASE_DIR / p).resolve()
        return p

    @property
    def chroma_dir(self) -> Path:
        p = self.STORAGE_DIR / "chroma"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def caches_dir(self) -> Path:
        p = self.STORAGE_DIR / "caches"
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
