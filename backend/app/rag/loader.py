import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import pymupdf
import pymupdf4llm
from google.genai import types

from app.config import settings
from app.services.gemini_client import get_genai_client
from app.utils.logging import logger

def compute_file_sha256(filepath: Path) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def get_data_pdfs() -> List[Path]:
    """Auto-discovers every *.pdf in DATA_DIR without duplicate matches on Windows."""
    data_dir = settings.DATA_DIR
    if not data_dir.exists():
        logger.warning(f"Data directory does not exist: {data_dir}")
        return []
    # Deduplicate paths by canonical resolved path to handle Windows case-insensitivity
    unique = {p.resolve(): p for p in list(data_dir.glob("*.pdf")) + list(data_dir.glob("*.PDF"))}
    return sorted([p for p in unique.values() if p.is_file()])

def get_data_manifest() -> Dict[str, Any]:
    """Returns hash, size, and modified time for all discovered PDFs."""
    manifest = {}
    for pdf_path in get_data_pdfs():
        manifest[pdf_path.name] = {
            "path": str(pdf_path),
            "size": pdf_path.stat().st_size,
            "sha256": compute_file_sha256(pdf_path),
            "modified": pdf_path.stat().st_mtime,
        }
    return manifest

class PDFPageRecord:
    def __init__(
        self,
        doc_id: str,
        doc_name: str,
        page_num: int,
        markdown: str,
        was_ocred: bool = False,
        char_count: int = 0,
    ):
        self.doc_id = doc_id
        self.doc_name = doc_name
        self.page_num = page_num
        self.markdown = markdown
        self.was_ocred = was_ocred
        self.char_count = char_count or len(markdown)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "doc_name": self.doc_name,
            "page_num": self.page_num,
            "markdown": self.markdown,
            "was_ocred": self.was_ocred,
            "char_count": self.char_count,
        }

async def ocr_page_image(page: pymupdf.Page) -> str:
    """Renders a PDF page as PNG and transcribes it via Gemini Vision."""
    client = get_genai_client()
    pix = page.get_pixmap(dpi=150)
    img_bytes = pix.tobytes("png")
    image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/png")
    prompt = (
        "Extract and transcribe all text, headings, tables, and lists from this institutional document page into clean Markdown. "
        "Preserve exact numbers, dates, course codes, table structures, and bulleted or numbered regulations verbatim. "
        "Do not summarize or omit anything. Return only the Markdown text."
    )
    try:
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_CHAT_MODEL,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                temperature=0.1,
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        )
        return (response.text or "").strip()
    except Exception as e:
        logger.error(f"OCR failed for page: {e}")
        return ""

class DocumentLoader:
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or settings.caches_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.cache_dir / "extracted_pages.json"

    def load_cached_pages(self, current_manifest: Dict[str, Any]) -> Optional[List[PDFPageRecord]]:
        if not self.cache_file.exists():
            return None
        try:
            with open(self.cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            cached_manifest = data.get("manifest", {})
            if cached_manifest != current_manifest:
                logger.info("PDF manifest changed; re-extraction needed.")
                return None
            records = [
                PDFPageRecord(
                    doc_id=r["doc_id"],
                    doc_name=r["doc_name"],
                    page_num=r["page_num"],
                    markdown=r["markdown"],
                    was_ocred=r.get("was_ocred", False),
                    char_count=r.get("char_count", len(r["markdown"])),
                )
                for r in data.get("pages", [])
            ]
            logger.info(f"Loaded {len(records)} extracted pages from disk cache.")
            return records
        except Exception as e:
            logger.warning(f"Failed to read extracted pages cache: {e}")
            return None

    def save_cached_pages(self, current_manifest: Dict[str, Any], pages: List[PDFPageRecord]):
        try:
            payload = {
                "manifest": current_manifest,
                "pages": [p.to_dict() for p in pages],
            }
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
            logger.info(f"Saved {len(pages)} extracted pages to cache.")
        except Exception as e:
            logger.warning(f"Failed to save extracted pages cache: {e}")

    async def extract_all(self, force_reload: bool = False) -> List[PDFPageRecord]:
        """
        Auto-discovers and extracts every PDF in DATA_DIR.
        Uses pymupdf4llm for high-fidelity markdown; performs Gemini Vision OCR
        on pages with little or no extractable text.
        """
        pdfs = get_data_pdfs()
        if not pdfs:
            logger.warning("No PDF documents discovered in Data directory.")
            return []

        manifest = get_data_manifest()
        if not force_reload:
            cached = self.load_cached_pages(manifest)
            if cached:
                return cached

        all_page_records: List[PDFPageRecord] = []
        total_ocr_pages = 0

        for pdf_path in pdfs:
            doc_id = pdf_path.stem.lower().replace(" ", "_")
            doc_name = pdf_path.name
            logger.info(f"Extracting markdown from {doc_name} ({pdf_path})...")

            doc = pymupdf.open(str(pdf_path))
            num_pages = len(doc)

            for page_idx in range(num_pages):
                page_num = page_idx + 1
                try:
                    # Extract page markdown with pymupdf4llm
                    md_text = pymupdf4llm.to_markdown(doc, pages=[page_idx]) or ""
                except Exception as e:
                    logger.warning(f"pymupdf4llm failed on {doc_name} p.{page_num}: {e}")
                    md_text = ""

                clean_text = md_text.strip()
                was_ocred = False

                # Fallback to OCR if less than 50 alphanumeric characters
                alpha_count = sum(c.isalnum() for c in clean_text)
                if alpha_count < 50:
                    logger.info(f"Low text detected on {doc_name} p.{page_num} ({alpha_count} chars). Triggering Gemini Vision OCR...")
                    ocr_text = await ocr_page_image(doc[page_idx])
                    if len(ocr_text) > len(clean_text):
                        clean_text = ocr_text
                        was_ocred = True
                        total_ocr_pages += 1

                record = PDFPageRecord(
                    doc_id=doc_id,
                    doc_name=doc_name,
                    page_num=page_num,
                    markdown=clean_text,
                    was_ocred=was_ocred,
                    char_count=len(clean_text),
                )
                all_page_records.append(record)

                if page_num % 50 == 0 or page_num == num_pages:
                    logger.info(f"Progress for {doc_name}: {page_num}/{num_pages} pages extracted.")

            doc.close()

        logger.info(
            f"Extraction complete: {len(all_page_records)} total pages across {len(pdfs)} document(s). "
            f"Pages requiring Gemini OCR: {total_ocr_pages}."
        )

        self.save_cached_pages(manifest, all_page_records)
        return all_page_records
