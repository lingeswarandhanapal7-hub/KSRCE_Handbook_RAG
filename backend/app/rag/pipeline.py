import asyncio
import time
from typing import Any, AsyncGenerator, Dict, List, Optional
from google.genai import types

from app.config import settings
from app.rag.prompts import SYSTEM_GROUNDING_PROMPT, build_user_prompt
from app.rag.query_rewriter import RewrittenQuery, query_rewriter
from app.rag.retriever import RetrievalResult, SourceCitation, hybrid_retriever
from app.services.gemini_client import get_genai_client
from app.services.suggestions import suggestions_service
from app.utils.logging import logger

class RAGPipeline:
    def __init__(self):
        self.chat_model = settings.GEMINI_CHAT_MODEL

    async def execute_stream(
        self,
        session_id: str,
        message: str,
        history: List[Dict[str, str]],
        language_preference: str = "auto",
        is_aborted = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        start_time = time.time()

        # Step 1: Query Understanding & Intent Classification
        yield {
            "event": "status",
            "data": {
                "stage": "understanding",
                "message": "Analyzing and understanding your question...",
                "pages": None,
            }
        }

        rewritten: RewrittenQuery = await query_rewriter.rewrite(
            message=message,
            history=history,
            language_hint=language_preference
        )

        detected_language = rewritten.detected_language
        effective_language = detected_language if language_preference == "auto" else language_preference

        # Check early intent routes
        if rewritten.intent == "greeting":
            greeting_msg = (
                "வணக்கம்! நான் கே.எஸ்.ஆர் பொறியியல் கல்லூரி (KSRCE) கையேடு உதவியாளர். சேர்க்கை, தேர்வுகள், வருகைப்பதிவு, கட்டணங்கள் அல்லது விதிமுறைகள் குறித்து நீங்கள் கேட்கலாம்."
                if effective_language.startswith("ta")
                else (
                    "नमस्ते! मैं के.एस.आर. कॉलेज ऑफ इंजीनियरिंग (KSRCE) हैंडबुक सहायक हूँ। आप उपस्थिति, परीक्षा, पाठ्यक्रम, शुल्क या नियमों के बारे में पूछ सकते हैं।"
                    if effective_language.startswith("hi")
                    else "Hello! I am the official K.S.R. College of Engineering (KSRCE) Handbook Assistant. How can I help you with college rules, courses, attendance, exams, or campus regulations today?"
                )
            )

            yield {"event": "status", "data": {"stage": "writing", "message": "Greeting...", "pages": None}}
            for word in greeting_msg.split(" "):
                if is_aborted and is_aborted():
                    return
                yield {"event": "token", "data": {"delta": f"{word} "}}
                await asyncio.sleep(0.02)

            suggestions = await suggestions_service.get_localized_starter_questions(effective_language)
            yield {"event": "suggestions", "data": {"suggestions": [s["question"] for s in suggestions[:3]]}}
            latency_ms = int((time.time() - start_time) * 1000)
            yield {"event": "meta", "data": {"detected_language": effective_language, "latency_ms": latency_ms, "model": self.chat_model}}
            yield {"event": "done", "data": {"done": True, "session_id": session_id}}
            return

        if rewritten.intent == "out_of_scope":
            refusal_msg = (
                "மன்னிக்கவும், நான் கே.எஸ்.ஆர் பொறியியல் கல்லூரி (KSRCE) கையேடு மற்றும் கல்வி விதிமுறைகள் தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும். பொதுவான அல்லது தொடர்பு இல்லாத கேள்விகளுக்கு பதிலளிக்க முடியாது."
                if effective_language.startswith("ta")
                else (
                    "क्षमा करें, मैं केवल के.एस.आर. कॉलेज ऑफ इंजीनियरिंग (KSRCE) के आधिकारिक नियमों, नीतियों और शैक्षणिक मामलों से संबंधित प्रश्नों का उत्तर दे सकता हूँ।"
                    if effective_language.startswith("hi")
                    else "I am strictly dedicated to assisting with the K.S.R. College of Engineering (KSRCE) Student Handbook, institutional regulations, academic policies, and campus rules. I cannot assist with outside or unrelated topics."
                )
            )
            yield {"event": "status", "data": {"stage": "writing", "message": "Declining out-of-scope query...", "pages": None}}
            for word in refusal_msg.split(" "):
                if is_aborted and is_aborted():
                    return
                yield {"event": "token", "data": {"delta": f"{word} "}}
                await asyncio.sleep(0.02)

            suggestions = await suggestions_service.get_localized_starter_questions(effective_language)
            yield {"event": "suggestions", "data": {"suggestions": [s["question"] for s in suggestions[:3]]}}
            latency_ms = int((time.time() - start_time) * 1000)
            yield {"event": "meta", "data": {"detected_language": effective_language, "latency_ms": latency_ms, "model": self.chat_model}}
            yield {"event": "done", "data": {"done": True, "session_id": session_id}}
            return

        # Step 2: Hybrid Retrieval & Reranking
        yield {
            "event": "status",
            "data": {
                "stage": "searching",
                "message": "Searching the official handbook for relevant regulations...",
                "pages": None,
            }
        }

        retrieval: RetrievalResult = await hybrid_retriever.retrieve(
            queries=rewritten.queries,
            standalone_question=rewritten.standalone_question,
            top_k_candidates=15,
            final_top_n=6,
        )

        # Step 3: Source extraction & Reading status
        pages_read = sorted(list({s.page_start for s in retrieval.sources}))
        yield {
            "event": "status",
            "data": {
                "stage": "reading",
                "message": f"Reading pages {', '.join(map(str, pages_read))} from the handbook..." if pages_read else "Reading relevant sections...",
                "pages": pages_read,
            }
        }

        # Send retrieved sources to client for instant UI render
        yield {
            "event": "sources",
            "data": [s.to_dict() for s in retrieval.sources]
        }

        # Step 4: Handle zero or low-confidence results
        if not retrieval.sources or retrieval.confidence < 3.0:
            not_found_msg = (
                f"கே.எஸ்.ஆர் பொறியியல் கல்லூரி கையேட்டில் \"{message}\" தொடர்பான நேரடி தகவல் கிடைக்கவில்லை. "
                "மேலும் விவரங்களுக்கு துறை தலைவர் (HOD) அல்லது கல்லூரி நிர்வாக அலுவலகத்தை தொடர்பு கொள்ளவும்."
                if effective_language.startswith("ta")
                else (
                    f"के.एस.आर. कॉलेज ऑफ इंजीनियरिंग हैंडबुक में \"{message}\" से संबंधित कोई विशिष्ट जानकारी नहीं मिली। "
                    "कृपया संबंधित विभागाध्यक्ष या प्रशासनिक कार्यालय से संपर्क करें।"
                    if effective_language.startswith("hi")
                    else f"The official KSRCE handbook does not contain specific information regarding \"{message}\". "
                    "For assistance on this matter, please consult your Head of Department or the Academic Administration Office."
                )
            )
            yield {"event": "status", "data": {"stage": "writing", "message": "Reporting information not found...", "pages": pages_read}}
            for word in not_found_msg.split(" "):
                if is_aborted and is_aborted():
                    return
                yield {"event": "token", "data": {"delta": f"{word} "}}
                await asyncio.sleep(0.02)

            suggestions = await suggestions_service.get_localized_starter_questions(effective_language)
            yield {"event": "suggestions", "data": {"suggestions": [s["question"] for s in suggestions[:3]]}}
            latency_ms = int((time.time() - start_time) * 1000)
            yield {"event": "meta", "data": {"detected_language": effective_language, "latency_ms": latency_ms, "model": self.chat_model}}
            yield {"event": "done", "data": {"done": True, "session_id": session_id}}
            return

        # Step 5: Grounded Answer Streaming
        yield {
            "event": "status",
            "data": {
                "stage": "writing",
                "message": "Generating grounded answer with citations...",
                "pages": pages_read,
            }
        }

        user_prompt = build_user_prompt(
            question=rewritten.standalone_question,
            sources=retrieval.sources,
            target_language=effective_language
        )

        client = get_genai_client()
        answer_parts = []
        stream_success = False

        candidate_models = [self.chat_model]
        for fallback in ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for model_attempt in candidate_models:
            try:
                stream = await client.aio.models.generate_content_stream(
                    model=model_attempt,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_GROUNDING_PROMPT,
                        temperature=0.2,
                        thinking_config=types.ThinkingConfig(thinking_budget=0)
                    )
                )

                async for chunk in stream:
                    if is_aborted and is_aborted():
                        logger.info(f"Stream aborted by client for session {session_id}")
                        return

                    text_delta = chunk.text or ""
                    if text_delta:
                        answer_parts.append(text_delta)
                        yield {
                            "event": "token",
                            "data": {"delta": text_delta}
                        }

                stream_success = True
                break

            except Exception as e:
                last_error = e
                logger.warning(f"Generation error on model {model_attempt}: {e}")
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "404" in str(e) or "503" in str(e):
                    logger.info(f"Retrying generation with next candidate after {model_attempt}...")
                    continue
                else:
                    break

        if not stream_success:
            logger.error(f"All candidate models failed. Last error: {last_error}")
            yield {
                "event": "error",
                "data": {"code": "GENERATION_STREAM_ERROR", "message": f"Error generating answer: {str(last_error)}"}
            }
            return

        full_answer = "".join(answer_parts)

        # Step 6: Parallel Follow-Up Suggestions
        try:
            suggestions = await suggestions_service.generate_followup_suggestions(
                question=rewritten.standalone_question,
                answer=full_answer,
                language=effective_language
            )
            yield {
                "event": "suggestions",
                "data": {"suggestions": suggestions}
            }
        except Exception as e:
            logger.warning(f"Error yielding follow-up suggestions: {e}")

        latency_ms = int((time.time() - start_time) * 1000)
        yield {
            "event": "meta",
            "data": {
                "detected_language": effective_language,
                "latency_ms": latency_ms,
                "model": self.chat_model,
            }
        }

        yield {
            "event": "done",
            "data": {"done": True, "session_id": session_id}
        }

rag_pipeline = RAGPipeline()
