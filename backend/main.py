"""
Professor Pepe — FastAPI backend.

This file only wires the application together. Business logic lives in
services/, API routes in api/routes.py and shared utilities in core/.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from core.config import MEMES_DIR
from core.http import close_http
from core.security import is_rate_limited, rate_limit_response

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_http()


app = FastAPI(title="Professor Pepe", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """Reject requests that exceed per-IP rate limits."""
    limited, details = is_rate_limited(request)
    if limited:
        return rate_limit_response(details)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

from fastapi.responses import FileResponse

if MEMES_DIR and MEMES_DIR.is_dir():
    app.mount("/memes", StaticFiles(directory=str(MEMES_DIR)), name="memes")

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
index_html = frontend_dist / "index.html"

@app.get("/{path:path}")
async def spa_fallback(path: str):
    """Serve static files or index.html for SPA routing."""
    if path.startswith("api/"):
        return {"detail": "Not Found"}

    file_path = frontend_dist / path
    if file_path.is_file():
        return FileResponse(file_path)

    return FileResponse(index_html)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
