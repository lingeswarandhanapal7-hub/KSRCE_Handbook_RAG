from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

# ----------------- Chat Schemas -----------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(..., max_length=10000)

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique session/conversation identifier")
    message: str = Field(..., min_length=1, max_length=2000, description="User prompt, capped at 2,000 characters")
    language: str = Field(default="auto", description="Language preference ('auto' or BCP-47 like 'ta-IN', 'hi-IN')")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation turns (<= 10)")

    @field_validator("history")
    @classmethod
    def limit_history(cls, v: List[ChatMessage]) -> List[ChatMessage]:
        return v[-10:] if len(v) > 10 else v

class SourceItem(BaseModel):
    id: str = Field(..., description="Source citation ID e.g. S1")
    doc: str = Field(..., description="Document filename")
    page: str | int = Field(..., description="Page number or range")
    section: str = Field(..., description="Section hierarchy breadcrumb")
    snippet: str = Field(..., description="Passage excerpt")
    score: float = Field(..., description="Relevance score")

class SSEStatusEvent(BaseModel):
    stage: Literal["understanding", "searching", "reading", "writing"]
    message: str
    pages: Optional[List[int]] = None

class SSETokenEvent(BaseModel):
    delta: str

class SSESuggestionsEvent(BaseModel):
    suggestions: List[str]

class SSEMetaEvent(BaseModel):
    detected_language: str
    latency_ms: int
    model: str

class SSEDoneEvent(BaseModel):
    done: bool = True
    session_id: str

class SSEErrorEvent(BaseModel):
    code: str
    message: str

# ----------------- Voice Schemas -----------------

class STTResponse(BaseModel):
    text: str
    detected_language: str
    duration_ms: Optional[int] = None

class TTSRequest(BaseModel):
    text: str = Field(..., max_length=4000)
    language: str = Field(default="en")
    voice: Optional[str] = None
    speed: Optional[float] = Field(default=1.0, ge=0.5, le=2.0)

# ----------------- Translation Schemas -----------------

class TranslateRequest(BaseModel):
    text: str = Field(..., max_length=6000)
    target_language: str = Field(..., description="Target language BCP-47 code or name")

class TranslateResponse(BaseModel):
    translated_text: str
    target_language: str

# ----------------- Language Schemas -----------------

class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    script: str
    direction: Literal["ltr", "rtl"] = "ltr"
    stt: bool = True
    tts: bool = True
    ui: bool = True

# ----------------- Feedback & Health -----------------

class FeedbackRequest(BaseModel):
    message_id: str
    session_id: Optional[str] = None
    rating: int = Field(..., ge=-1, le=1, description="1 for thumbs up, -1 for thumbs down")
    comment: Optional[str] = Field(default=None, max_length=1000)

class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "initializing"]
    app_name: str
    environment: str
    models: Dict[str, str]
    index: Dict[str, Any]
    indexing: bool
