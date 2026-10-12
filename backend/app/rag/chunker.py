import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from app.rag.cleaner import clean_page_markdown
from app.rag.loader import PDFPageRecord
from app.utils.logging import logger

@dataclass
class DocumentChunk:
    chunk_id: str
    doc_id: str
    doc_name: str
    page_start: int
    page_end: int
    section_path: str
    chunk_index: int
    prev_id: Optional[str]
    next_id: Optional[str]
    text: str
    embed_text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "doc_id": self.doc_id,
            "doc_name": self.doc_name,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "section_path": self.section_path,
            "chunk_index": self.chunk_index,
            "prev_id": self.prev_id,
            "next_id": self.next_id,
            "text": self.text,
            "embed_text": self.embed_text,
        }

def estimate_tokens(text: str) -> int:
    """Fast token estimator: roughly 4 characters per token for English/technical text."""
    return max(1, len(text) // 4)

def split_oversized_table(table_text: str, max_tokens: int = 700) -> List[str]:
    """
    Splits an oversized markdown table into row groups,
    repeating the header and separator rows at the start of each piece.
    """
    lines = [line.strip() for line in table_text.strip().split("\n") if line.strip()]
    if len(lines) <= 2:
        return [table_text]

    header_lines = lines[:2] # Table header row and separator line
    header_block = "\n".join(header_lines)
    header_tokens = estimate_tokens(header_block)

    data_rows = lines[2:]
    chunks: List[str] = []
    current_rows: List[str] = []
    current_tokens = header_tokens

    for row in data_rows:
        row_tokens = estimate_tokens(row)
        if current_rows and (current_tokens + row_tokens > max_tokens):
            chunks.append(header_block + "\n" + "\n".join(current_rows))
            current_rows = [row]
            current_tokens = header_tokens + row_tokens
        else:
            current_rows.append(row)
            current_tokens += row_tokens

    if current_rows:
        chunks.append(header_block + "\n" + "\n".join(current_rows))

    return chunks

class StructureAwareChunker:
    """
    Splits document pages hierarchically based on Markdown headings and semantic blocks.
    Preserves table and numbered list integrity, calculates overlapping context,
    and enriches each chunk with section hierarchy and neighboring IDs.
    """
    def __init__(
        self,
        target_chunk_tokens: int = 650,
        min_chunk_tokens: int = 150,
        max_chunk_tokens: int = 800,
        overlap_tokens: int = 120,
    ):
        self.target_tokens = target_chunk_tokens
        self.min_tokens = min_chunk_tokens
        self.max_tokens = max_chunk_tokens
        self.overlap_tokens = overlap_tokens

    def chunk_document_pages(self, pages: List[PDFPageRecord]) -> List[DocumentChunk]:
        if not pages:
            return []

        doc_id = pages[0].doc_id
        doc_name = pages[0].doc_name

        # 1. Parse pages into semantic blocks annotated with page numbers and headings
        heading_stack: Dict[int, str] = {} # level -> title
        current_section = "Handbook Overview"
        blocks: List[Dict[str, Any]] = []

        heading_re = re.compile(r"^(#{1,6})\s+(.+)$")
        table_row_re = re.compile(r"^\|.*\|$")

        for page in pages:
            cleaned_md = clean_page_markdown(page.markdown)
            if not cleaned_md:
                continue

            lines = cleaned_md.split("\n")
            line_idx = 0
            while line_idx < len(lines):
                line = lines[line_idx].strip()
                if not line:
                    line_idx += 1
                    continue

                # Heading detection
                h_match = heading_re.match(line)
                if h_match:
                    level = len(h_match.group(1))
                    title = h_match.group(2).strip().replace("**", "").replace("*", "")
                    # Reset deeper levels
                    heading_stack = {k: v for k, v in heading_stack.items() if k < level}
                    heading_stack[level] = title
                    # Build breadcrumb
                    sorted_levels = sorted(heading_stack.keys())
                    current_section = " > ".join(heading_stack[l] for l in sorted_levels)
                    blocks.append({
                        "type": "heading",
                        "text": line,
                        "page": page.page_num,
                        "section": current_section,
                    })
                    line_idx += 1
                    continue

                # Table detection
                if table_row_re.match(line):
                    table_lines = [line]
                    line_idx += 1
                    while line_idx < len(lines) and (table_row_re.match(lines[line_idx].strip()) or not lines[line_idx].strip()):
                        if lines[line_idx].strip():
                            table_lines.append(lines[line_idx].strip())
                        line_idx += 1

                    table_text = "\n".join(table_lines)
                    table_toks = estimate_tokens(table_text)
                    if table_toks > self.max_tokens:
                        split_tables = split_oversized_table(table_text, max_tokens=self.max_tokens)
                        for st in split_tables:
                            blocks.append({
                                "type": "table",
                                "text": st,
                                "page": page.page_num,
                                "section": current_section,
                            })
                    else:
                        blocks.append({
                            "type": "table",
                            "text": table_text,
                            "page": page.page_num,
                            "section": current_section,
                        })
                    continue

                # Regular paragraph or list block
                para_lines = [line]
                line_idx += 1
                while line_idx < len(lines):
                    next_line = lines[line_idx].strip()
                    if not next_line:
                        line_idx += 1
                        break
                    if heading_re.match(next_line) or table_row_re.match(next_line):
                        break
                    para_lines.append(next_line)
                    line_idx += 1

                blocks.append({
                    "type": "paragraph",
                    "text": "\n".join(para_lines),
                    "page": page.page_num,
                    "section": current_section,
                })

        # 2. Group blocks into chunks with token budget and overlap
        raw_chunks: List[Dict[str, Any]] = []
        cur_blocks: List[Dict[str, Any]] = []
        cur_tokens = 0
        cur_page_start: Optional[int] = None
        cur_page_end: Optional[int] = None
        cur_section: str = "Handbook Overview"

        for b in blocks:
            b_tokens = estimate_tokens(b["text"])
            if cur_page_start is None:
                cur_page_start = b["page"]
            cur_page_end = b["page"]
            cur_section = b["section"]

            # If adding this block exceeds target tokens and we have enough content
            if cur_tokens + b_tokens > self.max_tokens and cur_tokens >= self.min_tokens:
                chunk_text = "\n\n".join(cb["text"] for cb in cur_blocks)
                raw_chunks.append({
                    "text": chunk_text,
                    "page_start": cur_page_start,
                    "page_end": cur_page_end,
                    "section": cur_section,
                })

                # Compute overlap from trailing blocks
                overlap_accum = []
                overlap_toks = 0
                for cb in reversed(cur_blocks):
                    c_tok = estimate_tokens(cb["text"])
                    if overlap_toks + c_tok <= self.overlap_tokens:
                        overlap_accum.insert(0, cb)
                        overlap_toks += c_tok
                    else:
                        break

                cur_blocks = list(overlap_accum)
                cur_tokens = overlap_toks
                cur_page_start = cur_blocks[0]["page"] if cur_blocks else b["page"]

            cur_blocks.append(b)
            cur_tokens += b_tokens
            cur_page_end = b["page"]

        if cur_blocks:
            chunk_text = "\n\n".join(cb["text"] for cb in cur_blocks)
            raw_chunks.append({
                "text": chunk_text,
                "page_start": cur_page_start or 1,
                "page_end": cur_page_end or 1,
                "section": cur_section,
            })

        # 3. Create DocumentChunk instances and stitch prev/next pointers
        chunks: List[DocumentChunk] = []
        for i, rc in enumerate(raw_chunks):
            chunk_id = f"{doc_id}_chunk_{i:04d}"
            prev_id = f"{doc_id}_chunk_{i-1:04d}" if i > 0 else None
            next_id = f"{doc_id}_chunk_{i+1:04d}" if i < len(raw_chunks) - 1 else None
            section_path = rc["section"]
            body_text = rc["text"]
            # Rich embed text combining title, section path and body
            embed_text = f"{doc_name} > {section_path}\n{body_text}"

            chunks.append(DocumentChunk(
                chunk_id=chunk_id,
                doc_id=doc_id,
                doc_name=doc_name,
                page_start=rc["page_start"],
                page_end=rc["page_end"],
                section_path=section_path,
                chunk_index=i,
                prev_id=prev_id,
                next_id=next_id,
                text=body_text,
                embed_text=embed_text,
            ))

        logger.info(f"Chunked '{doc_name}' into {len(chunks)} structure-aware chunks.")
        return chunks
