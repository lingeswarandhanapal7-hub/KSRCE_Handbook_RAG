import pytest
from pathlib import Path
from app.rag.loader import get_data_pdfs, compute_file_sha256
from app.config import settings

def test_discover_pdf_documents():
    """Verify PDF auto-discovery in Data/ without hardcoding filenames."""
    docs = get_data_pdfs()
    assert len(docs) > 0, "Should auto-discover at least one PDF in Data/"
    assert any("ksrce" in doc.name.lower() or "handbook" in doc.name.lower() for doc in docs)

def test_compute_sha256():
    """Verify SHA-256 computation is deterministic and valid hex."""
    docs = get_data_pdfs()
    first_pdf = docs[0]
    sha1 = compute_file_sha256(first_pdf)
    sha2 = compute_file_sha256(first_pdf)
    assert len(sha1) == 64
    assert sha1 == sha2
