from google.adk.agents import Agent
from ..common.llm_catalog import get_llm
from .variants import variants

AGENT_NAME = "cypher_agent_v1"
cypher_agent = Agent(
    name=AGENT_NAME,
    model=get_llm(),
    description="Provides direct access to a Neo4j database through Cypher queries.",
    instruction=variants[AGENT_NAME]["instruction"],
    tools=variants[AGENT_NAME]["tools"],
)
