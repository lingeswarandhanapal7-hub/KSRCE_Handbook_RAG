import pickle
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from rank_bm25 import BM25Okapi

from app.config import settings
from app.rag.chunker import DocumentChunk
from app.utils.logging import logger

def tokenize_text(text: str) -> List[str]:
    """Tokenizes text preserving course codes, numbers, and hyphenated terms."""
    cleaned = text.lower()
    # Extract tokens with alphanumeric, dots, and hyphens (e.g. '1.1.2', 'cs8401', '75%')
    tokens = re.findall(r"[a-z0-9_\-\.\%]+", cleaned)
    return [t for t in tokens if len(t) > 1]

class BM25SearchResult:
    def __init__(self, chunk: DocumentChunk, score: float):
        self.chunk = chunk
        self.score = score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk": self.chunk.to_dict(),
            "score": self.score,
        }

class BM25Index:
    def __init__(self, cache_file: Optional[Path] = None):
        self.cache_file = cache_file or (settings.caches_dir / "bm25_index.pkl")
        self.model: Optional[BM25Okapi] = None
        self.chunks: List[DocumentChunk] = []
        self.load()

    def load(self) -> bool:
        if not self.cache_file.exists():
            return False
        try:
            with open(self.cache_file, "rb") as f:
                data = pickle.load(f)
            self.model = data["model"]
            self.chunks = [DocumentChunk(**c) for c in data["chunks"]]
            logger.info(f"Loaded BM25 index with {len(self.chunks)} chunks from disk.")
            return True
        except Exception as e:
            logger.warning(f"Failed to load BM25 index from cache: {e}")
            return False

    def build_and_save(self, chunks: List[DocumentChunk]):
        if not chunks:
            return

        corpus = [tokenize_text(f"{c.doc_name} {c.section_path} {c.text}") for c in chunks]
        self.model = BM25Okapi(corpus)
        self.chunks = chunks

        try:
            with open(self.cache_file, "wb") as f:
                pickle.dump({
                    "model": self.model,
                    "chunks": [c.to_dict() for c in chunks],
                }, f)
            logger.info(f"Saved BM25 index with {len(chunks)} chunks to {self.cache_file}.")
        except Exception as e:
            logger.error(f"Failed to save BM25 index to cache: {e}")

    def search(self, query: str, top_k: int = 20) -> List[BM25SearchResult]:
        if not self.model or not self.chunks:
            return []

        tokens = tokenize_text(query)
        if not tokens:
            return []

        scores = self.model.get_scores(tokens)
        scored_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)

        results: List[BM25SearchResult] = []
        for idx in scored_indices[:top_k]:
            if scores[idx] > 0.0:
                results.append(BM25SearchResult(chunk=self.chunks[idx], score=float(scores[idx])))

        return results

bm25_index = BM25Index()
