"""
FastAPI backend for the Government Payment Analytics Portal frontend.

Wraps analytics/pipeline.py (the existing, unmodified analytics engine)
behind an HTTP API: upload an Excel workbook, get back the same sheets
build_dashboard_workbook() produces, as JSON.
"""

from __future__ import annotations

import math
import sys
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from analytics.pipeline import PipelineError, build_dashboard_workbook

app = FastAPI(title="Vendors First AP Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _clean(value):
    """Replace NaN/Infinity with None so the response is valid JSON."""
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def _sheet_to_json(sheet_name: str, data):
    if sheet_name == "_metrics":
        return {k: _clean(v) for k, v in data.items()}
    records = data.to_dict(orient="records")
    return [{k: _clean(v) for k, v in row.items()} for row in records]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Upload must be an .xlsx file")

    contents = await file.read()

    try:
        workbook = build_dashboard_workbook(BytesIO(contents))
    except PipelineError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this file as an Invoice_Late_Payment_Analysis workbook: {exc}",
        ) from exc

    return {name: _sheet_to_json(name, data) for name, data in workbook.items()}
