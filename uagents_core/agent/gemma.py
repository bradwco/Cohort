import logging
import os
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = os.environ.get("GEMMA_BASE_URL", "").rstrip("/")
_BEARER = os.environ.get("GEMMA_BEARER", "")
_MODEL = os.environ.get("GEMMA_MODEL", "google/gemma-3-12b-it")
_TIMEOUT_S = 30.0


@dataclass
class ChatResponse:
    ok: bool
    text: str = ""
    tool_calls: list[dict[str, Any]] | None = None
    error: str | None = None
    raw: dict[str, Any] | None = None


async def chat(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.2,
) -> ChatResponse:
    if not _BASE_URL:
        return ChatResponse(ok=False, error="GEMMA_BASE_URL not set")

    url = f"{_BASE_URL}/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
    }
    if _BEARER:
        headers["Authorization"] = f"Bearer {_BEARER}"
    body: dict[str, Any] = {
        "model": _MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"

    async with httpx.AsyncClient(timeout=_TIMEOUT_S) as client:
        for attempt in (1, 2):
            try:
                resp = await client.post(url, json=body, headers=headers)
            except httpx.HTTPError as e:
                if attempt == 2:
                    return ChatResponse(ok=False, error=f"network: {e}")
                continue

            if resp.status_code >= 500 and attempt == 1:
                continue
            if resp.status_code != 200:
                return ChatResponse(
                    ok=False,
                    error=f"http {resp.status_code}: {resp.text[:200]}",
                )

            data = resp.json()
            choice = (data.get("choices") or [{}])[0]
            msg = choice.get("message") or {}
            return ChatResponse(
                ok=True,
                text=msg.get("content") or "",
                tool_calls=msg.get("tool_calls"),
                raw=data,
            )

    return ChatResponse(ok=False, error="unreachable")
