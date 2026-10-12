# 🎓 KSRCE Multilingual AI Handbook Assistant

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A production-grade, voice-enabled, multilingual Retrieval-Augmented Generation (RAG) assistant strictly grounded in the official **K.S.R. College of Engineering (Autonomous) Student Handbook** (268 pages).

Designed to answer student, parent, and faculty inquiries regarding:
- 📜 **Academic Regulations** (CBCS, Curriculum, Grading, CGPA calculations)
- ⏱️ **Attendance & Condonation Rules** (Minimum 75%, 65% on medical grounds)
- 📝 **Examination Procedures** (Continuous Internal Assessment, Semester Exams, Revaluation)
- 💳 **Fee Payment Schedules & Penalties**
- 🏠 **Hostel Regulations, Study Hours & Campus Discipline**

---

## ✨ Key Capabilities

1. **Strictly Grounded (Zero Hallucinations):** Answers are constructed exclusively from retrieved handbook passages. If information is absent, the system declines gracefully and presents relevant handbook sections.
2. **Inline Interactive Citations (`[S1]`, `[S2]`):** Every claim features clickable citation chips that slide open a drawer showing exact handbook excerpts and an embedded PDF deep-link (`#page=N`).
3. **12 Indian Regional Languages + English:** Full bidirectional support for Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, Odia, and English (India).
4. **Dual-Path Voice Interface:**
   - **Speech-to-Text (STT):** Browser Web Speech API for low-latency native dictation + fallback to Google Gemini Multimodal Audio transcription (`/api/stt`).
   - **Text-to-Speech (TTS):** Streaming `gemini-3.8-flash-tts` with RIFF/WAV header wrapping and browser `speechSynthesis` fallback.
5. **Hands-Free Fullscreen Voice Mode:** Animated amplitude-reactive orb, live captioning, continuous auto-listening, and barge-in (speaking stops active audio playback).
6. **Robust Hybrid Retrieval:**
   - Semantic Vector Search via **ChromaDB** (cosine metric, 3072-dim embeddings).
   - Lexical Search via **BM25Okapi** for exact course codes, regulation numbers, and percentages.
   - Merged with **Reciprocal Rank Fusion (RRF $k=60$)** + Structured Gemini Reranking.
7. **Offline-Ready Client:** Session history persisted locally in IndexedDB (Dexie), PWA installable with service worker shell caching.

---

## 🏗️ Architecture & Project Structure

```
RAG/
├── Data/                          # Read-only institutional PDFs (auto-discovered)
│   └── ksrce Handbook 24-25.pdf
├── backend/
│   ├── app/
│   │   ├── api/                   # chat, voice, languages, documents, feedback, health, admin
│   │   ├── rag/                   # loader, cleaner, chunker, embeddings, vectorstore, bm25,
│   │   │                          # query_rewriter, retriever, reranker, prompts, pipeline
│   │   ├── services/              # gemini_client, stt, tts, translate, suggestions, cache
│   │   ├── utils/                 # structured JSON logging, error handling
│   │   ├── config.py              # pydantic-settings
│   │   ├── main.py                # FastAPI app factory, CORS, rate limits, SPA static mount
│   │   └── schemas.py             # Pydantic v2 schemas
│   ├── scripts/
│   │   ├── ingest.py              # Ingestion CLI & automatic background coordinator
│   │   └── evaluate.py            # Automated Hit-rate@5 and groundedness benchmark
│   ├── storage/                   # Chroma vector DB, caches (gitignored)
│   ├── tests/                     # Pytest suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/            # layout, chat, composer, voice, dialogs, ui
│   │   ├── hooks/                 # useVoiceInput, useVoiceOutput, useAudioAnalyser
│   │   ├── i18n/                  # 12 Indic locales + English translation JSONs
│   │   ├── lib/                   # api client, SSE parser, motion presets
│   │   ├── store/                 # Dexie IndexedDB, Zustand chatStore & settingsStore
│   │   └── index.css              # Custom tokens, Indic fonts, aurora glow effects
│   └── package.json
├── start.ps1                      # One-click launcher for Windows PowerShell
├── README.md
└── ARCHITECTURE.md                # System design and Mermaid flow diagrams
```

---

## 🚀 Quick Start (Windows)

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and `npm`
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 1. Configure API Key
Create or verify `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_EMBED_MODEL=gemini-embedding-001
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
RERANK_MODE=gemini
ADMIN_KEY=ksrce-admin-secret-2024
```

### 2. Launch Everything with One Click
In PowerShell, run:
```powershell
.\start.ps1
```
This automatically boots:
- **Backend API:** `http://localhost:8000` (FastAPI docs at `/docs`)
- **Frontend UI:** `http://localhost:5173`

---

## 🛠️ Manual Start (Alternative)

### Backend:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend:
```powershell
cd frontend
npm install
npm run dev
```

---

## 🔄 Re-indexing & Adding New Documents

The system automatically detects new PDF documents in `Data/` at startup by comparing SHA-256 hashes against the cached index manifest.

To trigger an explicit rebuild:
```powershell
cd backend
python scripts/ingest.py --rebuild
```
Or via HTTP API:
```bash
curl -X POST http://localhost:8000/api/admin/reindex -H "X-Admin-Key: ksrce-admin-secret-2024"
```

---

## 🌐 Adding a New Language

Adding a language requires two quick steps:
1. Add the language metadata in `backend/app/config.py` and `frontend/src/components/layout/LanguageSelector.tsx`:
   ```ts
   { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', stt: true, tts: true }
   ```
2. Create the translation dictionary at `frontend/src/i18n/locales/mr.json` and register it in `frontend/src/i18n/index.ts`.

> **Note on Translations:** Interface strings for regional languages were generated using high-accuracy AI translation and should be reviewed by a native speaker before institutional deployment.

---

## 🧪 Testing & Evaluation Benchmark

### Run Backend Unit Tests:
```powershell
cd backend
pytest tests/
```

### Run Groundedness & Hit-rate@5 Evaluation:
```powershell
cd backend
python scripts/evaluate.py
```
Evaluates:
- **Hit-Rate@5:** Verifies that retrieved passages contain the exact handbook pages answering regulation queries (Target: $\ge 90\%$).
- **Groundedness:** Confirms answers only cite facts in the context.
- **Out-of-Scope Precision:** Asserts queries outside the handbook are politely declined.

---

## 📝 Documented Assumptions & Decisions

1. **Document Discovery:** Scans `Data/` dynamically using case-insensitive path canonicalization (`p.resolve()`) to avoid file duplicate errors on Windows NTFS.
2. **Embeddings Rate-Limiting:** Gemini embedding batches use adaptive exponential backoff with persistent on-disk caching (`storage/caches/chunk_embeddings_cache.json`) to guarantee progress persists across restarts.
3. **Barge-In:** The microphone triggers a global event `(window).__ksrce_stop_audio()` that immediately terminates any active audio stream.
