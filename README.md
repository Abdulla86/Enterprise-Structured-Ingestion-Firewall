# Enterprise Structured Ingestion Firewall

An AI-powered message classification that accepts a user message, sends it to a Groq-hosted LLM, and returns structured JSON validated against a Pydantic schema.

The project demonstrates a practical LLM ingestion pipeline using **FastAPI, Groq, Instructor, Pydantic, and a lightweight HTML/CSS/JavaScript frontend**.

## Features

- Accepts user messages through a web interface and a FastAPI endpoint.
- Validates incoming requests with Pydantic (`message` must not be blank and must be at most 5,000 characters).
- Classifies messages into one of these intents:
  - `greeting`
  - `order_tracking`
  - `payment_issue`
  - `current_time`
  - `general_question`
  - `unknown`
- Produces a structured result containing:
  - `intent`
  - `risk_profile`
  - `priority`
  - `requires_action`
  - `summary`
  - `token_metadata`
- Uses Instructor to request structured output from the Groq LLM and validate it against the `IngestionResult` schema.
- Estimates input tokens locally with `tiktoken`.
- Includes example-message buttons and a copy-JSON action in the frontend.
- Provides a health-check endpoint.

> **Scope note:** The app classifies messages only. It does not actually look up orders, process refunds, or retrieve the current time. Token counts are estimates and are not billing records.

## Technology stack

| Layer | Technologies |
|---|---|
| Backend API | Python, FastAPI, Uvicorn |
| LLM provider | Groq API |
| Structured output | Instructor, Pydantic |
| Token estimation | tiktoken |
| Frontend | HTML, CSS, JavaScript |
| Local configuration | `python-dotenv` |

## Project structure

```text
Enterprise Structured Ingestion Firewall/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas/
│   │   │   └── ingestion.py
│   │   ├── services/
│   │   │   └── llm_service.py
│   │   └── utils/
│   │       └── token_counter.py
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## Prerequisites

- Python 3.10 or later (use a Python version supported by your installed dependencies).
- A Groq API key.
- A terminal such as PowerShell, Command Prompt, or a VS Code terminal.

## Setup

Open a terminal at the project root, then set up the backend:

### 1. Create and activate a virtual environment

**Windows PowerShell:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use Command Prompt:

```bat
.venv\Scripts\activate.bat
```

**macOS/Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

Run this from the `backend` directory:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure the Groq API key

Copy `backend/.env.example` to `backend/.env`, then replace the placeholder with your own key:

```dotenv
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Keep `.env` private. Do not commit it to GitHub or share it in screenshots. If a real API key was included in a shared ZIP or repository, revoke it and create a replacement.

## Run the application

Run the backend and frontend in **two separate terminals**.

### Terminal 1 — Backend

From the project root:

```bash
cd backend
uvicorn app.main:app --reload
```

The API should be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive Swagger documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Terminal 2 — Frontend

From the project root, open a second terminal:

```bash
cd frontend
python -m http.server 5500
```

Then open **http://127.0.0.1:5500** in your browser.

The frontend JavaScript sends requests to `http://127.0.0.1:8000`, so keep the backend running while using the UI.

## API endpoint

### `GET /health`

Checks whether the API is running.

Example response:

```json
{
  "status": "ok",
  "message": "Ingestion Firewall API is running"
}
```

### `POST /api/analyze`

Request body:

```json
{
  "message": "My payment was deducted twice. Please help urgently."
}
```

The successful response contains the validated fields `intent`, `risk_profile`, `priority`, `requires_action`, `summary`, and `token_metadata`. Exact values depend on the model's classification of the message.

Example request using curl:

```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Where is my order?\"}"
```

## How it works

1. The user enters a message in the frontend.
2. JavaScript sends the message as JSON to `POST /api/analyze`.
3. FastAPI validates the request using `IngestionRequest`.
4. The LLM service sends the message and system instructions to Groq through Instructor.
5. Instructor requests a response matching `IngestionResult`; Pydantic validates the structured fields.
6. FastAPI adds a local estimate of the input token count and returns the JSON.
7. The frontend displays the response and allows the user to copy it.

## Troubleshooting

- **LLM request failed / HTTP 502:** Check that `backend/.env` exists, `GROQ_API_KEY` is valid, the model name is available to your account, the network is working, and provider limits have not been reached.
- **Frontend cannot connect:** Start the backend first and confirm `http://127.0.0.1:8000/health` responds.
- **Port already in use:** Start Uvicorn on another port or choose another port for the frontend server, then update the frontend API URL if the backend port changes.
- **Missing package:** Activate the backend virtual environment and run `pip install -r requirements.txt`.
- **PowerShell activation issue:** Use `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\uvicorn.exe app.main:app --reload` if you cannot activate the environment.

## Security and production notes

- Never commit `.env` or API keys.
- Configure CORS with the exact frontend origin before deploying; the current wildcard setting is intended for local development.
- Add authentication, rate limiting, monitoring, and production-grade error handling before exposing the API publicly.
- Treat the LLM result as model-generated data even though it is schema-validated; schema validation ensures structure, not factual correctness.

