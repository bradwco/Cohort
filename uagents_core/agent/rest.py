"""REST `/chat` shim wired onto the uagents Agent.

The Cohort desktop client posts:
  POST /chat
  Authorization: Bearer ${AGENT_BEARER}
  body: { intent, user_id, payload }

uagents' REST handlers only see the typed body, not arbitrary headers, so the
bearer check is enforced upstream by Caddy in front of this service. The
agent itself only validates body shape. To allow defense-in-depth, the body
may also carry `auth` and we'll compare it to AGENT_BEARER when set.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from uagents import Agent, Context
from uagents_core.models import Model

from . import react

logger = logging.getLogger(__name__)


class ChatRequest(Model):
    intent: str
    user_id: str | None = None
    payload: dict[str, Any] = {}
    auth: str | None = None


class ChatResponse(Model):
    text: str


class HealthResponse(Model):
    ok: bool


def attach(agent: Agent) -> None:
    bearer = os.environ.get("AGENT_BEARER", "")

    @agent.on_rest_post("/chat", ChatRequest, ChatResponse)
    async def chat(ctx: Context, req: ChatRequest) -> ChatResponse:
        if bearer and req.auth and req.auth != bearer:
            ctx.logger.warning("rejected /chat: bad body auth token")
            return ChatResponse(text="agent unavailable")
        try:
            result = await react.run(req.intent, req.payload, req.user_id)
            return ChatResponse(text=result.get("text", ""))
        except Exception as e:  # noqa: BLE001
            ctx.logger.exception("react.run failed: %s", e)
            return ChatResponse(text="agent unavailable")

    @agent.on_rest_get("/healthz", HealthResponse)
    async def health(_ctx: Context) -> HealthResponse:
        return HealthResponse(ok=True)
