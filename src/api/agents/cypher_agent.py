from google.adk.agents import Agent



from .variants import variants

AGENT_NAME = "cypher_agent_v1"
cypher_agent = Agent(
    name=AGENT_NAME,
    model="",
    description="Provides direct acccess to a Neo4j database through Cypher queries.", # Crucial for delegation later
    instruction=variants[AGENT_NAME]["instruction"],
    tools=variants[AGENT_NAME]["tools"], 
)
