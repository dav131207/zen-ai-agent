"""Chat and content generation services."""

import re
from typing import AsyncGenerator, Optional

from analytics import track_event
from core.config import DEFAULT_MODEL, SYSTEM_PROMPT_PATH
from core.providers import get_llm_provider
from core.providers.base import LLMError
from fastapi import HTTPException
from services.crypto_service import get_pepe_market_data
from core.http import http

if SYSTEM_PROMPT_PATH.exists():
    _system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
else:
    _system_prompt = (
        "You are Professor Pepe, a helpful AI assistant. Answer clearly and concisely. "
        "Use markdown formatting when it helps readability. "
        "Always refer to yourself as Professor Pepe. Do not mention that you are an AI model built by Google."
    )


def is_social_command(message: str) -> bool:
    """Detect the built-in 'create (a) social media post' command."""
    return bool(
        re.match(r"^create\s+a?\s*social\s+media\s+post", (message or "").strip(), re.IGNORECASE)
    )


def build_contents(
    topic: str,
    message: str,
    history: list[dict],
    context: str = "",
    language: Optional[str] = None,
):
    """Build the list of messages sent to the LLM."""
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

    if language:
        system += (
            f"\n\nIMPORTANT: The user is located in a {language}-speaking region. "
            f"Respond entirely in {language}, including all links and commands."
        )

    if is_social_command(message):
        system += (
            "\n\nYou are generating a social media post. "
            "Keep the final text under 280 characters. "
            "Do not include images unless the user explicitly asks for one. "
            "Always include @PepecoinNetwork. "
            "@dogecoin, @litecoin and @Bitcoin. "
            "CRITICAL: Use ONLY 0 to 1 emojis maximum in the entire post. "
            "CRITICAL: Be extremely creative. Use high variance in sentence structure, vocabulary, and angles. "
            "Follow the user's requested language, tonality, and topic exactly if provided."
        )
        if "shill" in message.lower():
            system += (
                "\n\nSHILL MODE ACTIVATED: Your goal is to hack the Twitter algorithm based on network theory. "
                "Instead of just tagging mega-accounts that ignore notifications, you must build 'bridges' to adjacent networks. "
                "CRITICAL INSTRUCTION: Tag 2-3 mid-tier Web3/Crypto accounts, researchers, or adjacent niche leaders (e.g., AI, DeFi, NFTs) who actually engage. "
                "Structure the post to provoke a response from them (e.g., ask their opinion, challenge a thesis, or highlight a synergy). "
                "Tag them naturally to spark a high-engagement reply loop and maximize visibility."
            )

    contents = [{"role": "user", "parts": [{"text": system}]}]
    for turn in history[-10:]:
        role = turn.get("role")
        text = turn.get("text", "")
        if role == "user":
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def format_social_post(text: str) -> str:
    """Normalize coin names to X/Twitter handles and ensure @PepecoinNetwork."""
    text = (text or "").strip()

    text = re.sub(r"(?<!@)\bDogecoin\b", "@dogecoin", text, flags=re.IGNORECASE)
    text = re.sub(r"(?<!@)\bLitecoin\b", "@litecoin", text, flags=re.IGNORECASE)
    text = re.sub(r"(?<!@)\bBitcoin\b", "@Bitcoin", text, flags=re.IGNORECASE)

    handle = "@PepecoinNetwork"
    if not re.search(r"@pepecoinnetwork\b", text, re.IGNORECASE):
        suffix = " " + handle
        if len(text) + len(suffix) > 280:
            text = text[: max(0, 280 - len(suffix))].rstrip()
        text = text + suffix

    return text[:280]


GET_COINS_TEXTS = {
    "English": (
        "Want free PEP, fren? Here's how to get started:\n\n"
        "- **Faucet** – claim free PEP risk-free: "
        "[pepeblocks.com/faucet](https://pepeblocks.com/faucet)\n"
        "- **Wallet** – Coinomi supports native PEP (addresses start with P, never 0x): "
        "[coinomi.com](https://www.coinomi.com/)\n"
        "- **Discord** – community, support and airdrops: "
        "[Join Discord](discord.gg/UnyMVjM9rv)\n"
        "- **Tipping channel** – ongoing airdrops: "
        "[Open channel](https://discord.com/channels/1162499246503759962/1203748781590577222)\n\n"
        "One coin. One community."
    ),
    "German": (
        "Willst du gratis PEP, fren? So geht's:\n\n"
        "- **Faucet** – hole dir risikofrei gratis PEP: "
        "[pepeblocks.com/faucet](https://pepeblocks.com/faucet)\n"
        "- **Wallet** – Coinomi unterstützt natives PEP (Adressen beginnen mit P, nie 0x): "
        "[coinomi.com](https://www.coinomi.com/)\n"
        "- **Discord** – Community, Support und Airdrops: "
        "[Discord beitreten](discord.gg/UnyMVjM9rv)\n"
        "- **Tipping-Kanal** – laufende Airdrops: "
        "[Kanal öffnen](https://discord.com/channels/1162499246503759962/1203748781590577222)\n\n"
        "One coin. One community."
    ),
}


def get_llm():
    """Return a configured LLM provider or raise an HTTPException."""
    provider = get_llm_provider()
    if not provider.is_configured:
        raise HTTPException(status_code=500, detail="LLM provider not configured")
    return provider


async def generate_chat_response(
    topic: str,
    message: str,
    history: list[dict],
    context: str = "",
    language: Optional[str] = None,
    stream: bool = True,
) -> AsyncGenerator[str, None] | str:
    """Generate a chat response, optionally streaming."""
    provider = get_llm()
    
    crypto_context = await get_pepe_market_data(http)
    if crypto_context:
        context = (context + "\n\n" + crypto_context).strip()
        
    contents = build_contents(topic, message, history, context, language)
    is_social = is_social_command(message)

    if stream:
        async def streamer():
            try:
                if is_social:
                    full = ""
                    async for chunk in provider.stream(DEFAULT_MODEL, contents, temperature=0.9):
                        full += chunk
                    yield format_social_post(full)
                    return

                async for chunk in provider.stream(DEFAULT_MODEL, contents):
                    yield chunk
            except Exception as e:
                track_event(
                    client_ip=None,
                    event_type="error",
                    command="chat_stream",
                    message=str(e)[:300],
                )
                yield "\n\n⚠️ Sorry fren, something went wrong generating this response. Please try again."

        return streamer()

    try:
        kwargs = {"temperature": 0.9} if is_social else {}
        text = provider.generate(DEFAULT_MODEL, contents, **kwargs)
    except LLMError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))

    if is_social:
        text = format_social_post(text)
    return text
