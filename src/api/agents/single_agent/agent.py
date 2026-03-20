from google.adk.agents import Agent

from agents.common.llm_catalog import get_llm
from agents.cypher_agent.cypher_agent import cypher_agent

from agents.single_agent.variants import variants

AGENT_NAME = "single_agent_agent_v1"
single_agent_agent = Agent(
    name=AGENT_NAME,
    model=get_llm(),
    description="Knowledge graph construction using Neo4j and cypher.",
    instruction=variants[AGENT_NAME]["instruction"],
    tools=variants[AGENT_NAME]["tools"],
    sub_agents=[cypher_agent]
)

root_agent = single_agent_agent
