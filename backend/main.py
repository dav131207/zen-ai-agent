"""
Professor Pepe — FastAPI backend.

This file only wires the application together. Business logic lives in
services/, API routes in api/routes.py and shared utilities in core/.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from core.config import MEMES_DIR
from core.http import close_http
from core.security import is_rate_limited, rate_limit_response


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

if MEMES_DIR and MEMES_DIR.is_dir():
    app.mount("/memes", StaticFiles(directory=str(MEMES_DIR)), name="memes")

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
print(f"[DEBUG] Frontend dist path: {frontend_dist}")
print(f"[DEBUG] Frontend dist exists: {frontend_dist.exists()}")
print(f"[DEBUG] Frontend dist is_dir: {frontend_dist.is_dir()}")
if frontend_dist.exists():
    print(f"[DEBUG] Frontend dist contents: {list(frontend_dist.iterdir())[:5]}")

if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
    print(f"[DEBUG] Successfully mounted frontend at /")
else:
    print(f"[DEBUG] Failed to mount frontend - directory not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
