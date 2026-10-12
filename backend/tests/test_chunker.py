import pytest
from app.rag.chunker import StructureAwareChunker
from app.rag.loader import PDFPageRecord

def test_chunk_document_pages():
    pages = [
        PDFPageRecord(
            doc_id="test_doc",
            doc_name="Test Handbook",
            page_num=1,
            markdown="""# Academic Regulations 2024\n\n## 1. Attendance Requirements\nA candidate shall be permitted to appear for the Semester Examinations only if he/she satisfies 75% attendance.\n\n| Category | Minimum | Permissible Condonation |\n|---|---|---|\n| General | 75% | None |\n| Medical | 65% | Valid Medical Certificate |\n\n## 2. Examination Rules\nExaminations will be conducted in two phases per academic year."""
        )
    ]

    chunker = StructureAwareChunker(min_chunk_tokens=30, max_chunk_tokens=600)
    chunks = chunker.chunk_document_pages(pages)
    assert len(chunks) > 0

    first_chunk = chunks[0]
    assert first_chunk.doc_id == "test_doc"
    assert first_chunk.page_start == 1
    assert "Academic Regulations" in first_chunk.section_path
    # Check table is preserved intact
    assert "| Category | Minimum |" in first_chunk.text
