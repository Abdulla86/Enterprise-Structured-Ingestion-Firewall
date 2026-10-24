from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from app.schemas.ingestion import IngestionRequest, IngestionResult
from app.utils.token_counter import estimate_tokens
from app.services.llm_service import analyze_message
from app.schemas.assistant import AssistantResult
from app.services.response_service import generate_response


app = FastAPI(
    title="Enterprise Structured Ingestion Firewall",
    description=""" Inspects incoming messages through an enterprise security and validation pipeline:
    1. **Firewall & Intent Classification:** Validates structure using Pydantic and Instructor to detect threats and categorize intent.
    2. **Risk & Token Assessment:** Evaluates risk profiles, priority levels, and estimates input tokens.
    3. **Context-Aware Response Generation:** Generates a tailored, Markdown-formatted reply based on the classified intent and metadata.
    """,
    version="1.0.0",
)

# Simple local-development CORS configuration. Restrict this in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # here * represents all origins but production should restrict this to specific origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Ingestion Firewall API is running"}


@app.post("/api/analyze", response_model=AssistantResult)
def analyze(request: IngestionRequest):
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    try:
        result = analyze_message(message)
        # Add a local estimate for context budgeting. Provider-reported token
        # counts may differ; this is not billed-usage accounting.
        result.token_metadata.estimated_input_tokens = estimate_tokens(message)
        
     # Week 2: Generate an answer using the detected intent
        response_markdown = generate_response(result)

        # Return intent details + generated answer
        return AssistantResult(
            **result.model_dump(),
            response_markdown=response_markdown,
        )
        return result
    
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "The model response did not pass schema validation.",
                "validation_errors": exc.errors(),
            },
        ) from exc

    
    except Exception as exc:
        # Keep the response simple; avoid exposing secrets or internal details.
        raise HTTPException(
            status_code=502,
            detail="LLM request failed. Check the API key, model name, network, and provider limits.",
        ) from exc