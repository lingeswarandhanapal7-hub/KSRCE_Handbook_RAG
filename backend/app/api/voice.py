from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response, StreamingResponse

from app.schemas import STTResponse, TTSRequest, TranslateRequest, TranslateResponse
from app.services.stt import stt_service
from app.services.translate import translation_service
from app.services.tts import tts_service
from app.utils.errors import AudioProcessingError
from app.utils.logging import logger

router = APIRouter(prefix="/api", tags=["Voice & Translation"])

@router.post("/stt", response_model=STTResponse)
async def speech_to_text(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """
    Transcribes uploaded audio file verbatim in its native script.
    Accepts webm, wav, mp3, ogg, m4a up to 10 MB.
    """
    content = await audio.read()
    if not content:
        raise AudioProcessingError("Uploaded audio file is empty.")

    mime_type = audio.content_type or "audio/webm"
    return await stt_service.transcribe(
        audio_bytes=content,
        mime_type=mime_type,
        language_hint=language
    )

@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    """
    Synthesizes speech from text using Gemini Flash TTS.
    Returns audio/wav data.
    """
    clean_text = body.text.strip()
    if not clean_text:
        return Response(status_code=400, content="Text is empty.")

    # Generate audio chunk
    wav_bytes = await tts_service.synthesize_chunk(
        text_chunk=clean_text,
        language=body.language,
        voice=body.voice
    )

    return Response(
        content=wav_bytes,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=speech.mp3",
            "Cache-Control": "public, max-age=86400",
        }
    )

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(body: TranslateRequest):
    """
    Translates response text into another regional language in place,
    preserving markdown tables, bolding, numbers, and citation markers.
    """
    translated = await translation_service.translate(
        text=body.text,
        target_language=body.target_language
    )
    return TranslateResponse(
        translated_text=translated,
        target_language=body.target_language
    )
