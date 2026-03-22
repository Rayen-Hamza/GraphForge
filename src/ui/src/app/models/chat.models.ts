// ── Request/Response DTOs (mirror backend Pydantic schemas) ──

export interface CreateSessionRequest {
  user_id: string;
  session_id?: string;
  initial_state?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface RunAgentRequest {
  user_id: string;
  message: string;
  streaming?: boolean;
}

export interface SessionStateResponse {
  session_id: string;
  state: Record<string, unknown>;
}

// ── SSE event payloads (full ADK Event, camelCase via by_alias) ──

export interface SSEAgentEvent {
  /** Agent name or 'user'. */
  author: string;
  /** Content with parts (text, functionCall, functionResponse, etc.). */
  content?: {
    role?: string;
    parts?: Array<{
      text?: string;
      functionCall?: { name: string; args: Record<string, unknown> };
      functionResponse?: { name: string; response: unknown };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  /** True while the LLM is still generating (streaming chunks). */
  partial?: boolean;
  /** Event actions (artifact deltas, state deltas, etc.). */
  actions?: {
    artifactDelta?: Record<string, number>;
    stateDelta?: Record<string, unknown>;
    [key: string]: unknown;
  };
  /** Invocation identifier for this turn. */
  invocationId?: string;
}

export interface SSEErrorEvent {
  error: string;
}

// ── UI-layer models ──

export type AgentStepStatus = 'completed' | 'running' | 'pending';

export interface AgentStep {
  agent: string;
  status: AgentStepStatus;
  description: string;
  duration?: string;
  tool?: string;
  startTime?: number;
}

export type ToolInvocationStatus = 'calling' | 'success' | 'error';

export interface ToolInvocation {
  id: string;
  agent: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolInvocationStatus;
  response?: unknown;
  startTime: number;
  endTime?: number;
  collapsed: boolean;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  clusters: number;
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentSteps?: AgentStep[];
  toolInvocations?: ToolInvocation[];
  activeAgent?: string;
  graphStats?: GraphStats;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  active: boolean;
}

/** Known agents in pipeline execution order (must match backend agent names) */
export const AGENT_PIPELINE_ORDER = [
  'user_intent_agent_v2',
  'file_suggestion_agent_v3',
  'schema_proposal_agent_v1',
  'graph_construction_agent_v1',
  'graphrag_agent_v1',
] as const;

/** Display-friendly labels for agent names */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'user_intent_agent_v2': 'Intent Analyzer',
  'file_suggestion_agent_v3': 'File Suggestion',
  'schema_proposal_agent_v1': 'Schema Proposal',
  'schema_proposal_agent_coordinator': 'Schema Proposal',
  'schema_refinement_loop': 'Schema Refinement',
  'graph_construction_agent_v1': 'Graph Constructor',
  'graphrag_agent_v1': 'GraphRAG',
};

/** Orchestrator agent name — its text is hand-off chatter, not user-facing */
export const ORCHESTRATOR_AGENT = 'kg_construction_agent_v1';
