import json
from typing import Optional
from google.genai import types

from app.config import settings
from app.schemas import STTResponse
from app.services.gemini_client import get_genai_client
from app.utils.errors import AudioProcessingError
from app.utils.logging import logger

MAX_AUDIO_BYTES = 10 * 1024 * 1024 # 10 MB

class SpeechToTextService:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or settings.GEMINI_CHAT_MODEL

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/webm",
        language_hint: Optional[str] = None
    ) -> STTResponse:
        if len(audio_bytes) > MAX_AUDIO_BYTES:
            raise AudioProcessingError("Audio file exceeds maximum 10 MB limit.")

        if not audio_bytes:
            raise AudioProcessingError("Audio data is empty.")

        # Normalize common browser mime types
        clean_mime = mime_type.split(";")[0].strip().lower()
        if clean_mime not in ["audio/webm", "audio/wav", "audio/mp3", "audio/ogg", "audio/x-m4a", "audio/m4a"]:
            clean_mime = "audio/webm"

        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime)

        hint_clause = f" The speaker is likely speaking in or around language: '{language_hint}'." if language_hint and language_hint != "auto" else ""
        system_instruction = (
            "You are a verbatim multilingual speech-to-text transcription engine.\n"
            "Accurately transcribe the spoken words in the audio verbatim in their original native script "
            "(Tamil in Tamil script, Hindi in Devanagari, Telugu in Telugu script, English in Latin script, etc.).\n"
            "If mixed (e.g., Tanglish, Hinglish, technical terms), preserve the natural mixed script or transliteration.\n"
            "Do NOT summarize, reply to, or translate the speech.\n"
            "Return a strict JSON object with exact keys:\n"
            "{\"text\": \"transcribed words\", \"detected_language\": \"en|ta|hi|te|ml|kn|bn|mr|gu|pa|ur|or\"}"
        )

        user_prompt = f"Transcribe this audio recording verbatim into JSON.{hint_clause}"

        client = get_genai_client()
        try:
            resp = await client.aio.models.generate_content(
                model=self.model_id,
                contents=[audio_part, user_prompt],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            raw = (resp.text or "{}").strip()
            data = json.loads(raw)
            text = (data.get("text") or "").strip()
            det_lang = (data.get("detected_language") or (language_hint or "en")).strip()

            return STTResponse(
                text=text,
                detected_language=det_lang
            )
        except Exception as e:
            logger.error(f"STT transcription failed: {e}")
            raise AudioProcessingError(f"Failed to transcribe audio: {str(e)}")

stt_service = SpeechToTextService()
