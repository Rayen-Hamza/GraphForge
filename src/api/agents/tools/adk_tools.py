from google.adk.tools import ToolContext

def finished(tool_context: ToolContext)-> dict:
    """Finishes the current agent collaboration, delegating back to a parent.
    """
    tool_context.actions.escalate = True
    parent = tool_context._invocation_context.agent.parent_agent
    if parent is not None:
        tool_context.actions.transfer_to_agent = parent.name
    return {}