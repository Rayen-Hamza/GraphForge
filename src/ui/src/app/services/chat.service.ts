import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';

import { ApiService } from './api.service';
import {
  ChatMessage,
  Conversation,
  AgentStep,
  ToolInvocation,
  GraphStats,
  SSEAgentEvent,
  AGENT_PIPELINE_ORDER,
  AGENT_DISPLAY_NAMES,
  ORCHESTRATOR_AGENT,
} from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);

  // ── Public state ──
  readonly userId = signal('default-user');
  readonly sessionId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly conversations = signal<Conversation[]>([]);
  readonly isStreaming = signal(false);
  readonly error = signal<string | null>(null);

  readonly agentPipeline = signal<AgentStep[]>(
    AGENT_PIPELINE_ORDER.map((name) => ({
      agent: name,
      status: 'pending' as const,
      description: 'Idle',
    })),
  );

  readonly graphStats = signal<GraphStats>({
    nodes: 0,
    edges: 0,
    clusters: 0,
  });

  /** Pipeline with computed durations for completed steps. */
  readonly agentPipelineWithDuration = computed(() =>
    this.agentPipeline().map((s) => ({
      ...s,
      duration:
        s.startTime && s.status === 'completed'
          ? `${((Date.now() - s.startTime) / 1000).toFixed(1)}s`
          : s.duration,
    })),
  );

  private streamSub: Subscription | null = null;
  /** Tracks the current speaking agent so we replace text on agent switch */
  private currentAuthor: string | null = null;
  /** Accumulated partial text per agent — used to avoid duplicate final text */
  private partialText = '';

  // ── Actions ──

  /** Send a message: ensure session, append user msg, stream agent response. */
  async sendMessage(text: string): Promise<void> {
    this.error.set(null);

    // 1. Append user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    this.messages.update((m) => [...m, userMsg]);

    // 2. Ensure session exists
    if (!this.sessionId()) {
      try {
        const resp = await firstValueFrom(
          this.api.createSession({ user_id: this.userId() }),
        );
        this.sessionId.set(resp.session_id);
      } catch (err) {
        this.error.set('Failed to create session. Is the backend running?');
        return;
      }
    }

    // 3. Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      agentSteps: [],
      contentParts: [],
      isStreaming: true,
    };
    this.messages.update((m) => [...m, assistantMsg]);
    this.isStreaming.set(true);
    this.resetPipeline();

    // 4. Stream SSE events
    this.streamSub = this.api
      .runAgentStream(this.sessionId()!, {
        user_id: this.userId(),
        message: text,
        streaming: true,
      })
      .subscribe({
        next: (event) => this.handleSSEEvent(event, assistantMsg.id),
        error: (err) => this.handleStreamError(err, assistantMsg.id),
        complete: () => this.handleStreamComplete(assistantMsg.id),
      });
  }

  /** Cancel the active SSE stream. */
  cancelStream(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    this.isStreaming.set(false);
  }

  /** Start a new conversation. */
  startNewChat(): void {
    this.cancelStream();
    this.sessionId.set(null);
    this.messages.set([]);
    this.error.set(null);
    this.resetPipeline();
    this.graphStats.set({ nodes: 0, edges: 0, clusters: 0 });
  }

  /** Refresh graph stats from the session state endpoint. */
  async refreshSessionState(): Promise<void> {
    const sid = this.sessionId();
    if (!sid) return;
    try {
      const resp = await firstValueFrom(
        this.api.getSessionState(sid, this.userId()),
      );
      if (resp.state && resp.state['graph_stats']) {
        this.graphStats.set(resp.state['graph_stats'] as GraphStats);
      }
    } catch {
      // non-critical, silently ignore
    }
  }

  // ── SSE event handlers ──

  private handleSSEEvent(event: SSEAgentEvent, msgId: string): void {
    const author = event.author;
    const isPartial = !!event.partial;

    // Check both camelCase and snake_case keys since ADK serialises as snake_case
    const hasFunctionCall = event.content?.parts?.some((p: any) => p.functionCall || p.function_call) ?? false;
    const hasFunctionResponse = event.content?.parts?.some((p: any) => p.functionResponse || p.function_response) ?? false;
    const isFinal = !isPartial && !hasFunctionCall && !hasFunctionResponse;

    // Orchestrator hand-off chatter → update pipeline only.
    // But let through events that carry function calls, responses, or user-facing text.
    const orchestratorTextContent =
      event.content?.parts?.some((p: any) => p.text && !p.functionCall && !p.function_call) ?? false;
    if (author === ORCHESTRATOR_AGENT && !orchestratorTextContent && !hasFunctionCall && !hasFunctionResponse) {
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === msgId
            ? { ...m, agentSteps: [...this.agentPipelineWithDuration()] }
            : m,
        ),
      );
      return;
    }

    // Update pipeline step status
    this.updatePipelineStep(author, isPartial, isFinal);

    // ── Detect agent switch ──
    const isNewAgent = this.currentAuthor !== null && this.currentAuthor !== author;
    if (author !== this.currentAuthor) {
      this.currentAuthor = author;
      this.partialText = '';
    }

    // ── Capture tool invocations (functionCall / function_call) ──
    // ADK may emit the same call from both orchestrator and sub-agent — deduplicate.
    const functionCalls = event.content?.parts?.filter((p: any) => p.functionCall || p.function_call) ?? [];
    for (const part of functionCalls) {
      const fc = (part as any).functionCall ?? (part as any).function_call;
      const currentMsg = this.messages().find((m) => m.id === msgId);
      const alreadyTracked = (currentMsg?.toolInvocations ?? []).some(
        (inv) => inv.name === fc.name && inv.status === 'calling',
      );
      if (alreadyTracked) continue;

      const invocation: ToolInvocation = {
        id: crypto.randomUUID(),
        agent: author,
        name: fc.name,
        args: fc.args ?? {},
        status: 'calling',
        startTime: Date.now(),
        collapsed: true,
      };
      this.messages.update((msgs) =>
        msgs.map((m) =>
          m.id === msgId
            ? {
                ...m,
                toolInvocations: [...(m.toolInvocations ?? []), invocation],
                contentParts: [...(m.contentParts ?? []), { type: 'tool' as const, toolId: invocation.id }],
              }
            : m,
        ),
      );
    }

    // ── Capture tool responses (functionResponse / function_response) ──
    const functionResponses = event.content?.parts?.filter((p: any) => p.functionResponse || p.function_response) ?? [];
    for (const part of functionResponses) {
      const fr = (part as any).functionResponse ?? (part as any).function_response;
      this.messages.update((msgs) =>
        msgs.map((m) => {
          if (m.id !== msgId) return m;
          const invocations = [...(m.toolInvocations ?? [])];
          const idx = invocations.findIndex((inv) => inv.name === fr.name && inv.status === 'calling');
          if (idx !== -1) {
            invocations[idx] = { ...invocations[idx], status: 'success' as const, response: fr.response, endTime: Date.now() };
          }
          return { ...m, toolInvocations: invocations };
        }),
      );
    }

    // ── Typewriter streaming ──
    const textContent =
      event.content?.parts
        ?.filter((p: any) => p.text && !p.functionCall && !p.function_call)
        .map((p) => p.text)
        .join('') ?? '';

    if (textContent) {
      if (isPartial) {
        this.messages.update((msgs) =>
          msgs.map((m) => {
            if (m.id !== msgId) return m;
            const parts = [...(m.contentParts ?? [])];
            const lastPart = parts[parts.length - 1];
            if (!isNewAgent && lastPart?.type === 'text') {
              parts[parts.length - 1] = { type: 'text', text: lastPart.text + textContent };
            } else {
              parts.push({ type: 'text', text: textContent });
            }
            return {
              ...m,
              content: isNewAgent ? textContent : m.content + textContent,
              contentParts: parts,
            };
          }),
        );
        if (isNewAgent) {
          this.partialText = textContent;
        } else {
          this.partialText += textContent;
        }
      } else if (!this.partialText) {
        this.messages.update((msgs) =>
          msgs.map((m) => {
            if (m.id !== msgId) return m;
            const parts = [...(m.contentParts ?? [])];
            const lastPart = parts[parts.length - 1];
            if (!isNewAgent && lastPart?.type === 'text') {
              parts[parts.length - 1] = { type: 'text', text: lastPart.text + textContent };
            } else {
              parts.push({ type: 'text', text: textContent });
            }
            return {
              ...m,
              content: isNewAgent ? textContent : m.content + textContent,
              contentParts: parts,
            };
          }),
        );
      }
    }

    // Mirror pipeline steps + active agent into the assistant message
    const displayAuthor = AGENT_DISPLAY_NAMES[author] ?? author;
    this.messages.update((msgs) =>
      msgs.map((m) =>
        m.id === msgId
          ? { ...m, agentSteps: [...this.agentPipelineWithDuration()], activeAgent: displayAuthor }
          : m,
      ),
    );
  }

  private handleStreamError(err: unknown, msgId: string): void {
    const message = err instanceof Error ? err.message : 'Stream connection lost';
    this.error.set(message);
    this.isStreaming.set(false);
    this.streamSub = null;

    // Finalize the assistant message + mark any still-calling tools as error
    this.messages.update((msgs) =>
      msgs.map((m) => {
        if (m.id !== msgId) return m;
        const toolInvocations = (m.toolInvocations ?? []).map((inv) =>
          inv.status === 'calling'
            ? { ...inv, status: 'error' as const, endTime: Date.now() }
            : inv,
        );
        return {
          ...m,
          isStreaming: false,
          content: m.content || 'An error occurred while processing your request.',
          agentSteps: [...this.agentPipelineWithDuration()],
          toolInvocations,
        };
      }),
    );
  }

  private handleStreamComplete(msgId: string): void {
    this.isStreaming.set(false);
    this.streamSub = null;

    // Mark all running/pending steps as completed
    this.agentPipeline.update((steps) =>
      steps.map((s) =>
        s.status === 'running' || s.status === 'pending'
          ? { ...s, status: 'completed' as const, description: 'Done' }
          : s,
      ),
    );

    // Finalize the assistant message + mark any still-calling tools as success
    this.messages.update((msgs) =>
      msgs.map((m) => {
        if (m.id !== msgId) return m;
        const toolInvocations = (m.toolInvocations ?? []).map((inv) =>
          inv.status === 'calling'
            ? { ...inv, status: 'success' as const, endTime: Date.now() }
            : inv,
        );
        return {
          ...m,
          isStreaming: false,
          agentSteps: [...this.agentPipelineWithDuration()],
          toolInvocations,
        };
      }),
    );

    // Refresh graph stats from session state
    this.refreshSessionState();
  }

  // ── Pipeline helpers ──

  private resetPipeline(): void {
    this.currentAuthor = null;
    this.partialText = '';
    this.agentPipeline.set(
      AGENT_PIPELINE_ORDER.map((name) => ({
        agent: name,
        status: 'pending' as const,
        description: 'Idle',
      })),
    );
  }

  /**
   * Map an SSE author name to a pipeline step index.
   * Sub-agents like schema_refinement_loop or schema_proposal_agent_coordinator
   * are grouped under the schema_proposal_agent_v1 step.
   */
  private resolveAuthorIndex(steps: AgentStep[], author: string): number {
    // Direct match
    const direct = steps.findIndex((s) => s.agent === author);
    if (direct !== -1) return direct;

    // Schema sub-agents → schema_proposal_agent_v1
    if (author.startsWith('schema_')) {
      return steps.findIndex((s) => s.agent === 'schema_proposal_agent_v1');
    }

    return -1;
  }

  private updatePipelineStep(
    author: string,
    partial: boolean,
    isFinal: boolean,
  ): void {
    this.agentPipeline.update((steps) => {
      const idx = this.resolveAuthorIndex(steps, author);
      if (idx === -1) return steps; // unknown agent, skip

      const displayName = AGENT_DISPLAY_NAMES[author] ?? author;

      return steps.map((s, i) => {
        if (i < idx) {
          return { ...s, status: 'completed' as const, description: 'Done' };
        }
        if (i === idx) {
          return {
            ...s,
            status: isFinal ? ('completed' as const) : ('running' as const),
            description: partial
              ? `${displayName}: Processing...`
              : isFinal
                ? 'Done'
                : `${displayName}: Running`,
            startTime: s.startTime ?? Date.now(),
          };
        }
        return s;
      });
    });
  }
}
