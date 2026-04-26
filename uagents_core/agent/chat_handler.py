"""Agentverse Chat Protocol handler.

Builds a Protocol bound to the official AgentChatProtocol spec from
uagents_core, so messages routed through Agentverse hit the same ReAct loop
as the REST shim.

A Chat Protocol message has no `intent` field; we treat it as a free-form
chat and let the model decide which tools to call. The user_id is taken from
the sender's address.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_protocol_spec,
)

from . import react


def build_protocol() -> Protocol:
    proto = Protocol(spec=chat_protocol_spec)

    @proto.on_message(ChatMessage)
    async def on_message(ctx: Context, sender: str, msg: ChatMessage) -> None:
        await ctx.send(
            sender,
            ChatAcknowledgement(
                timestamp=datetime.now(timezone.utc),
                acknowledged_msg_id=msg.msg_id,
            ),
        )

        text_in = msg.text()
        result = await react.run(
            intent="chat",
            payload={"message": text_in},
            user_id=sender,
        )
        reply_text = result.get("text") or "agent unavailable"

        await ctx.send(
            sender,
            ChatMessage(
                content=[TextContent(text=reply_text)],
                msg_id=uuid4(),
                timestamp=datetime.now(timezone.utc),
            ),
        )

    @proto.on_message(ChatAcknowledgement)
    async def on_ack(_ctx: Context, _sender: str, _ack: ChatAcknowledgement) -> None:
        return

    return proto


def attach(agent: Agent) -> None:
    agent.include(build_protocol(), publish_manifest=True)
