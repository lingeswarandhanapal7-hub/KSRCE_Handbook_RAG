import json
import time
from fastapi import APIRouter
from app.config import settings
from app.schemas import FeedbackRequest
from app.utils.logging import logger

router = APIRouter(prefix="/api", tags=["Feedback"])
FEEDBACK_FILE = settings.caches_dir / "user_feedback.jsonl"

@router.post("/feedback")
async def record_feedback(body: FeedbackRequest):
    """Stores user message ratings and qualitative comments."""
    record = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "message_id": body.message_id,
        "session_id": body.session_id,
        "rating": body.rating,
        "comment": body.comment,
    }
    try:
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        logger.info(f"Recorded feedback for message {body.message_id}: rating={body.rating}")
        return {"status": "success", "message": "Feedback recorded."}
    except Exception as e:
        logger.error(f"Failed to record feedback: {e}")
        return {"status": "error", "message": "Failed to store feedback."}
