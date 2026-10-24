# Backend — Enterprise Structured Ingestion Firewall

FastAPI backend that validates incoming messages, classifies them with a Groq-hosted LLM, and returns a Pydantic-validated JSON response.

## Main components

- `app/main.py` — FastAPI application, health check, and `/api/analyze` endpoint.
- `app/config.py` — loads `GROQ_API_KEY` and `GROQ_MODEL` from environment variables.
- `app/schemas/ingestion.py` — request and response Pydantic models.
- `app/services/llm_service.py` — Groq + Instructor structured-output integration.
- `app/utils/token_counter.py` — local token-count estimation.
- `requirements.txt` — Python dependencies.

## Setup

Run these commands from the `backend` directory.

```bash
python -m venv .venv
```

Activate the environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux**
```bash
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create a `.env` file in this directory based on `.env.example`:

```dotenv
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Do not commit `.env` or expose your API key.

## Run the backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the API documentation.

## Endpoints

- `GET /health` — API health check.
- `POST /api/analyze` — accepts `{"message": "Where is my order?"}` and returns a structured classification.

## Notes

- Blank messages are rejected; messages are limited to 5,000 characters.
- The app classifies messages but does not execute order, payment, or time-related actions.
- A provider/configuration/schema failure may return HTTP 502. Check the API key, model availability, connectivity, and provider limits.
