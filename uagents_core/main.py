"""Entrypoint for the Cohort Agent service.

Runs a single uagents Agent that:
  - Handles the Agentverse Chat Protocol so the registered "Cohort Agent"
    has a live handler.
  - Exposes a REST `/chat` shim that the Cohort Electron app posts to.
  - Drives a ReAct loop against Gemma (vLLM) with a Supabase-backed tool
    registry.

Registration with Agentverse runs once at boot.
"""

import logging
import os

from dotenv import load_dotenv

load_dotenv()

from uagents import Agent
from uagents_core.utils.registration import (
    RegistrationRequestCredentials,
    register_chat_agent,
)

from agent import chat_handler, rest

logging.basicConfig(level=logging.INFO)

AGENT_PORT = int(os.environ.get("AGENT_PORT", "8001"))
AGENT_PUBLIC_URL = os.environ.get("AGENT_PUBLIC_URL", "https://cohort-agent")

agent = Agent(
    name="cohort_agent",
    seed=os.environ["AGENT_SEED_PHRASE"],
    port=AGENT_PORT,
    endpoint=[f"{AGENT_PUBLIC_URL}/submit"],
    network="testnet",
)

chat_handler.attach(agent)
rest.attach(agent)


def _register() -> None:
    try:
        register_chat_agent(
            "Cohort Agent",
            AGENT_PUBLIC_URL,
            active=True,
            credentials=RegistrationRequestCredentials(
                agentverse_api_key=os.environ["AGENTVERSE_KEY"],
                agent_seed_phrase=os.environ["AGENT_SEED_PHRASE"],
            ),
        )
    except Exception as e:
        logging.warning(
            "Agentverse registration failed (agent still starts): %s. "
            "Refresh AGENTVERSE_KEY from agentverse.ai → API Keys.",
            e,
        )


if __name__ == "__main__":
    if os.environ.get("SKIP_AGENTVERSE_REGISTER") != "1":
        _register()
    agent.run()
