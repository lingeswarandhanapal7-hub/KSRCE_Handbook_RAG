import json
import re
from typing import Any, Dict, List, Literal, Optional
from google.genai import types

from app.config import settings
from app.services.gemini_client import get_genai_client
from app.utils.logging import logger

INTENT_TYPES = Literal["handbook_question", "greeting", "out_of_scope"]

class RewrittenQuery:
    def __init__(
        self,
        original_message: str,
        standalone_question: str,
        queries: List[str],
        intent: INTENT_TYPES,
        detected_language: str = "en",
    ):
        self.original_message = original_message
        self.standalone_question = standalone_question
        self.queries = queries
        self.intent = intent
        self.detected_language = detected_language

    def to_dict(self) -> Dict[str, Any]:
        return {
            "original_message": self.original_message,
            "standalone_question": self.standalone_question,
            "queries": self.queries,
            "intent": self.intent,
            "detected_language": self.detected_language,
        }

GREETING_WORDS = {
    "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
    "vanakkam", "namaste", "namaskar", "thanks", "thank you", "bye", "goodbye"
}

OUT_OF_SCOPE_PATTERNS = [
    r"\b(cricket|world cup|football|soccer|tennis|fifa|ipl)\b",
    r"\b(poem|song|story|joke|lyrics)\b",
    r"\b(recipe|cooking|pizza|burger)\b",
    r"\b(weather|forecast|rain today)\b",
    r"\b(capital of|president of|prime minister of)\b",
    r"\b(crypto|bitcoin|ethereum|stock market)\b",
    r"\b(write code for|write python script to)\b",
]

HANDBOOK_KEYWORDS = {
    "attendance", "condonation", "cgpa", "gpa", "grade", "credits", "exam", "examinations",
    "fee", "fees", "fine", "hostel", "mess", "warden", "leave", "od", "on duty",
    "rules", "regulation", "regulations", "hall ticket", "revaluation", "syllabus",
    "course", "malpractice", "discipline", "library", "scholarship", "bonafide",
    "admission", "transfer", "placement", "semester", "internal", "arrear", "arrears"
}

def is_simple_english_question(text: str) -> bool:
    """Detects simple first-turn English queries to bypass rewriter latency."""
    if not text:
        return False
    if not all(ord(c) < 128 for c in text):
        return False
    words = text.strip().split()
    if 2 <= len(words) <= 14 and not any(p in text.lower() for p in ["it", "they", "that", "those", "above"]):
        # Check if contains any handbook keywords
        lower = text.lower()
        if any(kw in lower for kw in HANDBOOK_KEYWORDS):
            return True
    return False

def extract_keywords(text: str) -> str:
    stop_words = {"what", "is", "the", "are", "of", "for", "in", "to", "a", "an", "and", "or", "how", "can", "i"}
    words = [w for w in re.findall(r"\w+", text.lower()) if w not in stop_words]
    return " ".join(words) if words else text

class QueryRewriter:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or settings.GEMINI_CHAT_MODEL

    async def rewrite(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        language_hint: str = "auto"
    ) -> RewrittenQuery:
        clean_msg = message.strip()
        clean_lower = clean_msg.lower().strip("?!.,")
        history = history or []

        # Heuristic 1: Fast greeting check
        if clean_lower in GREETING_WORDS:
            return RewrittenQuery(
                original_message=clean_msg,
                standalone_question=clean_msg,
                queries=[clean_msg, clean_msg, clean_msg],
                intent="greeting",
                detected_language="en",
            )

        # Heuristic 2: Fast out-of-scope check
        if any(re.search(pat, clean_lower) for pat in OUT_OF_SCOPE_PATTERNS):
            return RewrittenQuery(
                original_message=clean_msg,
                standalone_question=clean_msg,
                queries=[clean_msg, clean_msg, extract_keywords(clean_msg)],
                intent="out_of_scope",
                detected_language="en",
            )

        # Optimization: bypass rewriter for short standalone first-turn English handbook queries
        if not history and language_hint in ("auto", "en", "en-IN") and is_simple_english_question(clean_msg):
            return RewrittenQuery(
                original_message=clean_msg,
                standalone_question=clean_msg,
                queries=[clean_msg, clean_msg, extract_keywords(clean_msg)],
                intent="handbook_question",
                detected_language="en",
            )

        # Build prompt with conversation context
        history_formatted = "\n".join(
            f"{turn.get('role', 'user').capitalize()}: {turn.get('content', '')}"
            for turn in history[-6:]
        ) if history else "None"

        system_prompt = (
            "You are the query understanding module for the K.S.R. College of Engineering (KSRCE) Handbook Assistant.\n"
            "Analyze the user message and conversation history.\n"
            "Your tasks:\n"
            "1. Resolve any pronouns, follow-ups, or references into a complete, standalone question.\n"
            "2. Generate exactly 3 search queries:\n"
            "   - Query 1: The user's question in its original wording or script (preserving any regional language, Tanglish, Hinglish).\n"
            "   - Query 2: A clear, accurate English translation/equivalent optimized for handbook passage matching.\n"
            "   - Query 3: A concise keyword-style search query (e.g. 'attendance condonation rules fees percentage').\n"
            "3. Classify the user intent into one of:\n"
            "   - 'handbook_question': asking about college rules, regulations, attendance, courses, exams, fees, hostel, faculty, facilities, conduct, etc.\n"
            "   - 'greeting': conversational greetings, thanks, pleasantries, small talk.\n"
            "   - 'out_of_scope': unrelated topics (cricket, coding outside syllabus, politics, general world knowledge) or harmful requests.\n"
            "4. Identify the language code (e.g. 'en', 'ta', 'hi', 'te', 'ml', 'kn', 'bn', 'mr', 'gu', 'pa', 'ur', 'or').\n"
            "Return a strict JSON object with keys: standalone_question, queries, intent, detected_language."
        )

        user_content = (
            f"Conversation History:\n{history_formatted}\n\n"
            f"User Message: {clean_msg}\n"
            f"Language Hint: {language_hint}"
        )

        client = get_genai_client()
        try:
            resp = await client.aio.models.generate_content(
                model=self.model_id,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.1,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            raw_text = (resp.text or "{}").strip()
            data = json.loads(raw_text)

            standalone = data.get("standalone_question") or clean_msg
            queries = data.get("queries") or [clean_msg, clean_msg, extract_keywords(clean_msg)]
            if len(queries) < 3:
                while len(queries) < 3:
                    queries.append(clean_msg)

            intent = data.get("intent", "handbook_question")
            if intent not in ("handbook_question", "greeting", "out_of_scope"):
                intent = "handbook_question"

            det_lang = data.get("detected_language") or ("en" if language_hint == "auto" else language_hint)

            return RewrittenQuery(
                original_message=clean_msg,
                standalone_question=standalone,
                queries=queries[:3],
                intent=intent,
                detected_language=det_lang,
            )
        except Exception as e:
            logger.warning(f"Query rewriter error: {e}. Falling back to default.")
            return RewrittenQuery(
                original_message=clean_msg,
                standalone_question=clean_msg,
                queries=[clean_msg, clean_msg, extract_keywords(clean_msg)],
                intent="handbook_question",
                detected_language="en",
            )

query_rewriter = QueryRewriter()
