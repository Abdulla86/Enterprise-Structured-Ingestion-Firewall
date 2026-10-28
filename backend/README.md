# Backend: Enterprise Structured Ingestion Firewall

FastAPI service that receives a user message, classifies it with a Groq-hosted LLM into a **Pydantic-validated** structure, writes a Markdown reply using recent chat history, and stores everything in **SQLite**.

---

## Folder structure and what each file does

```text
backend/
├── README.md
├── requirements.txt
├── .env                      ← real secrets (git-ignored)
├── .env.example              ← template for .env
├── .gitignore                ← ignores .env
└── app/
    ├── main.py
    ├── config.py
    ├── schemas/
    │   ├── ingestion.py
    │   └── assistant.py
    ├── services/
    │   ├── llm_service.py
    │   ├── response_service.py
    │   ├── database_service.py
    │   └── conversation_service.py
    ├── utils/
    │   └── token_counter.py
    └── data/
        └── chat.db
```

### Entry point and config

| File | What it does |
|---|---|
| `app/main.py` | Creates the FastAPI app (title "Enterprise Ingestion Firewall", v4.0.0), enables CORS, creates the DB tables on startup, and defines all endpoints. `/api/analyze` is the main pipeline (see below). |
| `app/config.py` | Loads `.env` and exposes `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`) and `SQLITE_PATH`. |

### Schemas (data shapes)

| File | What it does |
|---|---|
| `app/schemas/ingestion.py` | `IngestionRequest`: incoming body, `message` (1–5000 chars, blank rejected) and optional `session_id`; unknown fields are forbidden. `IngestionResult`: the validated classification (`intent`, `risk_profile`, `priority`, `requires_action`, `summary`, `token_metadata`). Also defines the allowed values (`Intent`, `RiskProfile`, `Priority`). |
| `app/schemas/assistant.py` | `AssistantResult`: the final API response. It is `IngestionResult` plus `session_id` and `response_markdown`. |

### Services (business logic)

| File | What it does |
|---|---|
| `app/services/llm_service.py` | **Step 1, classify.** Sends the message to Groq through the Instructor library with `temperature=0` and up to 2 retries, forcing the output to match `IngestionResult`. Holds the classification system prompt, which also tells the model to treat the user's text as data, not instructions. |
| `app/services/response_service.py` | **Step 2, answer.** Builds a prompt from the system rules, the last 12 messages, the current message and the classification JSON, then asks Groq for a Markdown reply (`temperature=0.3`, `max_tokens=1200`). It is told never to ask for passwords/OTPs/card numbers or claim it performed external actions. |
| `app/services/database_service.py` | SQLite storage using Python's built-in `sqlite3`. Creates the tables, saves messages, returns the last 12 messages for context, lists conversations and returns a conversation's messages. WAL mode is on and foreign keys are enforced. |
| `app/services/conversation_service.py` | An earlier **in-memory** history store (lost on restart). **Not used any more**: `main.py` uses `database_service.py` instead. Can be deleted. |

### Utilities and data

| File | What it does |
|---|---|
| `app/utils/token_counter.py` | `estimate_tokens(text)`: uses `tiktoken` (`cl100k_base`) if available, otherwise a rough word-count fallback. Estimate only, not for billing. |
| `app/data/chat.db` | The SQLite database. Created automatically at startup. Contains your chat history. |

### Other files

| File | What it does |
|---|---|
| `requirements.txt` | Dependencies: fastapi, uvicorn, groq, instructor, pydantic, python-dotenv, tiktoken, pytest, httpx. |
| `.env.example` | Template listing the variables below. |

---

## Request flow: `POST /api/analyze`

1. Validate the body (`IngestionRequest`). Blank message gives 422.
2. Use the supplied `session_id` or create a new UUID. A non-UUID gives 422.
3. `ensure_conversation()`: create the conversation row if new (title = first 70 characters of the message).
4. `analyze_message()`: Groq + Instructor returns a validated `IngestionResult`.
5. `estimate_tokens()`: fills `token_metadata.estimated_input_tokens`.
6. `get_chat_history()`: last 12 messages of this session.
7. `generate_response()`: Markdown answer using the classification and history.
8. Save the user message and the assistant reply to SQLite.
9. Return `AssistantResult`.

> The user's message is saved **after** the answer is generated, so a failed request leaves no half-saved turn.

---

## Database schema

```sql
conversations(id TEXT PRIMARY KEY, title TEXT, created_at TEXT, updated_at TEXT)
messages(id INTEGER PRIMARY KEY AUTOINCREMENT,
         conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
         role TEXT CHECK (role IN ('user','assistant')),
         content TEXT, created_at TEXT)
-- index: idx_messages_conversation_created (conversation_id, created_at)
```

Timestamps are ISO-8601 UTC strings.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{"status":"ok","message":"...","database":"sqlite"}`. The frontend polls this for the green/red dot. |
| GET | `/api/conversations` | `{"items":[{session_id, title, updated_at, preview}]}`, newest first, max 30. |
| GET | `/api/conversations/{session_id}/messages` | `{"session_id", "items":[{role, content, created_at}]}`. Invalid UUID gives 400. |
| POST | `/api/analyze` | Main endpoint (below). |

**Request**

```json
{ "message": "My payment was deducted twice.", "session_id": "optional-uuid" }
```

**Response**

```json
{
  "intent": "payment_issue",
  "risk_profile": "medium",
  "priority": "high",
  "requires_action": true,
  "summary": "User reports a duplicate payment deduction.",
  "token_metadata": { "estimated_input_tokens": 8, "note": "Estimated locally; may differ from provider token counts." },
  "session_id": "3f0c...-uuid",
  "response_markdown": "Sorry about the double charge. ..."
}
```

**Errors:** `422` invalid/blank input or bad `session_id`; `502` the model output failed schema validation, or the AI/provider/DB call failed (check the key, model name, network and Groq limits).

---

## Configuration (`.env`)

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | none | Your Groq API key. Without it `/api/analyze` returns 502. |
| `GROQ_MODEL` | No | `openai/gpt-oss-120b` | Groq model used for both classification and answers. |
| `SQLITE_PATH` | No | `data/chat.db` | Database file, **relative to the `app/` folder** (so the default is `backend/app/data/chat.db`). |

Never commit `.env`. Note that the `SQLITE_PATH` line in `.env.example` currently contains a placeholder sentence; replace it with a real path or delete it.

---

## Setup and run

Run from the `backend/` folder.

```bash
python -m venv .venv
```

Activate it:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```
```bash
# macOS / Linux
source .venv/bin/activate
```

Install and start:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env      # then add your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

Quick test:

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is my order?"}'
```

---

## Notes

- Classification (`temperature=0`) is deterministic; the answer (`temperature=0.3`) is slightly more natural.
- Only the latest **12 messages** (six exchanges) are sent to the model as history.
- CORS currently allows all origins, which is fine for local development. Restrict it for production.
- The service classifies and answers only; it never performs order, payment or time lookups.
