import { Component, signal, computed, inject, effect, ElementRef, ViewChild, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { ChatMessage, ToolInvocation, AGENT_DISPLAY_NAMES } from '../../models/chat.models';
import { MarkdownPipe } from '../../shared/markdown.pipe';

export interface DisplayPart {
    type: 'text' | 'tools';
    text?: string;
    tools?: ToolInvocation[];
    isLastText?: boolean;
}

@Component({
    selector: 'app-chat-interface',
    standalone: true,
    imports: [CommonModule, FormsModule, MarkdownPipe],
    templateUrl: './chat-interface.component.html',
    styleUrls: ['./chat-interface.component.css'],
})
export class ChatInterfaceComponent implements OnInit, OnDestroy {
    private readonly chat = inject(ChatService);
    private readonly zone = inject(NgZone);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    private routeSub: Subscription | null = null;

    // ── Delegated state from ChatService ──
    messages = this.chat.messages;
    isStreaming = this.chat.isStreaming;
    agentPipeline = this.chat.agentPipelineWithDuration;
    currentGraphStats = this.chat.graphStats;
    error = this.chat.error;
    conversations = this.chat.conversations;

    // ── Local UI state ──
    statePanelOpen = signal(window.innerWidth > 1024);
    isInputFocused = signal(false);
    inputText = '';
    expandedSteps = signal<Set<string>>(new Set());

    // ── Auto-scroll state ──
    private userScrolledUp = false;
    private streamStartTime = 0;
    private elapsedTimer: ReturnType<typeof setInterval> | null = null;
    streamElapsed = signal('0s');

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    /** Auto-scroll effect: fires whenever messages change while streaming */
    private autoScrollEffect = effect(() => {
        this.messages();
        const streaming = this.isStreaming();

        if (streaming && !this.userScrolledUp) {
            requestAnimationFrame(() => this.scrollToBottom());
        }

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

    /** Sync URL when a new session is created via sendMessage() */
    private sessionIdEffect = effect(() => {
        const sid = this.chat.sessionId();
        if (!sid) return;
        const currentRouteSessionId = this.route.snapshot.paramMap.get('sessionId');
        if (sid !== currentRouteSessionId) {
            this.router.navigate(['/chat', sid], { replaceUrl: true });
        }
    });

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

    activeConversation = computed(() => {
        return this.conversations().find(c => c.active);
    });

    currentStreamingAgent = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.activeAgent ?? null;
    });

    currentStreamingToolCount = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.toolInvocations?.length ?? 0;
    });

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

    activeToolInvocations = computed(() => {
        const msgs = this.messages();
        const last = [...msgs].reverse().find(m => m.role === 'assistant' && m.isStreaming);
        return last?.toolInvocations ?? [];
    });

    ngOnInit(): void {
        this.routeSub = this.route.paramMap.subscribe((params) => {
            const sessionId = params.get('sessionId');
            if (sessionId && sessionId !== this.chat.sessionId()) {
                this.chat.selectConversation(sessionId);
            } else if (!sessionId && this.chat.sessionId()) {
                this.chat.startNewChat();
            }
        });
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
        if (this.elapsedTimer) {
            clearInterval(this.elapsedTimer);
        }
    }

    onMessagesScroll() {
        const el = this.messagesContainer?.nativeElement;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        this.userScrolledUp = !atBottom;
    }

    private scrollToBottom() {
        const el = this.messagesContainer?.nativeElement;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
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

    toggleMobileSidebar() {
        this.chat.mobileSidebarOpen.update(v => !v);
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

    getDisplayParts(msg: ChatMessage): DisplayPart[] {
        if (!msg.contentParts?.length) {
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

        for (let i = result.length - 1; i >= 0; i--) {
            if (result[i].type === 'text') {
                result[i].isLastText = true;
                break;
            }
        }

        return result;
    }
}
