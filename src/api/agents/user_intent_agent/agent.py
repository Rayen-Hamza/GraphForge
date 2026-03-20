from google.adk.agents import Agent

from agents.common.llm_catalog import get_llm

from agents.user_intent_agent.variants import variants

AGENT_NAME = "user_intent_agent_v2"
user_intent_agent = Agent(
    name=AGENT_NAME,
    model=get_llm(),
    description="Knowledge graph use case ideation.",
    instruction=variants[AGENT_NAME]["instruction"],
    tools=variants[AGENT_NAME]["tools"]
)

root_agent = user_intent_agent
