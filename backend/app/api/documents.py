from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.rag.loader import get_data_pdfs
from app.rag.vectorstore import vector_store

router = APIRouter(prefix="/api", tags=["Documents"])

@router.get("/documents")
async def list_documents() -> List[Dict[str, Any]]:
    """Returns list of auto-discovered handbook PDFs and metadata."""
    pdfs = get_data_pdfs()
    results = []
    for p in pdfs:
        doc_id = p.stem.lower().replace(" ", "_")
        results.append({
            "id": doc_id,
            "filename": p.name,
            "size_bytes": p.stat().st_size,
            "modified_time": p.stat().st_mtime,
            "url": f"/api/documents/{doc_id}/file",
        })
    return results

@router.get("/documents/{doc_id}/file")
async def serve_document_file(doc_id: str):
    """
    Serves the raw PDF for browser preview or iframe display.
    Supports deep linking citations with #page=N.
    """
    pdfs = get_data_pdfs()
    target_path: Path | None = None
    for p in pdfs:
        if p.stem.lower().replace(" ", "_") == doc_id or p.name == doc_id:
            target_path = p
            break

    if not target_path or not target_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=str(target_path),
        media_type="application/pdf",
        filename=target_path.name,
        headers={
            "Content-Disposition": f'inline; filename="{target_path.name}"',
            "Accept-Ranges": "bytes",
        }
    )
