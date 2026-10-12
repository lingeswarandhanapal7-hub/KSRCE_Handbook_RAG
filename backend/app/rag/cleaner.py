import re
import unicodedata
from typing import List

# Patterns matching repetitive header / footer artifacts
HEADER_FOOTER_PATTERNS = [
    re.compile(r"^\s*K\s*S\s*R\s*CE\s+HANDBOOK\s*$", re.IGNORECASE),
    re.compile(r"^\s*K\.S\.R\.\s+COLLEGE\s+OF\s+ENGINEERING.*HANDBOOK\s*$", re.IGNORECASE),
    re.compile(r"^\s*HANDBOOK\s+\(?\d{4}\s*-\s*\d{4}\)?\s*$", re.IGNORECASE),
    re.compile(r"^\s*Page\s+\d+\s+of\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"^\s*\d+\s+K\s*S\s*R\s*CE\s+HANDBOOK.*$", re.IGNORECASE),
    re.compile(r"^\s*[-—_]{3,}\s*$"), # standalone horizontal dividers
]

def repair_hyphenation(text: str) -> str:
    """Repairs hyphenated line breaks like 'impor-\n    tant' -> 'important'."""
    return re.sub(r"(\b\w+)-\n\s*(\w+\b)", r"\1\2", text)

def normalize_unicode(text: str) -> str:
    """Normalizes unicode to NFKC and fixes non-breaking spaces and smart quotes."""
    text = unicodedata.normalize("NFKC", text)
    replacements = {
        "\u00a0": " ",
        "\u200b": "",
        "\u200e": "",
        "\u200f": "",
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "—": "-",
        "–": "-",
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
    return text

def clean_page_markdown(markdown_text: str) -> str:
    """
    Cleans markdown extracted from a single page:
    - Normalizes unicode and removes zero-width artifacts
    - Repairs broken hyphenated words across lines
    - Removes recurring headers and footers
    - Normalizes whitespace while strictly preserving tables, headings, and lists
    """
    if not markdown_text:
        return ""

    text = normalize_unicode(markdown_text)
    text = repair_hyphenation(text)

    lines = text.split("\n")
    cleaned_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        # Check against header/footer patterns
        is_junk = False
        for pattern in HEADER_FOOTER_PATTERNS:
            if pattern.match(stripped):
                is_junk = True
                break

        # Standalone isolated page numbers
        if re.match(r"^\s*[-–—]?\s*\d{1,3}\s*[-–—]?\s*$", stripped):
            is_junk = True

        if not is_junk:
            cleaned_lines.append(line)

    # Rejoin lines
    result = "\n".join(cleaned_lines)

    # Collapse 3+ newlines into 2 to keep markdown paragraph separation intact
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()
