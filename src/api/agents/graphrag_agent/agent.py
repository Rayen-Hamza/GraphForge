from google.adk.agents import Agent

from agents.common.llm_catalog import get_llm, rate_limit_before_model

from agents.graphrag_agent.variants import variants

AGENT_NAME = "graphrag_agent_v2"
graphrag_agent = Agent(
    name=AGENT_NAME,
    model=get_llm(),
    description="Multi-hop information retrieval and investigation from a knowledge graph using traversal and query tools.",
    instruction=variants[AGENT_NAME]["instruction"],
    tools=variants[AGENT_NAME]["tools"],
    before_model_callback=rate_limit_before_model,
)

root_agent = graphrag_agent
