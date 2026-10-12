import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded", "initializing"]
    assert "models" in data
    assert "index" in data

def test_languages_endpoint():
    response = client.get("/api/languages")
    assert response.status_code == 200
    languages = response.json()
    assert isinstance(languages, list)
    assert len(languages) >= 12
    codes = [l["code"] for l in languages]
    assert "en-IN" in codes
    assert "ta-IN" in codes
    assert "hi-IN" in codes

def test_documents_endpoint():
    response = client.get("/api/documents")
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) > 0
    assert any("ksrce" in d["filename"].lower() or "handbook" in d["filename"].lower() for d in docs)

def test_suggestions_endpoint():
    response = client.get("/api/suggestions?language=en")
    assert response.status_code == 200
    suggestions = response.json()
    assert isinstance(suggestions, list)
    assert len(suggestions) > 0

def test_feedback_endpoint():
    response = client.post(
        "/api/feedback",
        json={"message_id": "test_msg_1", "rating": 1, "comment": "Excellent answer"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
