import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from google.genai import types

from app.config import settings
from app.rag.chunker import DocumentChunk
from app.services.cache import translation_cache
from app.services.gemini_client import get_genai_client
from app.utils.logging import logger

DEFAULT_STARTER_QUESTIONS = [
    {"category": "Attendance", "question": "What is the minimum attendance percentage required to appear for semester examinations?"},
    {"category": "Attendance", "question": "What is the procedure and medical certificate rule for attendance condonation?"},
    {"category": "Exams & Grading", "question": "How are internal assessment marks calculated and what is the grading system?"},
    {"category": "Academics", "question": "What are the rules regarding course registration and credit requirements?"},
    {"category": "Hostel & Rules", "question": "What are the general rules of conduct and discipline in the student hostel?"},
    {"category": "Fees & Scholarships", "question": "What are the policies regarding payment of tuition fees and late fee penalties?"},
    {"category": "Industrial Training", "question": "What is the policy for industrial visits, internships, and in-plant training?"},
    {"category": "Slow Learners", "question": "What support policies are provided for advanced and slow learners?"},
    {"category": "Anti-Ragging", "question": "What are the institutional regulations and penalties regarding ragging on campus?"},
    {"category": "Physical Education", "question": "What facilities and attendance policies apply to sports and physical education?"},
]

class SuggestionsService:
    def __init__(self, cache_file: Optional[Path] = None):
        self.cache_file = cache_file or (settings.caches_dir / "starter_questions.json")

    def load_starter_questions(self) -> List[Dict[str, str]]:
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) >= 6:
                        return data
            except Exception as e:
                logger.warning(f"Failed to read starter questions cache: {e}")
        return DEFAULT_STARTER_QUESTIONS

    async def generate_and_save_starter_questions(self, chunks: List[DocumentChunk]):
        if not chunks:
            return

        # Collect distinct section headings
        sections = list(dict.fromkeys([c.section_path.split(" > ")[0] for c in chunks if c.section_path]))
        sections_str = ", ".join(sections[:25])

        prompt = (
            f"You are the academic assistant for K.S.R. College of Engineering (KSRCE).\n"
            f"Based on the following actual sections from the student handbook:\n{sections_str}\n\n"
            f"Generate 10 high-value starter questions that students frequently ask.\n"
            f"Group them into practical categories (e.g. 'Attendance', 'Exams', 'Academics', 'Hostel', 'Fees', 'Rules').\n"
            f"Return a strict JSON list of objects: [{{\"category\": \"Category Name\", \"question\": \"Precise question text?\"}}]"
        )

        client = get_genai_client()
        try:
            resp = await client.aio.models.generate_content(
                model=settings.GEMINI_CHAT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            raw = (resp.text or "[]").strip()
            data = json.loads(raw)
            if isinstance(data, list) and len(data) >= 6:
                with open(self.cache_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info(f"Generated and cached {len(data)} starter questions from handbook sections.")
                return data
        except Exception as e:
            logger.warning(f"Could not generate starter questions with Gemini: {e}. Using defaults.")

        with open(self.cache_file, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_STARTER_QUESTIONS, f, ensure_ascii=False, indent=2)
        return DEFAULT_STARTER_QUESTIONS

    async def get_localized_starter_questions(self, lang_code: str) -> List[Dict[str, str]]:
        base_questions = self.load_starter_questions()
        if not lang_code or lang_code in ("en", "en-IN", "auto"):
            return base_questions

        cache_key = f"starter_questions_{lang_code}"
        cached = translation_cache.get(cache_key)
        if cached:
            return cached

        # Translate questions into requested target language
        client = get_genai_client()
        prompt = (
            f"Translate the following student handbook questions into language '{lang_code}'. "
            f"Keep official terms, course codes, and proper nouns clear (transliterated or with English in brackets where standard). "
            f"Translate the category names naturally.\n"
            f"Input JSON: {json.dumps(base_questions, ensure_ascii=False)}\n"
            f"Return a strict JSON list of objects: [{{'category': '...', 'question': '...'}}]"
        )

        try:
            resp = await client.aio.models.generate_content(
                model=settings.GEMINI_CHAT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            translated = json.loads(resp.text or "[]")
            if isinstance(translated, list) and len(translated) == len(base_questions):
                translation_cache.put(cache_key, translated)
                return translated
        except Exception as e:
            logger.warning(f"Failed to translate starter questions to {lang_code}: {e}")

        return base_questions

    async def generate_followup_suggestions(
        self,
        question: str,
        answer: str,
        language: str = "en"
    ) -> List[str]:
        """
        Produces 3 grounded follow-up suggestions in the user's language.
        Runs as a separate small call so it never delays the streamed answer.
        """
        client = get_genai_client()
        prompt = (
            f"You are the KSRCE Student Handbook Assistant.\n"
            f"User asked: \"{question}\"\n"
            f"Assistant answered: \"{answer[:800]}\"\n\n"
            f"Suggest 3 natural, highly relevant follow-up questions the student might logically ask next, strictly grounded in college handbook topics.\n"
            f"Language requirement: Output in language '{language}'.\n"
            f"Return a strict JSON list of 3 strings: [\"Question 1?\", \"Question 2?\", \"Question 3?\"]"
        )
        try:
            resp = await client.aio.models.generate_content(
                model=settings.GEMINI_CHAT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            res = json.loads(resp.text or "[]")
            if isinstance(res, list) and len(res) >= 1:
                return [str(s).strip() for s in res[:3]]
        except Exception as e:
            logger.warning(f"Error generating follow-up suggestions: {e}")

        # Fallback suggestions
        if language.startswith("ta"):
            return ["இதற்கான கட்டண விவரங்கள் என்ன?", "விண்ணப்பிக்கும் நடைமுறை என்ன?", "யாரை தொடர்பு கொள்ள வேண்டும்?"]
        elif language.startswith("hi"):
            return ["इसके लिए आवेदन कैसे करें?", "नियम और शर्तें क्या हैं?", "संबंधित कार्यालय कौन सा है?"]
        return [
            "What are the specific eligibility requirements?",
            "What is the application procedure?",
            "Who is the designated authority or office to contact?"
        ]

suggestions_service = SuggestionsService()
