import asyncio
from typing import Any, Dict, List, Optional
from app.config import settings
from app.rag.bm25 import bm25_index
from app.rag.chunker import DocumentChunk
from app.rag.embeddings import embedder
from app.rag.reranker import expand_neighbors, reranker
from app.rag.vectorstore import vector_store
from app.services.cache import embedding_cache, hash_text
from app.utils.logging import logger

class SourceCitation:
    def __init__(
        self,
        citation_id: str,
        doc_name: str,
        page_start: int,
        page_end: int,
        section_path: str,
        snippet: str,
        score: float,
        chunk_id: str,
    ):
        self.citation_id = citation_id # S1, S2, etc.
        self.doc_name = doc_name
        self.page_start = page_start
        self.page_end = page_end
        self.section_path = section_path
        self.snippet = snippet
        self.score = score
        self.chunk_id = chunk_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.citation_id,
            "doc": self.doc_name,
            "page": self.page_start if self.page_start == self.page_end else f"{self.page_start}-{self.page_end}",
            "section": self.section_path,
            "snippet": self.snippet,
            "score": round(self.score, 3),
            "chunk_id": self.chunk_id,
        }

class RetrievalResult:
    def __init__(
        self,
        chunks: List[DocumentChunk],
        sources: List[SourceCitation],
        confidence: float,
        is_long_context_fallback: bool = False,
    ):
        self.chunks = chunks
        self.sources = sources
        self.confidence = confidence
        self.is_long_context_fallback = is_long_context_fallback

class HybridRetriever:
    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k

    async def _get_query_embedding(self, query: str) -> List[float]:
        key = hash_text(f"query_{query}")
        cached = embedding_cache.get(key)
        if cached:
            return cached
        vec = await embedder.embed_single(query, role="query")
        embedding_cache.put(key, vec)
        return vec

    async def _search_single_query(self, query: str, top_k: int = 20) -> tuple[List[Any], List[Any]]:
        # Run vector search and BM25 concurrently
        try:
            vec = await self._get_query_embedding(query)
            vec_res = vector_store.query(vec, top_k=top_k)
        except Exception as e:
            logger.warning(f"Vector search failed for '{query}': {e}")
            vec_res = []

        bm25_res = bm25_index.search(query, top_k=top_k)
        return vec_res, bm25_res

    async def retrieve(
        self,
        queries: List[str],
        standalone_question: str,
        top_k_candidates: int = 15,
        final_top_n: int = 6,
    ) -> RetrievalResult:
        if not queries:
            queries = [standalone_question]

        # 1. Concurrently run hybrid searches for all queries
        search_tasks = [self._search_single_query(q, top_k=20) for q in queries]
        search_results = await asyncio.gather(*search_tasks)

        # 2. Reciprocal Rank Fusion (RRF) across all searches
        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, DocumentChunk] = {}

        for vec_res, bm_res in search_results:
            # Process vector results
            for rank, item in enumerate(vec_res):
                cid = item.chunk.chunk_id
                chunk_map[cid] = item.chunk
                rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank + 1))

            # Process BM25 results
            for rank, item in enumerate(bm_res):
                cid = item.chunk.chunk_id
                chunk_map[cid] = item.chunk
                rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank + 1))

        if not rrf_scores:
            logger.info("No documents matched in initial hybrid retrieval.")
            return RetrievalResult(chunks=[], sources=[], confidence=0.0)

        # Sort candidates by RRF score
        sorted_cids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        top_candidates = [chunk_map[cid] for cid in sorted_cids[:top_k_candidates]]

        # 3. Rerank with Gemini structured scoring
        reranked = await reranker.rerank(
            query=standalone_question,
            candidates=top_candidates,
            top_n=final_top_n,
            min_score=3.5
        )

        # Check for low confidence (< 4.0 top score or empty)
        top_score = reranked[0].score if reranked else 0.0

        if not reranked or top_score < 4.0:
            logger.info(f"Low confidence ({top_score:.1f}). Attempting second pass with broader top 40...")
            # Second pass with broader top 40
            broad_cids = sorted_cids[:40]
            broad_candidates = [chunk_map[cid] for cid in broad_cids if cid in chunk_map]
            second_reranked = await reranker.rerank(
                query=f"{standalone_question} KSRCE rules policy",
                candidates=broad_candidates,
                top_n=final_top_n,
                min_score=3.0
            )
            if second_reranked and second_reranked[0].score > top_score:
                reranked = second_reranked
                top_score = reranked[0].score

        if not reranked:
            logger.info("All candidates below relevance threshold.")
            return RetrievalResult(chunks=[], sources=[], confidence=0.0)

        selected_chunks = [item.chunk for item in reranked]
        score_by_chunk_id = {item.chunk.chunk_id: item.score for item in reranked}

        # 4. Expand neighboring chunks for complete rules/tables
        expanded_chunks = expand_neighbors(selected_chunks, max_total_tokens=settings.MAX_CONTEXT_TOKENS)

        # 5. Format sources [S1, S2, ...] mapped to distinct passages
        sources: List[SourceCitation] = []
        for idx, chunk in enumerate(expanded_chunks):
            cid = f"S{idx + 1}"
            sc = score_by_chunk_id.get(chunk.chunk_id, top_score * 0.8)
            # Create a 200-char clean snippet
            snippet = chunk.text[:220].replace("\n", " ").strip()
            if len(chunk.text) > 220:
                snippet += "..."
            sources.append(
                SourceCitation(
                    citation_id=cid,
                    doc_name=chunk.doc_name,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    section_path=chunk.section_path,
                    snippet=snippet,
                    score=sc,
                    chunk_id=chunk.chunk_id,
                )
            )

        return RetrievalResult(
            chunks=expanded_chunks,
            sources=sources,
            confidence=top_score,
            is_long_context_fallback=False
        )

hybrid_retriever = HybridRetriever()
