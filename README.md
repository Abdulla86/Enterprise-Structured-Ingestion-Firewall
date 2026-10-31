# Indigo AI 

## Intellegent Message Processiong & Response Platform

A customer-support AI assistant that puts a **validation layer in front of the LLM**. Every user message is classified into a strict, Pydantic-validated structure (intent, risk, priority, whether action is needed) *before* a reply is written, and the whole conversation is stored in SQLite so follow-up questions keep their context.

| Part | Stack | Folder |
|---|---|---|
| Backend API | Python, FastAPI, Groq LLM, Instructor, Pydantic, SQLite | [`backend/`](backend/README.md) |
| Frontend app | React 18, Vite 5, React Router, react-markdown | [`frontend/`](frontend/README.md) |

---

## How it works

```text
Browser (React, :5173)
   │  POST /api/analyze  { message, session_id? }
   ▼
Vite dev proxy ──► FastAPI (:8000)
                     1. Validate request          schemas/ingestion.py   (1–5000 chars, no extra fields)
                     2. Classify message          services/llm_service.py (Groq + Instructor → IngestionResult)
                     3. Estimate tokens           utils/token_counter.py
                     4. Load last 12 messages     services/database_service.py
                     5. Write Markdown answer     services/response_service.py (Groq)
                     6. Save user + AI messages   services/database_service.py (SQLite)
                     7. Return AssistantResult    { intent, risk_profile, priority, requires_action,
                                                    summary, token_metadata, session_id, response_markdown }
```

The assistant **only classifies and answers**. It does not look up real orders, payments, or the time.

---

## Project structure

```text
Enterprise-Structured-Ingestion-Firewall/
├── README.md                         ← you are here (overview)
├── .gitignore                        ← ignores backend/.env, .venv, __pycache__, editor folders
│
├── backend/                          ← FastAPI service  (see backend/README.md)
│   ├── README.md
│   ├── requirements.txt              ← Python dependencies
│   ├── .env                          ← your real secrets (never commit/share)
│   ├── .env.example                  ← template for .env
│   └── app/
│       ├── main.py                   ← FastAPI app + all 4 endpoints
│       ├── config.py                 ← reads env vars (API key, model, DB path)
│       ├── schemas/
│       │   ├── ingestion.py          ← request model + classification result model
│       │   └── assistant.py          ← final API response model
│       ├── services/
│       │   ├── llm_service.py        ← step 1: classify message (structured output)
│       │   ├── response_service.py   ← step 2: write the Markdown answer
│       │   ├── database_service.py   ← SQLite: conversations + messages
│       │   └── conversation_service.py ← older in-memory history (currently unused)
│       ├── utils/
│       │   └── token_counter.py      ← local token estimate
│       └── data/
│           └── chat.db               ← SQLite file, auto-created at startup
│
├── frontend/                         ← React + Vite app  (see frontend/README.md)
│   ├── README.md
│   ├── package.json / package-lock.json
│   ├── vite.config.js                ← dev server + proxy to backend
│   ├── index.html                    ← page shell
│   └── src/
│       ├── main.jsx, App.jsx         ← bootstrap + routes
│       ├── pages/                    ← Landing.jsx, Chat.jsx
│       ├── components/               ← Sidebar, MessageList, Composer, InsightsPanel, ...
│       ├── hooks/                    ← useBackendStatus, useTheme
│       ├── lib/                      ← api.js, intents.js, time.js
│       └── styles/                   ← global.css, landing.css, chat.css
│
└── gro/                              ← a Python virtual environment (NOT source code)
```

> `gro/` is a local Windows (Python 3.14) virtual environment holding installed packages. It is not part of the app and should not be committed. See [Housekeeping](#housekeeping).

---

## Quick start

You need **Python 3.10+**, **Node.js 18+**, and a free [Groq API key](https://console.groq.com/).

**1. Backend** (terminal 1)

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .\.venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit .env and add your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

**2. Frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## API at a glance

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Is the API up? |
| GET | `/api/conversations` | Recent chats for the sidebar (latest 30) |
| GET | `/api/conversations/{session_id}/messages` | Full message history of one chat |
| POST | `/api/analyze` | Classify a message, generate a reply, save both |

Details and example payloads: [`backend/README.md`](backend/README.md).

---

## Intent values

Defined once in `backend/app/schemas/ingestion.py` and mirrored for display in `frontend/src/lib/intents.js`. If you add one, update both.

| Field | Allowed values |
|---|---|
| `intent` | `greeting`, `order_tracking`, `payment_issue`, `current_time`, `general_question`, `unknown` |
| `risk_profile` | `low`, `medium`, `high`, `unknown` |
| `priority` | `low`, `medium`, `high` |

---

## Housekeeping

Things worth tidying up, found while documenting the project:

1. **Virtual environment in the project root.** `gro/` is not covered by `.gitignore`. Add `gro/` to the root `.gitignore` (and remove it from Git if already tracked), then recreate your environment as `backend/.venv`, which *is* ignored.
2. **Secrets.** `backend/.env` holds your real Groq key. It is git-ignored, but don't zip/share the folder with it inside. Regenerate the key if it was ever shared.
3. **`.env.example` placeholder.** The `SQLITE_PATH` line contains a sentence instead of a path. If copied as-is it becomes the database path. Delete the line or set it to something like `data/chat.db`.
4. **Missing favicon.** `index.html` points to `/favicon.svg`, but there is no `frontend/public/` folder. Add `frontend/public/favicon.svg` or remove the `<link>`.
5. **Unused file.** `conversation_service.py` (in-memory history) is not imported anywhere; history now comes from SQLite. Safe to delete if you don't need it.
6. **Database file in the repo.** `backend/app/data/chat.db` is runtime data (your chat history). Consider adding `*.db` to `.gitignore`.
7. **Landing-page GitHub link.** `Landing.jsx` links to a different repository than the one in `.git/config`. Update `REPO_URL` if that's not intended.
8. **CORS is open** (`allow_origins=["*"]`). Fine for local development; restrict it before deploying.
