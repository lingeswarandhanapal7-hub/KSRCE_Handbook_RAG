import pytest
from app.rag.query_rewriter import query_rewriter
from app.rag.retriever import hybrid_retriever

@pytest.mark.asyncio
async def test_query_rewriter_intent_and_heuristics():
    # Test greeting heuristic
    res_greet = await query_rewriter.rewrite("hello")
    assert res_greet.intent == "greeting"

    # Test out-of-scope heuristic
    res_oos = await query_rewriter.rewrite("Who won the cricket world cup in 2023?")
    assert res_oos.intent == "out_of_scope"

    # Test handbook question heuristic
    res_hb = await query_rewriter.rewrite("What is the minimum attendance requirement?")
    assert res_hb.intent == "handbook_question"
    assert len(res_hb.queries) == 3

@pytest.mark.asyncio
async def test_retriever_attendance_hit():
    # Test retrieval on attendance query
    result = await hybrid_retriever.retrieve(
        queries=["What is the minimum attendance percentage?", "attendance condonation rules", "attendance requirement"],
        standalone_question="What is the minimum attendance requirement?",
        top_k_candidates=15,
        final_top_n=5
    )
    assert len(result.sources) > 0
    # Expected page is between page 1 and 268, with attendance keywords
    combined = " ".join([f"{s.section_path} {s.snippet}".lower() for s in result.sources])
    assert "attendance" in combined

@pytest.mark.asyncio
async def test_retriever_empty_or_nonsense():
    result = await hybrid_retriever.retrieve(
        queries=["xyznonexistenttoken123456789"],
        standalone_question="xyznonexistenttoken123456789",
        top_k_candidates=15,
        final_top_n=5
    )
    # Should safely return without crashing
    assert isinstance(result.sources, list)
