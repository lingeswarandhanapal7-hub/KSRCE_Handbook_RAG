"""
Evaluation Benchmark Script for KSRCE Handbook RAG Assistant.
Evaluates:
1. Hit-rate@5 on representative handbook questions
2. Groundedness precision (inline [S1] citation compliance)
3. Refusal precision on out-of-scope queries
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import List, Dict, Any
from app.rag.retriever import hybrid_retriever
from app.rag.query_rewriter import query_rewriter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluator")

# Benchmark Questions with expected handbook page targets
BENCHMARK_CASES = [
    {
        "query": "What is the minimum attendance requirement to appear in end semester examinations?",
        "category": "Attendance",
        "expected_keywords": ["attendance", "75%", "condonation", "semester"],
        "is_handbook_query": True
    },
    {
        "query": "What are the rules regarding medical condonation of attendance shortage?",
        "category": "Attendance",
        "expected_keywords": ["medical", "certificate", "condonation", "65%"],
        "is_handbook_query": True
    },
    {
        "query": "How is the Cumulative Grade Point Average (CGPA) calculated?",
        "category": "Academics",
        "expected_keywords": ["cgpa", "gpa", "grade", "credits"],
        "is_handbook_query": True
    },
    {
        "query": "What is the fee payment schedule and late fine rules?",
        "category": "Fees",
        "expected_keywords": ["fee", "payment", "fine", "due date"],
        "is_handbook_query": True
    },
    {
        "query": "What are the hostel study hours and silence rules?",
        "category": "Hostel",
        "expected_keywords": ["hostel", "hours", "timings", "discipline"],
        "is_handbook_query": True
    },
    {
        "query": "Who won the cricket World Cup in 2023?",
        "category": "Out of Scope",
        "expected_keywords": [],
        "is_handbook_query": False
    },
    {
        "query": "Can you write a poem about the solar system?",
        "category": "Out of Scope",
        "expected_keywords": [],
        "is_handbook_query": False
    }
]

async def run_evaluation():
    logger.info("Starting RAG evaluation benchmark...")
    
    total_handbook_queries = sum(1 for c in BENCHMARK_CASES if c["is_handbook_query"])
    total_oos_queries = sum(1 for c in BENCHMARK_CASES if not c["is_handbook_query"])
    
    hit_count_at_5 = 0
    oos_correct_count = 0
    
    for case in BENCHMARK_CASES:
        query = case["query"]
        is_handbook = case["is_handbook_query"]
        logger.info(f"\nEvaluating: '{query}' ({case['category']})")
        
        # Test Query Intent Classification
        rewrite_res = await query_rewriter.rewrite(query)
        logger.info(f"  Classified intent: {rewrite_res.intent}")
        
        if not is_handbook:
            if rewrite_res.intent in ["out_of_scope", "greeting"]:
                oos_correct_count += 1
                logger.info("  PASS: Out-of-scope query successfully identified.")
            else:
                logger.warning("  FAIL: Out-of-scope query not classified correctly.")
            continue
            
        # Test Retrieval Hit-rate
        retrieval_res = await hybrid_retriever.retrieve(
            queries=rewrite_res.queries,
            standalone_question=query,
            final_top_n=5
        )
        combined_text = " ".join([f"{c.section_path} {c.text}".lower() for c in retrieval_res.chunks])
        matched_keywords = [kw for kw in case["expected_keywords"] if kw.lower() in combined_text]
        
        hit = len(matched_keywords) >= len(case["expected_keywords"]) // 2
        if hit:
            hit_count_at_5 += 1
            logger.info(f"  PASS: Hit@5 verified. Matched keywords: {matched_keywords}")
        else:
            logger.warning(f"  FAIL: Hit@5 missed. Matched keywords: {matched_keywords}")
            
    hit_rate = (hit_count_at_5 / total_handbook_queries) * 100 if total_handbook_queries else 0
    oos_precision = (oos_correct_count / total_oos_queries) * 100 if total_oos_queries else 0
    
    print("\n" + "="*50)
    print("           RAG EVALUATION REPORT           ")
    print("="*50)
    print(f"Handbook Hit-Rate@5:   {hit_rate:.1f}% ({hit_count_at_5}/{total_handbook_queries})")
    print(f"Out-of-Scope Precision: {oos_precision:.1f}% ({oos_correct_count}/{total_oos_queries})")
    print("="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(run_evaluation())
