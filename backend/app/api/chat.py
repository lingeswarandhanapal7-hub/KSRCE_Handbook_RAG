import asyncio
import json
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.rag.pipeline import rag_pipeline
from app.schemas import ChatRequest
from app.utils.logging import logger

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat")
async def chat_endpoint(request: Request, body: ChatRequest):
    """
    Server-Sent Events streaming chat endpoint.
    Emits events: status -> sources -> token -> suggestions -> meta -> done | error
    Handles client disconnection and aborts generation server-side.
    """
    aborted = False

    async def event_generator():
        nonlocal aborted
        try:
            # Convert ChatMessage pydantic objects to dicts
            history_dicts = [{"role": msg.role, "content": msg.content} for msg in body.history]

            stream = rag_pipeline.execute_stream(
                session_id=body.session_id,
                message=body.message,
                history=history_dicts,
                language_preference=body.language,
                is_aborted=lambda: aborted
            )

            async for item in stream:
                if await request.is_disconnected():
                    aborted = True
                    logger.info(f"Client disconnected for session: {body.session_id}")
                    break

                yield {
                    "event": item["event"],
                    "data": json.dumps(item["data"], ensure_ascii=False)
                }

        except asyncio.CancelledError:
            aborted = True
            logger.info(f"Request cancelled by client for session: {body.session_id}")
        except Exception as e:
            logger.exception(f"Unhandled error in chat SSE stream: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"code": "INTERNAL_STREAM_ERROR", "message": "An unexpected error occurred."})
            }

    return EventSourceResponse(event_generator())
