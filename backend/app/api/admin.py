import asyncio
from fastapi import APIRouter, Header, HTTPException

from app.api.health import set_indexing_state
from app.config import settings
from app.utils.logging import logger

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.post("/reindex")
async def trigger_reindex(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Triggers an index rebuild. Protected by X-Admin-Key header."""
    if x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin credentials.")

    from scripts.ingest import run_ingestion

    async def _async_reindex_worker():
        set_indexing_state(True)
        try:
            logger.info("Admin triggered re-indexing started in background.")
            await run_ingestion(force_rebuild=True)
            logger.info("Admin triggered re-indexing finished successfully.")
        except Exception as e:
            logger.error(f"Re-indexing failed: {e}")
        finally:
            set_indexing_state(False)

    asyncio.create_task(_async_reindex_worker())
    return {"status": "accepted", "message": "Re-indexing task scheduled."}
