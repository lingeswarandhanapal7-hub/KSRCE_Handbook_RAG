import asyncio
import json
from pathlib import Path
from typing import Dict, List, Literal, Optional
from google.genai import types
from google.genai.errors import APIError, ClientError

from app.config import settings
from app.services.cache import hash_text
from app.services.gemini_client import get_all_genai_clients, get_genai_client
from app.utils.logging import logger

DISK_EMBEDDING_CACHE = settings.caches_dir / "chunk_embeddings_cache.json"

def load_disk_cache() -> Dict[str, List[float]]:
    if DISK_EMBEDDING_CACHE.exists():
        try:
            with open(DISK_EMBEDDING_CACHE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_disk_cache(cache: Dict[str, List[float]]):
    try:
        with open(DISK_EMBEDDING_CACHE, "w", encoding="utf-8") as f:
            json.dump(cache, f)
    except Exception as e:
        logger.warning(f"Could not save disk embedding cache: {e}")

class GeminiEmbedder:
    """
    High-performance embedder supporting gemini-embedding-001 and gemini-embedding-2.
    - For gemini-embedding-001: native multi-text batching (up to 20 texts per single call).
    - For gemini-embedding-2: prepends retrieval instructions in text.
    - Persistent on-disk cache for zero redundant API calls.
    - Resilient multi-client rotation and rate limit handling.
    """
    def __init__(self, model_id: str | None = None):
        self.model_id = model_id or settings.GEMINI_EMBED_MODEL
        self.is_embedding_2 = "embedding-2" in self.model_id.lower()
        self._disk_cache = load_disk_cache()

    def _prepare_single_content_and_config(
        self, text: str, role: Literal["query", "document"]
    ) -> tuple[str, types.EmbedContentConfig | None]:
        if self.is_embedding_2:
            if role == "query":
                prefixed = f"Represent this query for retrieving relevant handbook passages: {text}"
            else:
                prefixed = f"Represent this document for retrieval: {text}"
            return prefixed, None
        else:
            task = "RETRIEVAL_QUERY" if role == "query" else "RETRIEVAL_DOCUMENT"
            return text, types.EmbedContentConfig(task_type=task)

    async def embed_single(
        self,
        text: str,
        role: Literal["query", "document"] = "document",
        client_idx: int = 0
    ) -> List[float]:
        cache_key = hash_text(f"{self.model_id}_{role}_{text}")
        if cache_key in self._disk_cache:
            return self._disk_cache[cache_key]

        res = await self.embed_batch([text], role=role, client_idx=client_idx, log_progress=False)
        return res[0]

    async def _embed_api_call(
        self,
        texts: List[str],
        role: Literal["query", "document"],
        client_idx: int = 0,
        max_retries: int = 6
    ) -> List[List[float]]:
        clients = get_all_genai_clients()
        num_clients = len(clients)

        current_idx = client_idx
        for attempt in range(max_retries):
            client = get_genai_client(current_idx)
            try:
                if not self.is_embedding_2:
                    # gemini-embedding-001 native batch support
                    task = "RETRIEVAL_QUERY" if role == "query" else "RETRIEVAL_DOCUMENT"
                    cfg = types.EmbedContentConfig(task_type=task)
                    resp = await client.aio.models.embed_content(
                        model=self.model_id,
                        contents=texts,
                        config=cfg
                    )
                    return [e.values for e in resp.embeddings]
                else:
                    # gemini-embedding-2 sequential per text
                    results = []
                    for t in texts:
                        prefixed, _ = self._prepare_single_content_and_config(t, role)
                        resp = await client.aio.models.embed_content(
                            model=self.model_id,
                            contents=prefixed
                        )
                        results.append(resp.embeddings[0].values)
                    return results

            except (ClientError, APIError) as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                    if num_clients > 1 and attempt % 2 == 0:
                        current_idx = (current_idx + 1) % num_clients
                        logger.info(f"Rate limit on client, rotating to client index {current_idx}...")
                        await asyncio.sleep(1.0)
                        continue
                    backoff = min(30, 10 + (attempt * 4))
                    logger.warning(f"Embedding rate limit (429). Pacing and sleeping {backoff}s before retry {attempt + 1}/{max_retries}...")
                    await asyncio.sleep(backoff)
                elif attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    logger.error(f"Embedding failed after {max_retries} attempts: {e}")
                    raise

        raise RuntimeError("Embedding retries exhausted.")

    async def embed_batch(
        self,
        texts: List[str],
        role: Literal["query", "document"] = "document",
        batch_size: int = 20,
        client_idx: int = 0,
        log_progress: bool = True
    ) -> List[List[float]]:
        if not texts:
            return []

        total = len(texts)
        results: List[Optional[List[float]]] = [None] * total

        # Check cache first
        uncached_indices: List[int] = []
        uncached_texts: List[str] = []

        for idx, t in enumerate(texts):
            cache_key = hash_text(f"{self.model_id}_{role}_{t}")
            if cache_key in self._disk_cache:
                results[idx] = self._disk_cache[cache_key]
            else:
                uncached_indices.append(idx)
                uncached_texts.append(t)

        cached_count = total - len(uncached_indices)
        if cached_count > 0 and log_progress:
            logger.info(f"Loaded {cached_count}/{total} embeddings from persistent disk cache.")

        if not uncached_texts:
            return [r for r in results if r is not None]

        # Process uncached in batches of 20 chunks per request
        bsize = 20 if not self.is_embedding_2 else 1
        completed = cached_count

        for i in range(0, len(uncached_texts), bsize):
            chunk_batch_texts = uncached_texts[i : i + bsize]
            chunk_batch_indices = uncached_indices[i : i + bsize]

            embedded_vectors = await self._embed_api_call(
                chunk_batch_texts,
                role=role,
                client_idx=0
            )

            for original_idx, t, vec in zip(chunk_batch_indices, chunk_batch_texts, embedded_vectors):
                results[original_idx] = vec
                cache_key = hash_text(f"{self.model_id}_{role}_{t}")
                self._disk_cache[cache_key] = vec

            completed += len(chunk_batch_texts)
            save_disk_cache(self._disk_cache)

            if log_progress:
                logger.info(f"Embedding progress: {completed}/{total} chunks completed.")

            # Gentle pacing between batches
            await asyncio.sleep(0.5)

        return [r for r in results if r is not None]

embedder = GeminiEmbedder()
