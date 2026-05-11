"""
Pure unit tests for service layer logic — no DB, no real API calls.
"""
import pytest
import numpy as np


# ── keyword_service ───────────────────────────────────────────────────────────
from app.services.keyword_service import classify_intent, cluster_keywords, pick_cluster_name

def test_classify_intent_informational():
    assert classify_intent("how to write content") == "informational"
    assert classify_intent("what is seo") == "informational"

def test_classify_intent_commercial():
    assert classify_intent("best content marketing tools") == "commercial"
    assert classify_intent("top crm software") == "commercial"

def test_classify_intent_transactional():
    assert classify_intent("buy seo software") == "transactional"
    assert classify_intent("seo tool pricing") == "transactional"

def test_classify_intent_navigational():
    assert classify_intent("hubspot login") == "navigational"

def test_classify_intent_default():
    assert classify_intent("content marketing") == "informational"

def test_cluster_keywords_basic():
    rng = np.random.default_rng(42)
    embeddings = rng.random((10, 32)).astype(np.float32)
    labels = cluster_keywords(embeddings, n_clusters=3)
    assert len(labels) == 10
    assert set(labels).issubset({0, 1, 2})

def test_cluster_keywords_fewer_than_n():
    """Should not crash when items < requested clusters."""
    rng = np.random.default_rng(0)
    embeddings = rng.random((2, 32)).astype(np.float32)
    labels = cluster_keywords(embeddings, n_clusters=5)
    assert len(labels) == 2

def test_pick_cluster_name():
    assert pick_cluster_name(["content marketing strategy", "content marketing", "marketing"]) == "marketing"


# ── serp_service ──────────────────────────────────────────────────────────────
from app.services.serp_service import extract_domain, rough_readability, extract_entities_simple

def test_extract_domain():
    assert extract_domain("https://www.hubspot.com/blog/post") == "hubspot.com"
    assert extract_domain("https://moz.com/learn") == "moz.com"

def test_rough_readability_easy():
    easy_text = "Go here now. Do this fast. It works well."
    score = rough_readability(easy_text)
    assert score > 50

def test_rough_readability_hard():
    hard_text = "Supercalifragilistic phenomenological epistemological considerations underpinning contemporary hermeneutics."
    score = rough_readability(hard_text)
    assert score < 70

def test_rough_readability_empty():
    assert rough_readability("") == 50.0

def test_extract_entities():
    text = "Google Analytics and Adobe Marketing Cloud are popular tools used by Digital Marketers."
    entities = extract_entities_simple(text)
    assert len(entities) > 0
    assert any("Google" in e for e in entities)


# ── ai_scan_service ───────────────────────────────────────────────────────────
from app.services.ai_scan_service import extract_urls, urls_to_domains

def test_extract_urls_basic():
    text = "See https://hubspot.com and https://moz.com/learn for more info."
    urls = extract_urls(text)
    assert "https://hubspot.com" in urls
    assert "https://moz.com/learn" in urls

def test_extract_urls_cleans_punctuation():
    text = "Check this out: https://example.com."
    urls = extract_urls(text)
    assert urls[0] == "https://example.com"

def test_extract_urls_empty():
    assert extract_urls("No URLs here") == []

def test_urls_to_domains():
    urls = ["https://www.hubspot.com/blog", "https://moz.com", "https://www.hubspot.com/other"]
    domains = urls_to_domains(urls)
    assert "hubspot.com" in domains
    assert "moz.com" in domains
    # Deduplication
    assert domains.count("hubspot.com") == 1


# ── heatmap_service ───────────────────────────────────────────────────────────
from app.services.heatmap_service import compute_coverage_score, build_heatmap

def test_coverage_score_full():
    domains = ["a.com", "b.com", "c.com", "d.com", "e.com"]
    assert compute_coverage_score(domains) == 1.0

def test_coverage_score_partial():
    domains = ["a.com", "b.com"]
    score = compute_coverage_score(domains)
    assert 0.0 < score < 1.0

def test_coverage_score_empty():
    assert compute_coverage_score([]) == 0.0

def test_build_heatmap_structure():
    serp = [{"position": i+1, "domain": f"serp{i}.com", "entities": []} for i in range(5)]
    ai = [
        {"engine": "openai",  "cited_domains": ["serp0.com", "ai1.com"]},
        {"engine": "gemini",  "cited_domains": ["ai2.com", "ai3.com"]},
    ]
    result = build_heatmap("test query", serp, ai)
    assert result["query"] == "test query"
    assert len(result["channels"]) == 3  # google + openai + gemini
    assert "overlap_analysis" in result
    assert "insight" in result

def test_build_heatmap_gap_detection():
    serp = [{"position": i+1, "domain": f"d{i}.com", "entities": []} for i in range(5)]
    # AI cites completely different domains → expect gap
    ai = [{"engine": "openai", "cited_domains": ["totally-different.com"]}]
    result = build_heatmap("query", serp, ai)
    openai_channel = next(c for c in result["channels"] if c["channel"] == "openai")
    assert openai_channel["gap"] is True


# ── question_service ──────────────────────────────────────────────────────────
from app.services.question_service import classify_q_type, deduplicate_questions

def test_classify_q_type():
    assert classify_q_type("How do I use this?") == "how"
    assert classify_q_type("What is SEO?") == "what"
    assert classify_q_type("Why does content marketing work?") == "why"
    assert classify_q_type("When should I post?") == "when"
    assert classify_q_type("Who are the experts?") == "who"
    assert classify_q_type("Where do I start?") == "where"

def test_deduplicate_questions():
    qs = [
        {"question_text": "What is SEO?", "source": "paa", "q_type": "what"},
        {"question_text": "What is SEO?", "source": "ai",  "q_type": "what"},
        {"question_text": "How does SEO work?", "source": "paa", "q_type": "how"},
    ]
    deduped = deduplicate_questions(qs)
    assert len(deduped) == 2
    texts = [q["question_text"] for q in deduped]
    assert texts.count("What is SEO?") == 1
