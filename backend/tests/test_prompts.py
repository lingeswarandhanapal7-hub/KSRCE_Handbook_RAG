import pytest
from app.rag.prompts import SYSTEM_GROUNDING_PROMPT, build_user_prompt
from app.rag.retriever import SourceCitation

def test_system_grounding_prompt():
    assert "You are the official handbook assistant" in SYSTEM_GROUNDING_PROMPT
    assert "Answer ONLY using information explicitly stated in the CONTEXT blocks" in SYSTEM_GROUNDING_PROMPT
    assert "[S1]" in SYSTEM_GROUNDING_PROMPT
    assert "Never use outside knowledge" in SYSTEM_GROUNDING_PROMPT

def test_build_user_prompt():
    citation = SourceCitation(
        citation_id="S1",
        doc_name="ksrce Handbook 24-25.pdf",
        page_start=12,
        page_end=12,
        section_path="Academics > Attendance",
        snippet="Minimum attendance required is 75%.",
        score=0.95,
        chunk_id="c1"
    )
    prompt = build_user_prompt("What is minimum attendance?", [citation], target_language="ta-IN")
    assert "USER QUESTION" in prompt
    assert "[S1]" in prompt
    assert "ta-IN" in prompt
