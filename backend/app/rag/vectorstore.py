import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
import numpy as np

from app.config import settings
from app.rag.chunker import DocumentChunk
from app.utils.logging import logger

class VectorSearchResult:
    def __init__(self, chunk: DocumentChunk, score: float):
        self.chunk = chunk
        self.score = score # Cosine similarity: 1.0 is identical, higher is better

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk": self.chunk.to_dict(),
            "score": self.score,
        }

class ChromaVectorStore:
    def __init__(self, persist_dir: Optional[Path] = None, collection_name: str = "ksrce_handbook"):
        self.persist_dir = persist_dir or settings.chroma_dir
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.collection_name = collection_name
        self.client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        self._chunk_registry: Dict[str, DocumentChunk] = {}
        self._load_registry()

    def _registry_file(self) -> Path:
        return settings.caches_dir / "chunks_registry.json"

    def _load_registry(self):
        f = self._registry_file()
        if f.exists():
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                for item in data:
                    c = DocumentChunk(**item)
                    self._chunk_registry[c.chunk_id] = c
                logger.info(f"Loaded {len(self._chunk_registry)} chunks into in-memory registry.")
            except Exception as e:
                logger.warning(f"Could not load chunk registry: {e}")

    def _save_registry(self):
        f = self._registry_file()
        try:
            payload = [c.to_dict() for c in self._chunk_registry.values()]
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(payload, fp, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Could not save chunk registry: {e}")

    def count(self) -> int:
        return self.collection.count()

    def get_chunk(self, chunk_id: str) -> Optional[DocumentChunk]:
        return self._chunk_registry.get(chunk_id)

    def clear(self):
        try:
            self.client.delete_collection(self.collection_name)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        self._chunk_registry.clear()
        reg_file = self._registry_file()
        if reg_file.exists():
            reg_file.unlink()

    def add_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]], batch_size: int = 100):
        if not chunks:
            return

        total = len(chunks)
        for i in range(0, total, batch_size):
            batch_chunks = chunks[i : i + batch_size]
            batch_embeds = embeddings[i : i + batch_size]

            ids = [c.chunk_id for c in batch_chunks]
            documents = [c.text for c in batch_chunks]
            metadatas = [
                {
                    "chunk_id": c.chunk_id,
                    "doc_id": c.doc_id,
                    "doc_name": c.doc_name,
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "section_path": c.section_path,
                    "chunk_index": c.chunk_index,
                    "prev_id": c.prev_id or "",
                    "next_id": c.next_id or "",
                }
                for c in batch_chunks
            ]

            self.collection.upsert(
                ids=ids,
                embeddings=batch_embeds,
                documents=documents,
                metadatas=metadatas,
            )

            for c in batch_chunks:
                self._chunk_registry[c.chunk_id] = c

        self._save_registry()
        logger.info(f"Successfully upserted {total} chunks into Chroma collection '{self.collection_name}'.")

    def query(self, query_embedding: List[float], top_k: int = 20) -> List[VectorSearchResult]:
        if self.count() == 0:
            return []

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self.count()),
            include=["metadatas", "distances"]
        )

        search_results: List[VectorSearchResult] = []
        if not results or not results["ids"] or not results["ids"][0]:
            return []

        ids = results["ids"][0]
        distances = results["distances"][0] if "distances" in results else [0.5] * len(ids)

        for chunk_id, distance in zip(ids, distances):
            chunk = self.get_chunk(chunk_id)
            if chunk:
                # In cosine space in Chroma, distance is 1 - similarity. Convert to similarity: 1 - distance
                similarity = max(0.0, min(1.0, 1.0 - distance))
                search_results.append(VectorSearchResult(chunk=chunk, score=similarity))

        return search_results

vector_store = ChromaVectorStore()
