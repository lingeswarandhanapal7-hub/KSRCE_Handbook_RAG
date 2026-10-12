import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Ensure app root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.rag.bm25 import bm25_index
from app.rag.chunker import StructureAwareChunker
from app.rag.embeddings import embedder
from app.rag.loader import DocumentLoader, get_data_manifest, get_data_pdfs
from app.rag.vectorstore import vector_store
from app.services.suggestions import suggestions_service
from app.utils.logging import logger

INDEX_METADATA_FILE = settings.caches_dir / "index_metadata.json"

def get_current_index_metadata() -> Dict[str, Any]:
    if INDEX_METADATA_FILE.exists():
        try:
            with open(INDEX_METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def should_reindex(current_manifest: Dict[str, Any], force_rebuild: bool) -> bool:
    if force_rebuild:
        return True
    if vector_store.count() == 0 or not bm25_index.chunks:
        return True
    meta = get_current_index_metadata()
    if not meta:
        return True
    cached_manifest = meta.get("manifest", {})
    if cached_manifest != current_manifest:
        return True
    return False

async def run_ingestion(force_rebuild: bool = False) -> Dict[str, Any]:
    t0 = time.time()
    manifest = get_data_manifest()
    pdfs = get_data_pdfs()

    if not pdfs:
        logger.warning(f"No PDFs found in Data directory ({settings.DATA_DIR}).")
        return {"status": "no_documents", "documents": 0, "pages": 0, "chunks": 0}

    logger.info(f"Checking index status for {len(pdfs)} document(s): {[p.name for p in pdfs]}")

    if not should_reindex(manifest, force_rebuild):
        existing_meta = get_current_index_metadata()
        logger.info(
            f"Index is up to date! Existing chunks: {vector_store.count()}, "
            f"last indexed at: {existing_meta.get('indexed_at', 'unknown')}"
        )
        return {
            "status": "up_to_date",
            "documents": len(pdfs),
            "pages": existing_meta.get("page_count", 0),
            "chunks": vector_store.count(),
            "indexed_at": existing_meta.get("indexed_at"),
            "duration_sec": 0,
        }

    logger.info(f"Starting ingestion pipeline (force_rebuild={force_rebuild})...")

    # 1. Extraction (with disk cache & Gemini Vision OCR fallback)
    loader = DocumentLoader()
    pages = await loader.extract_all(force_reload=False)
    if not pages:
        logger.error("No pages could be extracted from documents.")
        return {"status": "extraction_failed", "documents": len(pdfs), "pages": 0, "chunks": 0}

    total_pages = len(pages)
    total_ocr = sum(1 for p in pages if p.was_ocred)
    logger.info(f"Extracted {total_pages} total pages (OCR pages: {total_ocr}).")

    # 2. Structure-aware chunking
    chunker = StructureAwareChunker(
        target_chunk_tokens=650,
        min_chunk_tokens=150,
        max_chunk_tokens=800,
        overlap_tokens=120
    )
    chunks = chunker.chunk_document_pages(pages)
    total_chunks = len(chunks)
    logger.info(f"Generated {total_chunks} structure-aware chunks.")

    # 3. Embedding generation
    logger.info(f"Generating embeddings using model: {settings.GEMINI_EMBED_MODEL}...")
    embed_texts = [c.embed_text for c in chunks]
    embeddings = await embedder.embed_batch(
        texts=embed_texts,
        role="document",
        log_progress=True
    )

    # 4. Persistence in ChromaDB
    if force_rebuild:
        vector_store.clear()
    vector_store.add_chunks(chunks, embeddings, batch_size=100)

    # 5. Build and save BM25 index
    logger.info("Building BM25 lexical index...")
    bm25_index.build_and_save(chunks)

    # 6. Generate and cache starter questions
    logger.info("Generating starter questions from handbook topics...")
    await suggestions_service.generate_and_save_starter_questions(chunks)

    dt = time.time() - t0
    metadata = {
        "status": "indexed",
        "documents": len(pdfs),
        "document_names": [p.name for p in pdfs],
        "page_count": total_pages,
        "ocr_page_count": total_ocr,
        "chunk_count": total_chunks,
        "manifest": manifest,
        "indexed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "duration_sec": round(dt, 2),
    }

    try:
        with open(INDEX_METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Could not save index metadata: {e}")

    logger.info(
        f"Ingestion completed successfully in {dt:.2f}s! "
        f"Documents: {len(pdfs)}, Pages: {total_pages}, Chunks: {total_chunks}."
    )
    return metadata

def main():
    parser = argparse.ArgumentParser(description="Ingest PDFs into KSRCE RAG Vector and BM25 Store")
    parser.add_argument("--rebuild", action="store_true", help="Force clean rebuild of all indexes")
    args = parser.parse_args()

    asyncio.run(run_ingestion(force_rebuild=args.rebuild))

if __name__ == "__main__":
    main()
