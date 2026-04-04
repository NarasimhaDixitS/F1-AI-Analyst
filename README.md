# F1 Analyst (FastF1 + FastAPI + React)

Data-first Formula 1 analysis app built with:
- **Backend:** FastAPI + FastF1 + Pandas
- **Frontend:** React + Vite + Plotly

It lets you query race/qualifying comparisons (e.g. `VER vs HAM`) and view:
- telemetry overlays,
- track map,
- race results,
- insights (race context, sector battle, timeline),
- speed-trap summary,
- tyre stint strategy view.

---

## Project Structure

```text
backend/   # FastAPI app + FastF1 data service
frontend/  # React Vite UI
cache/     # local FastF1 cache (ignored by git)
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

## 1) Backend Setup

```bash
cd /Users/narasimhadixits/Desktop/f1-ai-analyst/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create env file:

```bash
cp .env.example .env
```

If `.env.example` does not exist, create `backend/.env` manually.

### Optional API keys (for richer narrative text)
You can run without keys (rule-based fallback works), but for LLM-generated narrative add any one:

```env
GEMINI_API_KEY=...
# or
XAI_API_KEY=...
# or
OPENAI_API_KEY=...
```

Start backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir /Users/narasimhadixits/Desktop/f1-ai-analyst/backend
```

API docs: `http://localhost:8000/docs`

---

## 2) Frontend Setup

```bash
cd /Users/narasimhadixits/Desktop/f1-ai-analyst/frontend
npm install
```

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

Open: `http://localhost:5173`

---

## Typical Dev Workflow

Terminal 1 (backend):
```bash
cd /Users/narasimhadixits/Desktop/f1-ai-analyst/backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir /Users/narasimhadixits/Desktop/f1-ai-analyst/backend
```

Terminal 2 (frontend):
```bash
cd /Users/narasimhadixits/Desktop/f1-ai-analyst/frontend
npm run dev
```

---

## Git Hygiene

A root `.gitignore` is included to prevent committing:
- env/secrets files,
- venv and node modules,
- build outputs,
- FastF1 caches (`cache/`, `backend/cache/`, `*.ff1pkl`, `*.sqlite`),
- logs and editor artifacts.

If cache/env files were previously tracked, untrack them once:

```bash
git rm -r --cached cache backend/cache backend/.env
```

---

## Useful Commands

Frontend production build:
```bash
npm --prefix /Users/narasimhadixits/Desktop/f1-ai-analyst/frontend run build
```

Quick backend health check:
```bash
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8000/docs
```
