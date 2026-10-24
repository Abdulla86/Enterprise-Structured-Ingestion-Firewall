from pydantic import Field

from app.schemas.ingestion import IngestionResult


class AssistantResult(IngestionResult):
    """Week 2 response: intent analysis plus generated answer."""

    response_markdown: str = Field(
        min_length=1,
        description="LLM-generated answer formatted as Markdown.",
    )