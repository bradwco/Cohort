"""ReAct-style loop driving Gemma against the tool registry.

Public surface is `run(intent, payload, user_id) -> {"text": str}` which is what
the Cohort desktop app expects from the REST `/chat` shim.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from . import gemma, tools

logger = logging.getLogger(__name__)

MAX_STEPS = 4

INTENT_INSTRUCTIONS: dict[str, str] = {
    "dashboard_insight": (
        "Produce one short, concrete insight (<=2 sentences) the user can act on, "
        "using their recent sessions and screen-classification mix. Call "
        "get_dashboard_metrics and summarize_day for today before answering."
    ),
    "session_postmortem": (
        "Write a 3-4 sentence postmortem for the given session_id: what the user "
        "worked on, signals from the screen classifications, and one suggestion. "
        "Call get_session first."
    ),
}


def _system_prompt(intent: str) -> str:
    instruction = INTENT_INSTRUCTIONS.get(
        intent, "Answer the user's request using the available tools when helpful."
    )
    return (
        "You are Cohort, an assistant that helps a user reflect on their focus "
        "sessions and on-screen activity. Be terse and specific. Prefer tool "
        "calls over guessing.\n\n"
        f"Current intent: {intent}\n{instruction}"
    )


async def run(intent: str, payload: dict[str, Any], user_id: str | None) -> dict[str, str]:
    user_msg = {
        "intent": intent,
        "user_id": user_id,
        "payload": payload or {},
    }

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": _system_prompt(intent)},
        {"role": "user", "content": json.dumps(user_msg)},
    ]

    for step in range(MAX_STEPS):
        resp = await gemma.chat(messages, tools=tools.specs())
        if not resp.ok:
            logger.warning("gemma error step=%d: %s", step, resp.error)
            return {"text": "agent unavailable"}

        if not resp.tool_calls:
            return {"text": resp.text or ""}

        messages.append(
            {
                "role": "assistant",
                "content": resp.text or "",
                "tool_calls": resp.tool_calls,
            }
        )

        for call in resp.tool_calls:
            fn = call.get("function") or {}
            name = fn.get("name") or ""
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            result = tools.run(name, args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id", ""),
                    "name": name,
                    "content": json.dumps(result, default=str),
                }
            )

    logger.warning("react loop hit MAX_STEPS without final answer")
    return {"text": "agent unavailable"}
