from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query

from app.config import settings
from app.rag.bm25 import bm25_index
from app.rag.loader import get_data_pdfs
from app.rag.vectorstore import vector_store
from app.schemas import HealthResponse
from app.services.suggestions import suggestions_service

router = APIRouter(prefix="/api", tags=["Health & Suggestions"])

_is_indexing = False

def set_indexing_state(state: bool):
    global _is_indexing
    _is_indexing = state

def get_indexing_state() -> bool:
    return _is_indexing

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check exposing status, model IDs, index stats, and indexing flag."""
    pdfs = get_data_pdfs()
    chunks_count = vector_store.count()

    index_stats = {
        "documents_count": len(pdfs),
        "chunks_count": chunks_count,
        "bm25_indexed_chunks": len(bm25_index.chunks),
        "status": "ready" if chunks_count > 0 else "not_indexed",
    }

    status = "healthy" if chunks_count > 0 else ("initializing" if _is_indexing else "degraded")

    return HealthResponse(
        status=status,
        app_name=settings.APP_NAME,
        environment=settings.ENVIRONMENT,
        models={
            "chat": settings.GEMINI_CHAT_MODEL,
            "embed": settings.GEMINI_EMBED_MODEL,
            "tts": settings.GEMINI_TTS_MODEL,
        },
        index=index_stats,
        indexing=_is_indexing,
    )

@router.get("/suggestions")
async def get_suggestions(language: str = Query(default="en")):
    """Returns starter questions categorized by topic in the requested language."""
    return await suggestions_service.get_localized_starter_questions(lang_code=language)
