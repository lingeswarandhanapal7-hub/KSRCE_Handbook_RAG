import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.admin import router as admin_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.feedback import router as feedback_router
from app.api.health import router as health_router, set_indexing_state
from app.api.languages import router as languages_router
from app.api.voice import router as voice_router
from app.config import settings
from app.rag.bm25 import bm25_index
from app.rag.vectorstore import vector_store
from app.services.gemini_client import validate_models
from app.utils.errors import AppError, app_error_handler, global_exception_handler
from app.utils.logging import logger, request_id_ctx

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Validate Gemini Model IDs (Fail fast if invalid)
    logger.info("Initializing KSRCE Handbook Assistant...")
    validate_models()

    # 2. Check index freshness and launch background ingestion if missing
    from scripts.ingest import get_current_index_metadata, get_data_manifest, run_ingestion, should_reindex
    manifest = get_data_manifest()

    if should_reindex(manifest, force_rebuild=False):
        logger.info("Vector index missing or outdated. Starting automated background ingestion...")
        async def _startup_ingest():
            set_indexing_state(True)
            try:
                await run_ingestion(force_rebuild=False)
            except Exception as e:
                logger.error(f"Startup ingestion failed: {e}")
            finally:
                set_indexing_state(False)
        asyncio.create_task(_startup_ingest())
    else:
        meta = get_current_index_metadata()
        logger.info(f"Index loaded and ready! Chunks in collection: {vector_store.count()}, BM25 count: {len(bm25_index.chunks)}")

    yield

    logger.info("Shutting down KSRCE Handbook Assistant...")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Official Multilingual Voice-Enabled RAG Assistant for KSRCE Handbook",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, global_exception_handler)

    # Cross-cutting middleware: Request ID injection & Structured Logging
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(req_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            request_id_ctx.reset(token)

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # API Routers
    app.include_router(health_router)
    app.include_router(chat_router)
    app.include_router(voice_router)
    app.include_router(languages_router)
    app.include_router(documents_router)
    app.include_router(feedback_router)
    app.include_router(admin_router)

    # Serve static frontend dist in production if built
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if frontend_dist.exists() and (frontend_dist / "index.html").exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
        logger.info(f"Mounted production frontend from {frontend_dist}")

    return app

app = create_app()
