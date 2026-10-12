import pytest
from app.rag.cleaner import clean_page_markdown, repair_hyphenation

def test_clean_page_markdown():
    sample_raw = """
    K.S.R. COLLEGE OF ENGINEERING HANDBOOK 2024-2025
    Page 12 of 268

    The minimum attendance re-
    quirement for each semester is 75%.

    | Sem | Minimum % |
    |---|---|
    | All | 75% |

    1. Students with less than 75% attendance are not eligible.
    2. Condonation up to 65% is allowed on medical grounds.
    """
    cleaned = clean_page_markdown(sample_raw)

    # Hyphen break should be repaired
    assert "re- quirement" not in cleaned
    assert "requirement" in cleaned

    # Markdown table should remain intact
    assert "| Sem | Minimum % |" in cleaned
    assert "| All | 75% |" in cleaned

    # Numbered rules should be preserved
    assert "1. Students" in cleaned
    assert "2. Condonation" in cleaned
