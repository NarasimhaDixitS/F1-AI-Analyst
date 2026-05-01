from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
from dotenv import load_dotenv

load_dotenv()

from agent import process_query, process_structured_query

app = FastAPI(title="F1 AI Race Analyst API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str


class StructuredAnalyzeRequest(BaseModel):
    year: int
    race: str
    session: str
    mode: Literal["race_overview", "head_to_head", "strategy", "telemetry", "results"]
    driver1: Optional[str] = None
    driver2: Optional[str] = None

@app.post("/api/analyze")
async def analyze_query(request: QueryRequest):
    result = await process_query(request.query)
    return result


@app.post("/api/structured-analyze")
async def analyze_structured(request: StructuredAnalyzeRequest):
    result = await process_structured_query(request.model_dump())
    return result
