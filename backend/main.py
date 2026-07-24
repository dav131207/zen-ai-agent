"""
Professor Pepe — FastAPI backend.
Serves a Gemini-powered chat API and proxies image requests from OnlyPepes.
"""

import os
import random
import re
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import httpx
from dotenv import load_dotenv
from PIL import Image
from PIL.Image import Resampling

load_dotenv()

from fastapi import APIRouter, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from rag import (
    get_random_pepe_meme,
    ingest_file,
    ingest_text,
    search_context,
    search_pepe_memes,
)

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover
    genai = None
    types = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
IMAGE_API_BASE = os.getenv("IMAGE_API_BASE", "https://onlypepes.com").rstrip("/")
_backend_dir = Path(__file__).resolve().parent
WATERMARK_PATH = os.getenv(
    "WATERMARK_PATH",
    str(_backend_dir / "assets" / "watermark.png"),
)
MEMES_DIR = Path(os.getenv("MEMES_DIR", "")).expanduser() if os.getenv("MEMES_DIR") else None

_watermark_image: Optional[Image.Image] = None


def _get_watermark() -> Optional[Image.Image]:
    """Lazy-load the watermark image."""
    global _watermark_image
    if _watermark_image is None and os.path.exists(WATERMARK_PATH):
        _watermark_image = Image.open(WATERMARK_PATH).convert("RGBA")
    return _watermark_image


def _apply_watermark(base_image: Image.Image) -> Image.Image:
    """Composite the watermark onto the bottom-right corner of an image."""
    watermark = _get_watermark()
    if watermark is None:
        return base_image

    base = base_image.convert("RGBA")
    mark = watermark.copy()

    base_w, base_h = base.size
    # Size the watermark relative to image height so it looks consistent
    # when all images are displayed at the same max-height in the UI.
    mark_w = max(1, int(base_h * 0.20))
    mark_h = max(1, int(mark.height * mark_w / mark.width))
    mark = mark.resize((mark_w, mark_h), Resampling.LANCZOS)

    # Apply 75% opacity to the watermark alpha channel.
    alpha = mark.getchannel("A").point(lambda p: int(p * 0.75))
    mark.putalpha(alpha)

    margin = int(base_h * 0.02)
    x = base_w - mark_w - margin
    y = base_h - mark_h - margin

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.paste(mark, (x, y), mark)
    return Image.alpha_composite(base, layer)


SYSTEM_PROMPT_PATH = Path(__file__).parent / "persona" / "system_prompt.txt"
if SYSTEM_PROMPT_PATH.exists():
    _system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
else:
    _system_prompt = (
        "You are Professor Pepe, a helpful AI assistant. Answer clearly and concisely. "
        "Use markdown formatting when it helps readability. "
        "Always refer to yourself as Professor Pepe. Do not mention that you are an AI model built by Google."
    )

# Load local emote filenames for context-aware selection.
# Prefer the built frontend assets, fall back to the public folder during dev.
EMOTES_DIR = (
    Path(__file__).parent.parent / "frontend" / "dist" / "emotes"
)
if not EMOTES_DIR.exists():
    EMOTES_DIR = Path(__file__).parent.parent / "frontend" / "public" / "emotes"
emote_files = []
if EMOTES_DIR.exists():
    emote_files = sorted([f for f in EMOTES_DIR.iterdir() if f.is_file()])

EMOTE_KEYWORDS = {
    "happy": ["Happy", "Hype", "Party", "Dance", "Smile", "Joy", "Celebrate", "Excited"],
    "sad": ["Sad", "Cry", "Tears", "Depress", "Sob", "Pain", "Suffer"],
    "angry": ["Angery", "Angry", "Mad", "Rage", "Ree", "Trigger", "Fuck"],
    "confused": ["Confus", "Wot", "Woah", "Huh", "Question", "Weird"],
    "love": ["Love", "Heart", "Kiss", "Blush", "Booba", "Lewd"],
    "sleep": ["Sleep", "Tired", "Nap", "Yawn"],
    "rich": ["Money", "Credit", "Rich", "Gold", "Patreon", "Nitro"],
    "cool": ["Cool", "Sunglasses", "Tuxedo", "Jedi", "Sith", "Lightsaber"],
    "food": ["Food", "Eat", "Drink", "Sip", "Burger", "Pizza"],
    "gaming": ["Minecraft", "Game", "Gaming", "Imposter", "Pirate"],
    "christmas": ["Christmas", "Santa", "Xmas"],
    "pride": ["Pride", "Gay", "Lesbian", "Trans", "Bisexual", "NonBinary"],
    "sign": ["Sign", "NoSign", "Stop", "BoiStop"],
    "default": [],
}


def _pick_emote(text: str) -> Optional[str]:
    text_lower = text.lower()

    # Score each emote by how many of its filename tokens appear in the text
    emote_scores = []
    for emote in emote_files:
        name = emote.name.lower()
        # Split filename into tokens by non-alphanumeric chars
        tokens = re.findall(r"[a-z]+", name)
        score = sum(1 for token in tokens if len(token) > 2 and token in text_lower)
        emote_scores.append((emote.name, score))

    # Prefer emotes with at least one matching token
    max_score = max((s for _, s in emote_scores), default=0)
    if max_score > 0:
        candidates = [name for name, score in emote_scores if score == max_score]
    else:
        # Fallback: pick from a curated list of neutral/general emotes
        neutral = [
            "Pepe Server 1_PES_PoggerSip.png",
            "Pepe Server 2_PES2_HypeTuxedo.png",
            "Pepe Server 2_PES2_BlushShrug.png",
            "Pepe Server 1_PES_Sleep.png",
            "Pepe Server 2_PES2_Woah.png",
            "Pepe Server 2_aPES2_HappyTalk.gif",
            "Pepe Server 1_PES_Angery.png",
            "Pepe Server 2_PES2_SadGeGun.png",
        ]
        candidates = [n for n in neutral if n in [e.name for e in emote_files]]
        if not candidates:
            candidates = [e.name for e in emote_files]

    return f"/emotes/{random.choice(candidates)}"


gemini_client = None
if genai and GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

http = httpx.AsyncClient(timeout=60, follow_redirects=True)

# IP geolocation → response language mapping.
_geo_cache: dict[str, str] = {}

COUNTRY_TO_LANGUAGE = {
    "DE": "German",
    "AT": "German",
    "CH": "German",
    "US": "English",
    "GB": "English",
    "CA": "English",
    "AU": "English",
    "NZ": "English",
    "IE": "English",
    "FR": "French",
    "BE": "French",
    "ES": "Spanish",
    "MX": "Spanish",
    "IT": "Italian",
    "PT": "Portuguese",
    "BR": "Portuguese",
    "NL": "Dutch",
    "PL": "Polish",
    "RU": "Russian",
    "UA": "Ukrainian",
    "TR": "Turkish",
    "JP": "Japanese",
    "KR": "Korean",
    "CN": "Chinese",
    "TW": "Chinese",
    "HK": "Chinese",
    "IN": "English",
    "SE": "Swedish",
    "NO": "Norwegian",
    "DK": "Danish",
    "FI": "Finnish",
    "CZ": "Czech",
    "HU": "Hungarian",
    "RO": "Romanian",
    "GR": "Greek",
    "IL": "Hebrew",
    "SA": "Arabic",
    "AE": "Arabic",
    "EG": "Arabic",
    "ZA": "English",
    "SG": "English",
    "MY": "English",
    "PH": "English",
    "ID": "Indonesian",
    "TH": "Thai",
    "VN": "Vietnamese",
}


async def detect_language(client_host: str) -> str:
    """Detect the user's language from their IP address via ip-api.com."""
    if not client_host or client_host in ("127.0.0.1", "localhost", "::1"):
        return "English"

    if client_host in _geo_cache:
        return _geo_cache[client_host]

    try:
        response = await http.get(
            f"http://ip-api.com/json/{client_host}?fields=status,countryCode,message",
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
        if data.get("status") == "success":
            country = data.get("countryCode", "")
            language = COUNTRY_TO_LANGUAGE.get(country, "English")
            _geo_cache[client_host] = language
            return language
    except Exception:
        pass

    return "English"


class ChatRequest(BaseModel):
    topic: str = Field(default="", description="Topic context for the conversation")
    message: str = Field(..., min_length=1, description="User message")
    history: list[dict] = Field(default_factory=list, description="Previous turns")
    stream: bool = Field(default=True, description="Stream the response")
    use_rag: bool = Field(default=True, description="Use Qdrant RAG context")


class ImageRequest(BaseModel):
    topic: Optional[str] = Field(default=None, description="Search term for the image")


class EmoteRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to pick an emote for")


class IngestTextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to ingest into Qdrant")


class RarePepeRequest(BaseModel):
    query: Optional[str] = Field(
        default="rare pepe",
        description="Search term for the rare pepe collection",
    )
    language: Optional[str] = Field(
        default=None,
        description="Target language for the description/explanation",
    )
    history: list[dict] = Field(
        default_factory=list,
        description="Previous conversation turns to infer user language",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await http.aclose()


app = FastAPI(title="Professor Pepe", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

# Serve rare pepe meme images from a local directory when configured.
if MEMES_DIR and MEMES_DIR.is_dir():
    app.mount("/memes", StaticFiles(directory=str(MEMES_DIR)), name="memes")


def _is_social_command(message: str) -> bool:
    """Detect the built-in 'create (a) social media post' command."""
    return bool(
        re.match(r"^create\s+a?\s*social\s+media\s+post", (message or "").strip(), re.IGNORECASE)
    )


def _build_contents(topic: str, message: str, history: list[dict], context: str = ""):
    system = _system_prompt
    if context:
        system += (
            "\n\nUse the following knowledge to answer the user's question. "
            "If the knowledge does not contain the answer, say so honestly.\n\n"
            f"{context}"
        )
    if topic:
        system += (
            f"\n\nThe user is asking about the topic: {topic}. "
            "Stay focused on this topic when relevant."
        )

    # Social-media posts are text-only by default and must fit a single tweet.
    if _is_social_command(message):
        system += (
            "\n\nYou are generating a social media post. "
            "Keep the final text under 280 characters. "
            "Do not include images unless the user explicitly asks for one. "
            "Always include @PepecoinNetwork. "
            "When mentioning Dogecoin, Litecoin or Bitcoin, use their X/Twitter handles: "
            "@dogecoin, @litecoin and @Bitcoin."
        )

    contents = [types.Content(role="user", parts=[types.Part(text=system)])]
    for turn in history[-10:]:
        role = turn.get("role")
        text = turn.get("text", "")
        if role == "user":
            contents.append(
                types.Content(role="user", parts=[types.Part(text=text)])
            )
        elif role == "assistant":
            contents.append(
                types.Content(role="model", parts=[types.Part(text=text)])
            )
    contents.append(
        types.Content(role="user", parts=[types.Part(text=message)])
    )
    return contents


def _format_social_post(text: str) -> str:
    """Normalize coin names to X/Twitter handles and ensure @PepecoinNetwork."""
    text = (text or "").strip()

    # Convert standalone coin names to handles (only when not already a handle).
    text = re.sub(r"(?<!@)\bDogecoin\b", "@dogecoin", text, flags=re.IGNORECASE)
    text = re.sub(r"(?<!@)\bLitecoin\b", "@litecoin", text, flags=re.IGNORECASE)
    text = re.sub(r"(?<!@)\bBitcoin\b", "@Bitcoin", text, flags=re.IGNORECASE)

    # Ensure the PepecoinNetwork handle is present.
    handle = "@PepecoinNetwork"
    if not re.search(r"@pepecoinnetwork\b", text, re.IGNORECASE):
        suffix = " " + handle
        if len(text) + len(suffix) > 280:
            text = text[: max(0, 280 - len(suffix))].rstrip()
        text = text + suffix

    return text[:280]


def _gemini_client():
    if not genai:
        raise HTTPException(status_code=500, detail="Gemini SDK not installed")
    if not gemini_client:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    return gemini_client


@router.get("/health")
async def health():
    from rag.qdrant_store import get_qdrant_client

    qdrant = get_qdrant_client()
    return {
        "status": "ok",
        "gemini_configured": bool(gemini_client),
        "qdrant_configured": bool(qdrant),
        "image_api": IMAGE_API_BASE,
    }


@router.post("/chat")
async def chat(req: ChatRequest):
    client = _gemini_client()

    context = ""
    if req.use_rag:
        chunks = search_context(req.message, limit=3)
        if chunks:
            context = "\n\n---\n\n".join(chunks)

    contents = _build_contents(req.topic, req.message, req.history, context)
    is_social = _is_social_command(req.message)

    if req.stream:
        response = client.models.generate_content_stream(
            model=DEFAULT_MODEL,
            contents=contents,
        )

        async def streamer():
            # For social posts, buffer and normalize handles/length before sending.
            if is_social:
                full = ""
                for chunk in response:
                    full += chunk.text or ""
                yield _format_social_post(full)
                return

            for chunk in response:
                text = chunk.text or ""
                if text:
                    yield text

        return StreamingResponse(streamer(), media_type="text/plain")

    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=contents,
    )
    text = response.text or ""
    if is_social:
        text = _format_social_post(text)
    return {"text": text}


def _extract_image_search_term(topic: str) -> str:
    """Strip command prefixes and polite wrappers so only keywords remain."""
    topic = (topic or "").strip()

    # Remove the social-post command prefix if present.
    topic = re.sub(
        r"^create\s+(a\s+)?social\s+media\s+post(\s+about\s+)?",
        "",
        topic,
        flags=re.IGNORECASE,
    ).strip()

    # Remove common "show me an image of..." wrappers.
    wrappers = [
        r"show\s+me\s+(a\s+|an\s+)?",
        r"send\s+me\s+(a\s+|an\s+)?",
        r"give\s+me\s+(a\s+|an\s+)?",
        r"image\s+of\s+(a\s+|an\s+)?",
        r"picture\s+of\s+(a\s+|an\s+)?",
        r"pic\s+of\s+(a\s+|an\s+)?",
        r"photo\s+of\s+(a\s+|an\s+)?",
        r"visual\s+of\s+(a\s+|an\s+)?",
        r"draw\s+(a\s+|an\s+)?",
    ]
    for pattern in wrappers:
        topic = re.sub(rf"^{pattern}", "", topic, flags=re.IGNORECASE).strip()

    return topic


@router.post("/image")
async def fetch_image(req: ImageRequest, request: Request):
    """Fetch an image from the OnlyPepes API using keywords/tags."""
    topic = _extract_image_search_term(req.topic)
    # Treat explicit "random meme" commands as pure random, ignoring the search term.
    is_pure_random = not topic or topic.lower() in {"random meme", "random pepe", "random"}

    params: dict = {"limit": 1}
    if not is_pure_random:
        params["search"] = topic
    params["random"] = "true"

    try:
        r = await http.get(f"{IMAGE_API_BASE}/api/pepe", params=params)
        r.raise_for_status()
        payload = r.json()
        data = payload.get("data")
        if isinstance(data, dict):
            pepe = data
        elif isinstance(data, list) and data:
            pepe = data[0]
        else:
            raise HTTPException(status_code=404, detail="No image found")
        external_url = pepe.get("url")
        if external_url:
            watermarked_url = (
                f"{request.base_url}api/watermark?url={quote(external_url, safe='')}"
            )
        else:
            watermarked_url = None
        return {
            "url": watermarked_url,
            "description": pepe.get("description", ""),
            "tags": pepe.get("tags") or [],
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Image API error: {e}")


@router.post("/emote")
async def fetch_emote(req: EmoteRequest):
    """Pick a context-aware local emote based on the provided text."""
    if not emote_files:
        raise HTTPException(status_code=404, detail="No emotes available")
    url = _pick_emote(req.text)
    return {"url": url}


async def _detect_language_from_text(text: str) -> Optional[str]:
    """Ask Gemini to identify the language of the provided text."""
    client = gemini_client
    if not client:
        return None
    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(
                            text=(
                                'Identify the language of the following text. '
                                'Reply with only the English name of the language, e.g. "German", "English", "French".\n\n'
                                f'Text: "{text}"'
                            )
                        )
                    ],
                )
            ],
        )
        return (response.text or "").strip().strip('"').strip("'")
    except Exception:
        return None


async def _translate_text(text: Optional[str], language: str) -> Optional[str]:
    """Translate text to the requested language using Gemini."""
    if not text:
        return text
    target = language.lower()
    if target in ("english", "en"):
        return text

    client = gemini_client
    if not client:
        return text
    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(
                            text=(
                                f'Translate the following text to {language}. '
                                'Preserve the meaning and tone. Reply with only the translation, no explanations.\n\n'
                                f'{text}'
                            )
                        )
                    ],
                )
            ],
        )
        translated = (response.text or "").strip()
        return translated or text
    except Exception:
        return text


async def _resolve_target_language(
    language: Optional[str], history: list[dict], client_host: str
) -> str:
    """Pick the target language: explicit > last user message > geolocation > English."""
    if language:
        return language

    for turn in reversed(history):
        if turn.get("role") == "user":
            text = turn.get("text", "")
            if text:
                detected = await _detect_language_from_text(text)
                if detected:
                    return detected
                break

    geo_language = await detect_language(client_host)
    return geo_language or "English"


def _extract_pepe_image_url(pepe: dict) -> Optional[str]:
    """Find an image URL in the Qdrant payload, trying several common field names."""
    for key in ("url", "image_url", "image", "src", "link", "source", "permalink"):
        value = pepe.get(key)
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            return value
    return None


@router.post("/rare_pepe")
async def fetch_rare_pepe(req: RarePepeRequest, request: Request):
    """Return a non-politically-sensitive rare pepe from the Qdrant collection."""
    query = (req.query or "").strip().lower()
    no_context = not query or query == "rare pepe"

    if no_context:
        pepe = get_random_pepe_meme()
    else:
        results = search_pepe_memes(req.query, limit=20)
        pepe = random.choice(results) if results else None

    if not pepe:
        raise HTTPException(status_code=404, detail="No rare pepe found")

    filename = pepe.get("filename", "")
    file_path = pepe.get("file_path", "")
    if not filename and file_path:
        filename = Path(file_path).name

    external_url = _extract_pepe_image_url(pepe)
    url = None

    if external_url:
        url = f"{request.base_url}api/watermark?url={quote(external_url, safe='')}"
    elif filename and MEMES_DIR and MEMES_DIR.is_dir():
        url = f"{request.base_url}api/watermark?path=/memes/{quote(filename, safe='')}"

    target_language = await _resolve_target_language(
        req.language, req.history, request.client.host
    )

    description = pepe.get("description", "")
    explanation = pepe.get("explanation", "")

    if target_language and target_language.lower() not in ("english", "en"):
        description = await _translate_text(description, target_language)
        explanation = await _translate_text(explanation, target_language)

    return {
        "url": url,
        "filename": filename,
        "description": description,
        "explanation": explanation,
        "language": target_language,
    }


@router.get("/watermark")
async def watermark_proxy(url: Optional[str] = None, path: Optional[str] = None):
    """Fetch an external or local image, burn in the watermark and return it."""
    if not url and not path:
        raise HTTPException(status_code=400, detail="Provide url or path")

    watermark = _get_watermark()
    if watermark is None:
        raise HTTPException(status_code=503, detail="Watermark not configured")

    if url:
        allowed_prefixes = (
            IMAGE_API_BASE,
            "https://onlypepes.com",
            "https://archive.org",
            "https://i.imgur.com",
            "https://imgur.com",
            "https://i.redd.it",
            "https://pbs.twimg.com",
            "https://cdn.discordapp.com",
            "https://media.discordapp.net",
            "https://rarepepedirectory.com",
            "https://www.rarepepedirectory.com",
        )
        if not any(url.startswith(p) for p in allowed_prefixes):
            raise HTTPException(status_code=400, detail="Image URL not allowed")
        try:
            r = await http.get(url)
            r.raise_for_status()
            data = r.content
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Image fetch error: {e}")
    else:
        if path.startswith("/memes/"):
            if not MEMES_DIR or not MEMES_DIR.is_dir():
                raise HTTPException(status_code=503, detail="Local memes directory not configured")
            filename = path[len("/memes/"):]
            file_path = (MEMES_DIR / filename).resolve()
            # Prevent directory traversal outside the memes folder.
            if MEMES_DIR.resolve() not in file_path.parents and file_path != MEMES_DIR.resolve():
                raise HTTPException(status_code=400, detail="Invalid image path")
        else:
            file_path = Path(path).expanduser().resolve()
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="Image not found")
        data = file_path.read_bytes()

    try:
        base = Image.open(BytesIO(data))
        result = _apply_watermark(base)
        buf = BytesIO()
        result.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watermark error: {e}")


@router.post("/ingest/text")
async def ingest_text_endpoint(req: IngestTextRequest):
    """Ingest plain text into the Qdrant knowledge base."""
    count = ingest_text(req.text)
    if count == 0:
        raise HTTPException(status_code=503, detail="Qdrant not configured")
    return {"ingested_chunks": count}


@router.post("/ingest/file")
async def ingest_file_endpoint(file: UploadFile = File(...)):
    """Upload and ingest a text/markdown file into Qdrant."""
    allowed = {".txt", ".md", ".markdown"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Only {allowed} files supported")

    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    count = ingest_text(text, source=file.filename)
    if count == 0:
        raise HTTPException(status_code=503, detail="Qdrant not configured")
    return {"ingested_chunks": count, "filename": file.filename}


app.include_router(router, prefix="/api")

# Serve the built React frontend for all non-API routes (SPA fallback).
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
