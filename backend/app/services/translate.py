from typing import Optional
from google.genai import types

from app.config import settings
from app.services.cache import hash_text, translation_cache
from app.services.gemini_client import get_genai_client
from app.utils.logging import logger

class TranslationService:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or settings.GEMINI_CHAT_MODEL

    async def translate(self, text: str, target_language: str) -> str:
        clean_text = text.strip()
        if not clean_text or not target_language:
            return clean_text

        cache_key = hash_text(f"trans_{target_language}_{clean_text}")
        cached = translation_cache.get(cache_key)
        if cached:
            return cached

        system_instruction = (
            f"You are a professional academic and technical translator.\n"
            f"Translate the given text into language: '{target_language}'.\n"
            f"STRICT RULES:\n"
            f"1. Preserve ALL Markdown formatting, including headers (#, ##), bold (**), bullet points, and code blocks.\n"
            f"2. Preserve GitHub Flavored Markdown tables verbatim (keep columns, pipes, headers).\n"
            f"3. Keep all numbers, course codes (e.g. 20EC401), percentages, fees, and citation markers (like [S1], [S2]) unchanged.\n"
            f"4. Official college terms or designations should be translated naturally with the original English term in brackets where helpful.\n"
            f"5. Return ONLY the translated markdown text, with no preamble or conversational filler."
        )

        client = get_genai_client()
        try:
            resp = await client.aio.models.generate_content(
                model=self.model_id,
                contents=clean_text,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.1,
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            translated = (resp.text or clean_text).strip()
            translation_cache.put(cache_key, translated)
            return translated
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return clean_text

translation_service = TranslationService()
