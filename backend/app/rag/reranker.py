import json
from typing import Any, Dict, List, Optional
from google.genai import types

from app.config import settings
from app.rag.chunker import DocumentChunk
from app.rag.vectorstore import vector_store
from app.services.gemini_client import get_genai_client
from app.utils.logging import logger

class RerankedCandidate:
    def __init__(self, chunk: DocumentChunk, score: float, reason: str = ""):
        self.chunk = chunk
        self.score = score
        self.reason = reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk": self.chunk.to_dict(),
            "score": self.score,
            "reason": self.reason,
        }

class GeminiReranker:
    def __init__(self, model_id: Optional[str] = None):
        self.model_id = model_id or settings.GEMINI_CHAT_MODEL

    async def rerank(
        self,
        query: str,
        candidates: List[DocumentChunk],
        top_n: int = 7,
        min_score: float = 3.5,
    ) -> List[RerankedCandidate]:
        if not candidates:
            return []

        if settings.RERANK_MODE == "none":
            # Assign linear descending score
            return [
                RerankedCandidate(chunk=c, score=10.0 - (i * 0.5), reason="RRF fallback")
                for i, c in enumerate(candidates[:top_n])
            ]

        # Prepare candidates for batch evaluation
        candidate_snippets = []
        for idx, c in enumerate(candidates):
            snippet = c.text[:800].replace("\n", " ")
            candidate_snippets.append(
                f"[{idx}] (Pages {c.page_start}-{c.page_end}, Section: {c.section_path})\n{snippet}"
            )

        prompt = (
            f"You are the document relevance evaluator for the KSRCE student handbook.\n"
            f"Question: \"{query}\"\n\n"
            f"Evaluate each candidate passage below. Give an integer or float relevance score from 0.0 to 10.0:\n"
            f"- 9.0-10.0: Contains the direct, exact answer, regulations, table, or numbers needed.\n"
            f"- 6.0-8.9: Highly relevant context, section rules, conditions, or related procedures.\n"
            f"- 3.0-5.9: Partially related topic, mentions the entity or general department.\n"
            f"- 0.0-2.9: Irrelevant or unrelated.\n\n"
            f"Candidate Passages:\n" + "\n\n".join(candidate_snippets) + "\n\n"
            f"Return a strict JSON list of objects: [{{'index': int, 'score': float, 'reason': str}}]"
        )

        client = get_genai_client()
        try:
            resp = await client.aio.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_budget=0)
                )
            )
            raw = (resp.text or "[]").strip()
            data = json.loads(raw)
            if not isinstance(data, list):
                data = []

            score_map: Dict[int, tuple[float, str]] = {}
            for item in data:
                try:
                    idx = int(item["index"])
                    sc = float(item["score"])
                    rs = str(item.get("reason", ""))
                    score_map[idx] = (sc, rs)
                except Exception:
                    continue

            reranked: List[RerankedCandidate] = []
            for idx, c in enumerate(candidates):
                sc, rs = score_map.get(idx, (3.0, "default"))
                if sc >= min_score:
                    reranked.append(RerankedCandidate(chunk=c, score=sc, reason=rs))

            reranked.sort(key=lambda x: x.score, reverse=True)
            return reranked[:top_n]
        except Exception as e:
            logger.warning(f"Reranking error: {e}. Falling back to original candidate order.")
            return [
                RerankedCandidate(chunk=c, score=8.0 - (i * 0.4), reason="fallback")
                for i, c in enumerate(candidates[:top_n])
            ]

def expand_neighbors(
    selected_chunks: List[DocumentChunk],
    max_total_tokens: int = 7000
) -> List[DocumentChunk]:
    """
    Expands selected chunks with immediate prev/next neighbors if they belong
    to the same section or multi-part rule, avoiding duplicates and respecting token budget.
    """
    seen_ids = set()
    result_chunks: List[DocumentChunk] = []
    current_tokens = 0

    for c in selected_chunks:
        # Check previous neighbor if contiguous
        if c.prev_id and c.prev_id not in seen_ids:
            prev_chunk = vector_store.get_chunk(c.prev_id)
            if prev_chunk and prev_chunk.section_path == c.section_path:
                prev_tokens = len(prev_chunk.text) // 4
                if current_tokens + prev_tokens < max_total_tokens:
                    seen_ids.add(prev_chunk.chunk_id)
                    result_chunks.append(prev_chunk)
                    current_tokens += prev_tokens

        if c.chunk_id not in seen_ids:
            c_tokens = len(c.text) // 4
            if current_tokens + c_tokens < max_total_tokens:
                seen_ids.add(c.chunk_id)
                result_chunks.append(c)
                current_tokens += c_tokens

        # Check next neighbor if contiguous
        if c.next_id and c.next_id not in seen_ids:
            next_chunk = vector_store.get_chunk(c.next_id)
            if next_chunk and next_chunk.section_path == c.section_path:
                next_tokens = len(next_chunk.text) // 4
                if current_tokens + next_tokens < max_total_tokens:
                    seen_ids.add(next_chunk.chunk_id)
                    result_chunks.append(next_chunk)
                    current_tokens += next_tokens

    # Sort stably by document and page/chunk index
    result_chunks.sort(key=lambda x: (x.doc_id, x.chunk_index))
    return result_chunks

reranker = GeminiReranker()
