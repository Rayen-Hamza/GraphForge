import { Component, signal, computed, inject, effect, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../services/chat.service';
import { ChatMessage, ToolInvocation, AGENT_DISPLAY_NAMES } from '../models/chat.models';
import { MarkdownPipe } from '../shared/markdown.pipe';

export interface DisplayPart {
    type: 'text' | 'tools';
    text?: string;
    tools?: ToolInvocation[];
    isLastText?: boolean;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, MarkdownPipe],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
})
export class ChatComponent {
    private readonly chat = inject(ChatService);
    private readonly zone = inject(NgZone);

    // ── Delegated state from ChatService ──
    messages = this.chat.messages;
    isStreaming = this.chat.isStreaming;
    agentPipeline = this.chat.agentPipelineWithDuration;
    currentGraphStats = this.chat.graphStats;
    error = this.chat.error;
    conversations = this.chat.conversations;

    // ── Local UI state ──
    sidebarCollapsed = signal(false);
    statePanelOpen = signal(true);
    isInputFocused = signal(false);
    inputText = '';
    searchQuery = '';
    expandedSteps = signal<Set<string>>(new Set());

    // ── Auto-scroll state ──
    private userScrolledUp = false;
    private streamStartTime = 0;
    private elapsedTimer: ReturnType<typeof setInterval> | null = null;
    streamElapsed = signal('0s');

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    /** Auto-scroll effect: fires whenever messages change while streaming */
    private autoScrollEffect = effect(() => {
        // Touch reactive signals so the effect re-runs
        this.messages();
        const streaming = this.isStreaming();

        if (streaming && !this.userScrolledUp) {
            // Use requestAnimationFrame so the DOM has rendered the new content
            requestAnimationFrame(() => this.scrollToBottom());
        }

        // Start/stop the elapsed timer
        if (streaming && !this.elapsedTimer) {
            this.streamStartTime = Date.now();
            this.streamElapsed.set('0s');
            this.zone.runOutsideAngular(() => {
                this.elapsedTimer = setInterval(() => {
                    const secs = Math.floor((Date.now() - this.streamStartTime) / 1000);
                    this.zone.run(() => this.streamElapsed.set(secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`));
                }, 1000);
            });
        }
        if (!streaming && this.elapsedTimer) {
            clearInterval(this.elapsedTimer);
            this.elapsedTimer = null;
        }
    });

    /** Track user scroll to pause auto-scroll when they scroll up */
    onMessagesScroll() {
        const el = this.messagesContainer?.nativeElement;
        if (!el) return;
        // If the user is within 80px of the bottom, re-enable auto-scroll
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        this.userScrolledUp = !atBottom;
    }

    private scrollToBottom() {
        const el = this.messagesContainer?.nativeElement;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }

    suggestions = [
        'Map AI research to cognitive science',
        'Explore renewable energy supply chains',
        'Connect programming paradigms to math theories',
        'Trace the evolution of neural architectures',
    ];

    recentEntities = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant');
        if (last?.agentSteps?.length) {
            return last.agentSteps.map(s => s.agent);
        }
        return [];
    });

    filteredConversations = computed(() => {
        const q = this.searchQuery.toLowerCase();
        if (!q) return this.conversations();
        return this.conversations().filter(c =>
            c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
        );
    });

    activeConversation = computed(() => {
        return this.conversations().find(c => c.active);
    });

    /** The currently running agent for the streaming indicator */
    currentStreamingAgent = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.activeAgent ?? null;
    });

    /** Count of tool invocations in the current streaming message */
    currentStreamingToolCount = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.toolInvocations?.length ?? 0;
    });

    /** The currently running agent info for the side panel */
    runningAgent = computed(() => {
        const steps = this.agentPipeline();
        const running = steps.find(s => s.status === 'running');
        if (!running) return null;
        return {
            agent: running.agent,
            displayName: this.agentDisplayName(running.agent),
            description: running.description,
        };
    });

    /** Tool invocations for the active streaming message (for panel) */
    activeToolInvocations = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.toolInvocations ?? [];
    });

    selectConversation(id: string) {
        this.conversations.update(convs =>
            convs.map(c => ({ ...c, active: c.id === id }))
        );
    }

    startNewChat() {
        this.chat.startNewChat();
    }

    useSuggestion(text: string) {
        this.inputText = text;
    }

    onEnter(event: Event) {
        const e = event as KeyboardEvent;
        if (!e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    sendMessage() {
        const text = this.inputText.trim();
        if (!text || this.isStreaming()) return;
        this.inputText = '';
        this.userScrolledUp = false;
        this.chat.sendMessage(text);
        requestAnimationFrame(() => this.scrollToBottom());
    }

    cancelStream() {
        this.chat.cancelStream();
    }

    dismissError() {
        this.chat.error.set(null);
    }

    agentDisplayName(agent: string): string {
        return AGENT_DISPLAY_NAMES[agent] ?? agent;
    }

    toggleStepsSummary(msgId: string) {
        this.expandedSteps.update(set => {
            const next = new Set(set);
            if (next.has(msgId)) {
                next.delete(msgId);
            } else {
                next.add(msgId);
            }
            return next;
        });
    }

    completedStepCount(steps: { status: string }[]): number {
        return steps.filter(s => s.status === 'completed').length;
    }

    /**
     * Group contentParts into display segments: text blocks and consecutive tool groups.
     * Preserves chronological interleaving of text and tool calls.
     */
    getDisplayParts(msg: ChatMessage): DisplayPart[] {
        if (!msg.contentParts?.length) {
            // Fallback for user messages or messages without parts
            const result: DisplayPart[] = [];
            if (msg.toolInvocations?.length) {
                result.push({ type: 'tools', tools: msg.toolInvocations });
            }
            if (msg.content) {
                result.push({ type: 'text', text: msg.content, isLastText: true });
            }
            return result;
        }

        const result: DisplayPart[] = [];
        for (const part of msg.contentParts) {
            if (part.type === 'text') {
                result.push({ type: 'text', text: part.text, isLastText: false });
            } else {
                const tool = msg.toolInvocations?.find(t => t.id === part.toolId);
                if (tool) {
                    const last = result[result.length - 1];
                    if (last?.type === 'tools') {
                        last.tools!.push(tool);
                    } else {
                        result.push({ type: 'tools', tools: [tool] });
                    }
                }
            }
        }

        // Mark the last text part for streaming cursor
        for (let i = result.length - 1; i >= 0; i--) {
            if (result[i].type === 'text') {
                result[i].isLastText = true;
                break;
            }
        }

        return result;
    }

}
