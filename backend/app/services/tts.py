import asyncio
import io
import re
from typing import AsyncGenerator, List, Optional
from gtts import gTTS

from app.config import settings
from app.services.cache import hash_text, tts_audio_cache
from app.utils.errors import AudioProcessingError
from app.utils.logging import logger

def clean_text_for_speech(text: str) -> str:
    """Removes markdown syntax, citation markers [S1], links, and code blocks for speech."""
    if not text:
        return ""
    # Remove citations like [S1], [S2]
    cleaned = re.sub(r"\[S\d+\]", "", text)
    # Remove code blocks
    cleaned = re.sub(r"```[\s\S]*?```", "", cleaned)
    # Remove inline code
    cleaned = re.sub(r"`[^`]*`", "", cleaned)
    # Remove links [text](url) -> text
    cleaned = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", cleaned)
    # Remove URLs
    cleaned = re.sub(r"https?://\S+", "", cleaned)
    # Replace markdown table rows with space-separated text
    cleaned = re.sub(r"\|", " ", cleaned)
    # Remove bold, italics, headers
    cleaned = re.sub(r"[*#_~]", "", cleaned)
    # Normalize multiple whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def detect_language(text: str, hint: Optional[str] = None) -> str:
    """Detects regional Indian script or maps language code."""
    # Priority: inspect script in text
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"  # Tamil
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"  # Hindi / Devanagari
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"  # Telugu
    if re.search(r"[\u0C80-\u0CFF]", text):
        return "kn"  # Kannada
    if re.search(r"[\u0D00-\u0D7F]", text):
        return "ml"  # Malayalam
    if re.search(r"[\u0980-\u09FF]", text):
        return "bn"  # Bengali
    if re.search(r"[\u0A80-\u0AFF]", text):
        return "gu"  # Gujarati
    if re.search(r"[\u0D80-\u0DFF]", text):
        return "si"  # Sinhala

    # Map hint
    if hint and hint != "auto":
        clean_hint = hint.lower().split("-")[0].strip()
        supported = {
            "ta": "ta", "tamil": "ta",
            "hi": "hi", "hindi": "hi",
            "te": "te", "telugu": "te",
            "kn": "kn", "kannada": "kn",
            "ml": "ml", "malayalam": "ml",
            "bn": "bn", "bengali": "bn",
            "gu": "gu", "gujarati": "gu",
            "mr": "mr", "marathi": "mr",
            "ur": "ur", "urdu": "ur",
            "en": "en", "english": "en",
        }
        if clean_hint in supported:
            return supported[clean_hint]

    return "en"

def _generate_gtts_sync(text: str, lang: str) -> bytes:
    """Synchronous worker to generate audio bytes using gTTS."""
    buf = io.BytesIO()
    # Use slow=False for natural pacing
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.write_to_fp(buf)
    return buf.getvalue()

class TextToSpeechService:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or settings.GEMINI_TTS_MODEL

    async def synthesize_chunk(
        self,
        text_chunk: str,
        language: str = "en",
        voice: Optional[str] = None
    ) -> bytes:
        clean = clean_text_for_speech(text_chunk)
        if not clean:
            return b""

        # Cap length to ensure fast generation (< 3s)
        if len(clean) > 400:
            match = re.search(r'([.!?।\n])\s', clean[250:400])
            if match:
                clean = clean[:250 + match.end()].strip()
            else:
                clean = clean[:380].strip() + "..."

        lang_code = detect_language(clean, language)
        cache_key = hash_text(f"{clean}_{lang_code}")
        cached_audio = tts_audio_cache.get(cache_key)
        if cached_audio:
            return cached_audio

        try:
            # Generate in non-blocking thread
            audio_bytes = await asyncio.to_thread(_generate_gtts_sync, clean, lang_code)
            if not audio_bytes:
                raise AudioProcessingError(f"No audio generated for language {lang_code}.")

            tts_audio_cache.put(cache_key, audio_bytes)
            return audio_bytes
        except Exception as e:
            logger.error(f"TTS synthesis failed for lang '{lang_code}': {e}")
            raise AudioProcessingError(f"TTS failed: {str(e)}")

    async def stream_tts(
        self,
        full_text: str,
        language: str = "en",
        voice: Optional[str] = None,
        speed: float = 1.0
    ) -> AsyncGenerator[bytes, None]:
        cleaned = clean_text_for_speech(full_text)
        if not cleaned:
            return

        lang_code = detect_language(cleaned, language)
        audio_bytes = await self.synthesize_chunk(cleaned, language=lang_code, voice=voice)
        if audio_bytes:
            yield audio_bytes

tts_service = TextToSpeechService()
