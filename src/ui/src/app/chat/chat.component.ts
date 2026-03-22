import { Component, signal, computed, inject, effect, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../services/chat.service';
import { AGENT_DISPLAY_NAMES } from '../models/chat.models';
import { MarkdownPipe } from '../shared/markdown.pipe';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, MarkdownPipe],
    template: `
    <div class="chat-layout">
      <!-- ═══ SIDEBAR ═══ -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <a routerLink="/" class="sidebar-brand">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="currentColor"/>
              <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="14" cy="24" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="4" cy="14" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="24" cy="14" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="21.5" cy="6.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="6.5" cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="21.5" cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
            </svg>
            @if (!sidebarCollapsed()) {
              <span>GraphForge</span>
            }
          </a>
          <button class="btn-icon-sm" (click)="sidebarCollapsed.set(!sidebarCollapsed())">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    [attr.transform]="sidebarCollapsed() ? 'rotate(180 8 8)' : ''"/>
            </svg>
          </button>
        </div>

        @if (!sidebarCollapsed()) {
          <button class="new-chat-btn" (click)="startNewChat()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            New Conversation
          </button>

          <div class="sidebar-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input type="text" placeholder="Search conversations..." [(ngModel)]="searchQuery">
          </div>

          <div class="conv-list">
            <div class="conv-group-label">Recent</div>
            @for (conv of filteredConversations(); track conv.id) {
              <button
                class="conv-item"
                [class.active]="conv.active"
                (click)="selectConversation(conv.id)"
              >
                <div class="conv-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6l-3 2.5V12a2 2 0 0 1-1-1.73V4z"
                          stroke="currentColor" stroke-width="1.3"/>
                  </svg>
                </div>
                <div class="conv-text">
                  <span class="conv-title">{{ conv.title }}</span>
                  <span class="conv-preview">{{ conv.preview }}</span>
                </div>
                <span class="conv-time">{{ conv.timestamp }}</span>
              </button>
            }
          </div>
        }
      </aside>

      <!-- ═══ MAIN CHAT AREA ═══ -->
      <main class="chat-main">
        <div class="chat-topbar">
          <div class="topbar-left">
            <h2 class="chat-title">{{ activeConversation()?.title || 'New Conversation' }}</h2>
            <span class="chat-meta">{{ messages().length }} messages · {{ currentGraphStats().nodes }} nodes in graph</span>
          </div>
          <div class="topbar-right">
            <button class="btn-icon-sm" (click)="statePanelOpen.set(!statePanelOpen())" [class.active-toggle]="statePanelOpen()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
                <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
                <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
                <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chat-messages" #messagesContainer (scroll)="onMessagesScroll()">
          @if (messages().length === 0) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.15"/>
                  <circle cx="24" cy="24" r="3" fill="currentColor"/>
                  <circle cx="24" cy="8" r="2.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="24" cy="40" r="2.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="8" cy="24" r="2.5" fill="currentColor" opacity="0.5"/>
                  <circle cx="40" cy="24" r="2.5" fill="currentColor" opacity="0.5"/>
                  <line x1="24" y1="18" x2="24" y2="10.5" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
                  <line x1="24" y1="30" x2="24" y2="37.5" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
                  <line x1="18" y1="24" x2="10.5" y2="24" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
                  <line x1="30" y1="24" x2="37.5" y2="24" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
                </svg>
              </div>
              <h3>Start a Knowledge Graph</h3>
              <p>Describe what you want to explore. GraphForge's agents will research, extract, and build a structured knowledge graph.</p>
              <div class="suggestion-chips">
                @for (suggestion of suggestions; track suggestion) {
                  <button class="chip" (click)="useSuggestion(suggestion)">{{ suggestion }}</button>
                }
              </div>
            </div>
          }

          @for (msg of messages(); track msg.id) {
            <div class="message" [class.user-message]="msg.role === 'user'" [class.assistant-message]="msg.role === 'assistant'">
              <div class="msg-avatar-chat" [class.user-av]="msg.role === 'user'" [class.agent-av]="msg.role === 'assistant'">
                @if (msg.role === 'user') {
                  <span>U</span>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="3" fill="currentColor"/>
                    <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
                    <circle cx="14" cy="23" r="1.5" fill="currentColor" opacity="0.6"/>
                    <circle cx="5" cy="14" r="1.5" fill="currentColor" opacity="0.6"/>
                    <circle cx="23" cy="14" r="1.5" fill="currentColor" opacity="0.6"/>
                  </svg>
                }
              </div>
              <div class="msg-body">
                <div class="msg-header">
                  <span class="msg-author">{{ msg.role === 'user' ? 'You' : 'GraphForge' }}</span>
                  @if (msg.role === 'assistant' && msg.activeAgent && msg.isStreaming) {
                    <span class="active-agent-badge">
                      <span class="agent-pulse"></span>
                      {{ msg.activeAgent }}
                    </span>
                  }
                  <span class="msg-timestamp">{{ msg.timestamp }}</span>
                </div>

                <!-- ── Tool Invocations Timeline ── -->
                @if (msg.toolInvocations?.length) {
                  <div class="tool-timeline">
                    @for (tool of msg.toolInvocations; track tool.id; let i = $index) {
                      <div class="tool-timeline-row"
                           [class.tl-calling]="tool.status === 'calling'"
                           [class.tl-success]="tool.status === 'success'"
                           [class.tl-error]="tool.status === 'error'"
                           [style.animation-delay]="(i * 80) + 'ms'">
                        @if (i > 0) {
                          <div class="tl-connector" [class.tl-connector-done]="tool.status !== 'calling'"></div>
                        }
                        <div class="tl-row-content">
                          <div class="tl-node">
                            @if (tool.status === 'calling') {
                              <div class="tl-node-ring"></div>
                              <div class="tl-node-core"></div>
                            } @else if (tool.status === 'success') {
                              <div class="tl-node-done">
                                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                  <path d="M3.5 7l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                              </div>
                            } @else {
                              <div class="tl-node-error">
                                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                  <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                              </div>
                            }
                          </div>
                          <div class="tl-info">
                            <span class="tl-name">{{ tool.name }}</span>
                            @if (tool.endTime && tool.startTime) {
                              <span class="tl-duration">{{ ((tool.endTime - tool.startTime) / 1000).toFixed(1) }}s</span>
                            }
                          </div>
                        </div>
                        @if (tool.status === 'calling') {
                          <div class="tl-shimmer"></div>
                        }
                      </div>
                    }
                  </div>
                }

                <div class="msg-content-text markdown-body"
                     [class.streaming-cursor]="msg.isStreaming"
                     [class.streaming-text]="msg.isStreaming && msg.content"
                     [innerHTML]="msg.content | markdown"></div>

                @if (msg.agentSteps && !msg.isStreaming) {
                  <div class="agent-steps-summary">
                    <button class="steps-summary-toggle" (click)="toggleStepsSummary(msg.id)">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/>
                        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
                      </svg>
                      <span>{{ completedStepCount(msg.agentSteps) }} agents completed</span>
                      <svg class="summary-chevron" [class.expanded]="expandedSteps().has(msg.id)" width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    @if (expandedSteps().has(msg.id)) {
                      <div class="steps-expanded-list">
                        @for (step of msg.agentSteps; track step.agent) {
                          <div class="step-row-mini" [class.step-completed]="step.status === 'completed'">
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" fill="var(--accent-success)" opacity="0.12"/>
                              <path d="M4 7l2 2 4-4" stroke="var(--accent-success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="step-mini-name">{{ agentDisplayName(step.agent) }}</span>
                            @if (step.duration) {
                              <span class="step-mini-dur">{{ step.duration }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }

                @if (msg.graphStats) {
                  <div class="graph-stats-inline">
                    <div class="gs-item">
                      <span class="gs-value">{{ msg.graphStats.nodes }}</span>
                      <span class="gs-label">Nodes</span>
                    </div>
                    <div class="gs-item">
                      <span class="gs-value">{{ msg.graphStats.edges }}</span>
                      <span class="gs-label">Edges</span>
                    </div>
                    <div class="gs-item">
                      <span class="gs-value">{{ msg.graphStats.clusters }}</span>
                      <span class="gs-label">Clusters</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        @if (isStreaming()) {
          <div class="streaming-indicator">
            <div class="streaming-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="streaming-info">
              <span class="streaming-label">{{ currentStreamingAgent() || 'Processing' }}</span>
              <span class="streaming-sub">{{ currentStreamingToolCount() > 0 ? currentStreamingToolCount() + ' tool calls' : 'thinking...' }}</span>
            </div>
            <div class="streaming-elapsed">{{ streamElapsed() }}</div>
            <button class="btn-icon-sm cancel-btn" (click)="cancelStream()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
          </div>
        }

        @if (error()) {
          <div class="error-banner">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
              <path d="M8 4.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="11" r="0.8" fill="currentColor"/>
            </svg>
            <span>{{ error() }}</span>
            <button class="btn-icon-sm" (click)="dismissError()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        }

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-container" [class.input-active]="isInputFocused()">
            <textarea
              #inputBox
              placeholder="Describe what you want to explore..."
              [(ngModel)]="inputText"
              (keydown.enter)="onEnter($event)"
              (focus)="isInputFocused.set(true)"
              (blur)="isInputFocused.set(false)"
              rows="1"
            ></textarea>
            <button class="send-btn" [disabled]="!inputText.trim() || isStreaming()" (click)="sendMessage()">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l6-6m0 0l6 6m-6-6v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span>Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</span>
          </div>
        </div>
      </main>

      <!-- ═══ AGENT STATE PANEL ═══ -->
      @if (statePanelOpen()) {
        <aside class="state-panel">
          <div class="panel-header">
            <h3>Agent State</h3>
            <button class="btn-icon-sm" (click)="statePanelOpen.set(false)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Graph Stats -->
          <div class="panel-section">
            <div class="panel-section-title">Knowledge Graph</div>
            <div class="stats-grid">
              <div class="stat-card">
                <span class="sc-value">{{ currentGraphStats().nodes }}</span>
                <span class="sc-label">Nodes</span>
              </div>
              <div class="stat-card">
                <span class="sc-value">{{ currentGraphStats().edges }}</span>
                <span class="sc-label">Edges</span>
              </div>
              <div class="stat-card">
                <span class="sc-value">{{ currentGraphStats().clusters }}</span>
                <span class="sc-label">Clusters</span>
              </div>
              <div class="stat-card">
                <span class="sc-value">{{ currentGraphStats().confidence ?? 0 }}%</span>
                <span class="sc-label">Confidence</span>
              </div>
            </div>
          </div>

          <!-- Active Agent (only running) -->
          <div class="panel-section">
            <div class="panel-section-title">Active Agent</div>
            @if (runningAgent()) {
              <div class="active-agent-card">
                <div class="active-agent-orb">
                  <span class="orb-ring"></span>
                  <span class="orb-core"></span>
                </div>
                <div class="active-agent-info">
                  <span class="active-agent-name">{{ runningAgent()!.displayName }}</span>
                  <span class="active-agent-desc">{{ runningAgent()!.description }}</span>
                </div>
              </div>
              @if (activeToolInvocations().length) {
                <div class="panel-tool-list">
                  @for (tool of activeToolInvocations(); track tool.id) {
                    <div class="panel-tool-item" [class.panel-tool-calling]="tool.status === 'calling'" [class.panel-tool-done]="tool.status === 'success'">
                      <div class="panel-tool-dot" [class.dot-calling]="tool.status === 'calling'" [class.dot-done]="tool.status === 'success'"></div>
                      <span class="panel-tool-name">{{ tool.name }}</span>
                      @if (tool.endTime && tool.startTime) {
                        <span class="panel-tool-dur">{{ ((tool.endTime - tool.startTime) / 1000).toFixed(1) }}s</span>
                      }
                    </div>
                  }
                </div>
              }
            } @else {
              <div class="no-agent-idle">
                <div class="idle-dot"></div>
                <span>Idle</span>
              </div>
            }
          </div>

          <!-- Pipeline Progress -->
          <div class="panel-section">
            <div class="panel-section-title">Pipeline</div>
            <div class="pipeline-track">
              @for (step of agentPipeline(); track step.agent; let i = $index; let last = $last) {
                <div class="pipeline-node" [class.node-completed]="step.status === 'completed'"
                     [class.node-running]="step.status === 'running'"
                     [class.node-pending]="step.status === 'pending'">
                  <div class="pipeline-node-dot">
                    @if (step.status === 'completed') {
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 7l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    } @else if (step.status === 'running') {
                      <div class="node-spinner"></div>
                    }
                  </div>
                  <span class="pipeline-node-label">{{ agentDisplayName(step.agent) }}</span>
                  @if (step.duration) {
                    <span class="pipeline-node-dur">{{ step.duration }}</span>
                  }
                </div>
                @if (!last) {
                  <div class="pipeline-connector" [class.connector-done]="step.status === 'completed'"></div>
                }
              }
            </div>
          </div>

          <!-- Recent Entities -->
          <div class="panel-section">
            <div class="panel-section-title">Recent Entities</div>
            <div class="entity-tags">
              @for (entity of recentEntities(); track entity) {
                <span class="entity-tag">{{ entity }}</span>
              }
            </div>
          </div>
        </aside>
      }
    </div>
  `,
    styles: [`
    /* ═══ Layout ═══ */
    .chat-layout {
      display: flex;
      height: 100vh;
      background: var(--bg-app);
      overflow: hidden;
    }

    /* ═══ Sidebar ═══ */
    .sidebar {
      width: 280px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      flex-shrink: 0;
    }
    .sidebar.collapsed {
      width: 64px;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border-light);
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--accent-primary);
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .btn-icon-sm {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--text-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-icon-sm:hover {
      background: var(--bg-surface-subtle);
      color: var(--text-primary);
    }
    .btn-icon-sm.active-toggle {
      background: var(--accent-green-muted);
      color: var(--accent-primary);
    }

    .new-chat-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 12px 0;
      padding: 10px 16px;
      background: var(--accent-primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .new-chat-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .sidebar-search {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px;
      padding: 8px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      color: var(--text-tertiary);
    }
    .sidebar-search input {
      border: none;
      background: none;
      outline: none;
      font-size: 13px;
      color: var(--text-primary);
      width: 100%;
      font-family: var(--font-sans);
    }
    .sidebar-search input::placeholder {
      color: var(--text-tertiary);
    }

    .conv-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }
    .conv-group-label {
      padding: 12px 12px 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-tertiary);
    }
    .conv-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      color: var(--text-primary);
      font-family: var(--font-sans);
    }
    .conv-item:hover {
      background: var(--bg-surface-subtle);
    }
    .conv-item.active {
      background: var(--accent-green-muted);
    }
    .conv-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .conv-text {
      flex: 1;
      min-width: 0;
    }
    .conv-title {
      display: block;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .conv-preview {
      display: block;
      font-size: 12px;
      color: var(--text-tertiary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .conv-time {
      font-size: 11px;
      color: var(--text-tertiary);
      flex-shrink: 0;
      margin-top: 3px;
      font-family: var(--font-mono);
    }

    /* ═══ Main Chat ═══ */
    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .chat-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-light);
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(12px);
    }
    .chat-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .chat-meta {
      font-size: 12px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }

    /* Messages */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      scroll-behavior: smooth;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      animation: fadeIn 0.5s ease both;
    }
    .empty-icon {
      color: var(--accent-green-light);
      margin-bottom: 20px;
      animation: float 4s ease-in-out infinite;
    }
    .empty-state h3 {
      font-family: var(--font-serif);
      font-size: 24px;
      font-weight: 400;
      margin: 0 0 8px;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 400px;
      margin: 0 0 32px;
      line-height: 1.6;
    }
    .suggestion-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      max-width: 520px;
    }
    .chip {
      padding: 8px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.25s;
      font-family: var(--font-sans);
    }
    .chip:hover {
      border-color: var(--accent-orange);
      color: var(--accent-orange);
      background: rgba(232, 115, 74, 0.04);
      transform: translateY(-1px);
    }

    .message {
      display: flex;
      gap: 14px;
      margin-bottom: 24px;
      animation: msgSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      max-width: 800px;
    }
    .msg-avatar-chat {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 600;
    }
    .user-av {
      background: var(--accent-green-muted);
      color: var(--accent-green);
    }
    .agent-av {
      background: var(--accent-primary);
      color: white;
    }
    .msg-body {
      flex: 1;
      min-width: 0;
    }
    .msg-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .msg-author {
      font-size: 14px;
      font-weight: 600;
    }
    .msg-timestamp {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }

    /* Active Agent Badge — inline with message header */
    .active-agent-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px 2px 8px;
      background: linear-gradient(135deg, rgba(61, 139, 86, 0.08), rgba(74, 93, 79, 0.06));
      border: 1px solid rgba(61, 139, 86, 0.15);
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-success);
      font-family: var(--font-mono);
      letter-spacing: 0.01em;
      animation: badgeFadeIn 0.3s ease both;
    }
    .agent-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: pulse-glow 1.5s infinite;
      flex-shrink: 0;
    }

    /* ═══ Tool Timeline ═══ */
    .tool-timeline {
      display: flex;
      flex-direction: column;
      margin: 10px 0;
      padding-left: 2px;
    }

    .tool-timeline-row {
      position: relative;
      animation: tlRowIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .tl-connector {
      width: 2px;
      height: 10px;
      margin-left: 9px;
      background: var(--border-medium);
      border-radius: 1px;
      transition: background 0.4s ease;
    }
    .tl-connector-done {
      background: var(--accent-success);
    }

    .tl-row-content {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px 4px 0;
      position: relative;
      z-index: 1;
      border-radius: var(--radius-sm);
    }

    /* ── Status Nodes ── */
    .tl-node {
      width: 20px;
      height: 20px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tl-node-ring {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(232, 115, 74, 0.2);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .tl-node-core {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-orange);
      animation: tlCorePulse 1.5s ease-in-out infinite;
    }

    .tl-node-done {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: tlNodePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .tl-node-error {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-error);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: tlNodePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    /* ── Tool Info ── */
    .tl-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .tl-name {
      font-size: 12px;
      font-weight: 500;
      font-family: var(--font-mono);
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.3s, text-shadow 0.3s;
    }

    .tl-calling .tl-name {
      color: var(--accent-orange);
      text-shadow: 0 0 8px rgba(232, 115, 74, 0.3);
    }

    .tl-success .tl-name {
      color: var(--text-primary);
    }

    .tl-duration {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
      flex-shrink: 0;
      animation: fadeIn 0.3s ease both;
    }

    /* ── Shimmer behind calling row ── */
    .tl-shimmer {
      position: absolute;
      inset: 0;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        transparent,
        rgba(232, 115, 74, 0.06) 30%,
        rgba(232, 115, 74, 0.10) 50%,
        rgba(232, 115, 74, 0.06) 70%,
        transparent
      );
      background-size: 200% 100%;
      animation: shimmerBar 2s linear infinite;
      z-index: 0;
      pointer-events: none;
    }

    /* ── Agent Steps Summary (collapsed after streaming) ── */
    .agent-steps-summary {
      margin-top: 10px;
    }
    .steps-summary-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
      font-family: var(--font-sans);
    }
    .steps-summary-toggle:hover {
      background: var(--bg-surface-subtle);
      border-color: var(--border-medium);
    }
    .summary-chevron {
      transition: transform 0.2s ease;
      color: var(--text-tertiary);
    }
    .summary-chevron.expanded {
      transform: rotate(180deg);
    }
    .steps-expanded-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
      padding-left: 4px;
      animation: fadeIn 0.2s ease both;
    }
    .step-row-mini {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 0;
    }
    .step-mini-name {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .step-mini-dur {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }

    .msg-content-text {
      font-size: 14.5px;
      line-height: 1.7;
      color: var(--text-primary);
    }

    /* ── Markdown body ── */
    .markdown-body p { margin: 0 0 0.6em; }
    .markdown-body p:last-child { margin-bottom: 0; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin: 1em 0 0.4em;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-primary);
    }
    .markdown-body h1 { font-size: 1.4em; }
    .markdown-body h2 { font-size: 1.25em; }
    .markdown-body h3 { font-size: 1.1em; }
    .markdown-body ul, .markdown-body ol {
      margin: 0.4em 0;
      padding-left: 1.5em;
    }
    .markdown-body li { margin: 0.2em 0; }
    .markdown-body li > p { margin: 0; }
    .markdown-body strong { font-weight: 600; }
    .markdown-body code {
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.88em;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      background: var(--bg-surface, rgba(0,0,0,0.06));
      color: var(--accent-primary, #6366f1);
    }
    .markdown-body pre {
      margin: 0.6em 0;
      padding: 14px 16px;
      border-radius: var(--radius-md, 8px);
      background: var(--bg-surface, #1e1e2e);
      overflow-x: auto;
    }
    .markdown-body pre code {
      padding: 0;
      background: none;
      color: var(--text-primary);
      font-size: 0.85em;
      line-height: 1.6;
    }
    .markdown-body blockquote {
      margin: 0.5em 0;
      padding: 0.3em 1em;
      border-left: 3px solid var(--accent-primary, #6366f1);
      color: var(--text-secondary, #888);
      background: var(--bg-surface-subtle, rgba(0,0,0,0.03));
      border-radius: 0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0;
    }
    .markdown-body blockquote p { margin: 0; }
    .markdown-body table {
      border-collapse: collapse;
      margin: 0.6em 0;
      width: 100%;
      font-size: 0.92em;
    }
    .markdown-body th, .markdown-body td {
      padding: 6px 12px;
      border: 1px solid var(--border-light, #333);
      text-align: left;
    }
    .markdown-body th {
      font-weight: 600;
      background: var(--bg-surface-subtle, rgba(0,0,0,0.04));
    }
    .markdown-body hr {
      border: none;
      border-top: 1px solid var(--border-light, #333);
      margin: 1em 0;
    }
    .markdown-body a {
      color: var(--accent-primary, #6366f1);
      text-decoration: none;
    }
    .markdown-body a:hover { text-decoration: underline; }

    /* Streaming cursor — glowing bar with fade pulse */
    .msg-content-text.streaming-cursor::after {
      content: '';
      display: inline-block;
      width: 2.5px;
      height: 1.1em;
      margin-left: 3px;
      vertical-align: text-bottom;
      border-radius: 1px;
      background: var(--accent-orange);
      box-shadow: 0 0 8px rgba(232, 115, 74, 0.5), 0 0 20px rgba(232, 115, 74, 0.2);
      animation: cursorGlow 1s ease-in-out infinite;
    }
    @keyframes cursorGlow {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 8px rgba(232, 115, 74, 0.5), 0 0 20px rgba(232, 115, 74, 0.2);
      }
      50% {
        opacity: 0.4;
        box-shadow: 0 0 4px rgba(232, 115, 74, 0.2), 0 0 8px rgba(232, 115, 74, 0.1);
      }
    }

    /* ── Streaming text fade-in mask ── */
    .msg-content-text.streaming-text {
      -webkit-mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 2.8em),
        rgba(0, 0, 0, 0.45) calc(100% - 1em),
        rgba(0, 0, 0, 0.15) 100%
      );
      mask-image: linear-gradient(
        to bottom,
        black 0%,
        black calc(100% - 2.8em),
        rgba(0, 0, 0, 0.45) calc(100% - 1em),
        rgba(0, 0, 0, 0.15) 100%
      );
      animation: textFadeIn 0.4s ease both;
    }

    .msg-content-text:not(.streaming-text) {
      -webkit-mask-image: none;
      mask-image: none;
      transition: opacity 0.3s ease;
    }

    /* Graph Stats Inline */
    .graph-stats-inline {
      display: flex;
      gap: 16px;
      margin-top: 12px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }
    .gs-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .gs-value {
      font-size: 18px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--accent-primary);
    }
    .gs-label {
      font-size: 11px;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Input Area */
    .chat-input-area {
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border-light);
      background: var(--bg-surface);
    }
    .input-container {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      padding: 12px 16px;
      background: var(--bg-surface-warm);
      border: 1.5px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: border-color 0.25s, box-shadow 0.25s;
    }
    .input-container.input-active {
      border-color: var(--accent-green);
      box-shadow: 0 0 0 3px rgba(74, 93, 79, 0.08);
    }
    .input-container textarea {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      resize: none;
      font-size: 14px;
      font-family: var(--font-sans);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 22px;
      max-height: 120px;
    }
    .input-container textarea::placeholder {
      color: var(--text-tertiary);
    }
    .send-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: var(--accent-orange);
      color: white;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s;
      flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) {
      background: var(--accent-orange-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(232, 115, 74, 0.25);
    }
    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .input-hint {
      margin-top: 8px;
      text-align: center;
      font-size: 11px;
      color: var(--text-tertiary);
    }
    .input-hint kbd {
      display: inline-block;
      padding: 1px 5px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-light);
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 10px;
    }

    /* ═══ Streaming Indicator ═══ */
    .streaming-indicator {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 24px;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-light);
      animation: indicatorSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
      position: relative;
      overflow: hidden;
    }
    .streaming-indicator::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        transparent,
        var(--accent-orange) 20%,
        var(--accent-success) 50%,
        var(--accent-orange) 80%,
        transparent
      );
      background-size: 200% 100%;
      animation: shimmerBar 2s linear infinite;
    }
    @keyframes shimmerBar {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes indicatorSlideUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .streaming-wave {
      display: flex;
      align-items: center;
      gap: 2.5px;
      height: 20px;
    }
    .streaming-wave span {
      width: 3px;
      border-radius: 1.5px;
      background: var(--accent-orange);
      animation: waveBar 1s ease-in-out infinite;
    }
    .streaming-wave span:nth-child(1) { height: 8px; animation-delay: 0s; }
    .streaming-wave span:nth-child(2) { height: 14px; animation-delay: 0.12s; }
    .streaming-wave span:nth-child(3) { height: 18px; animation-delay: 0.24s; }
    .streaming-wave span:nth-child(4) { height: 14px; animation-delay: 0.36s; }
    .streaming-wave span:nth-child(5) { height: 8px; animation-delay: 0.48s; }
    @keyframes waveBar {
      0%, 100% { transform: scaleY(0.5); opacity: 0.4; }
      50% { transform: scaleY(1); opacity: 1; }
    }

    .streaming-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .streaming-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      font-family: var(--font-mono);
      letter-spacing: 0.01em;
    }
    .streaming-sub {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }
    .streaming-elapsed {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      flex-shrink: 0;
      min-width: 32px;
      text-align: right;
    }
    .cancel-btn {
      color: var(--text-tertiary);
    }
    .cancel-btn:hover {
      color: var(--accent-error);
      background: rgba(201, 74, 74, 0.06);
    }

    /* ═══ Error Banner ═══ */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 24px;
      background: rgba(201, 74, 74, 0.04);
      border-top: 1px solid rgba(201, 74, 74, 0.12);
      font-size: 13px;
      color: var(--accent-error);
      animation: slideDown 0.3s ease both;
    }
    .error-banner span {
      flex: 1;
    }

    /* ═══ State Panel ═══ */
    .state-panel {
      width: 300px;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex-shrink: 0;
      animation: panelSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-light);
    }
    .panel-header h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }
    .panel-section {
      padding: 20px;
      border-bottom: 1px solid var(--border-light);
    }
    .panel-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-tertiary);
      margin-bottom: 12px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .stat-card {
      padding: 12px;
      background: var(--bg-surface-warm);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sc-value {
      font-size: 20px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--accent-primary);
    }
    .sc-label {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    /* ── Active Agent Card ── */
    .active-agent-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: linear-gradient(135deg, rgba(61, 139, 86, 0.06), rgba(74, 93, 79, 0.04));
      border: 1px solid rgba(61, 139, 86, 0.12);
      border-radius: var(--radius-sm);
      animation: fadeIn 0.3s ease both;
    }
    .active-agent-orb {
      width: 32px;
      height: 32px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .orb-ring {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(61, 139, 86, 0.25);
      border-top-color: var(--accent-success);
      border-radius: 50%;
      animation: spin 1.2s linear infinite;
    }
    .orb-core {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: pulse-glow 2s infinite;
    }
    .active-agent-info {
      flex: 1;
      min-width: 0;
    }
    .active-agent-name {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .active-agent-desc {
      display: block;
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    /* ── Panel Tool List ── */
    .panel-tool-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 10px;
    }
    .panel-tool-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: var(--radius-xs);
      font-size: 12px;
      animation: toolSlideIn 0.2s ease both;
    }
    .panel-tool-item.panel-tool-calling {
      background: rgba(232, 115, 74, 0.04);
    }
    .panel-tool-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-calling {
      background: var(--accent-orange);
      animation: pulse-glow 1.5s infinite;
    }
    .dot-done {
      background: var(--accent-success);
    }
    .panel-tool-name {
      flex: 1;
      font-family: var(--font-mono);
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .panel-tool-dur {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }

    .no-agent-idle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      background: var(--bg-surface-warm);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--text-tertiary);
    }
    .idle-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green-muted);
    }

    /* ── Pipeline Track (vertical) ── */
    .pipeline-track {
      display: flex;
      flex-direction: column;
      padding-left: 4px;
    }
    .pipeline-node {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0;
    }
    .pipeline-node-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .node-completed .pipeline-node-dot {
      background: var(--accent-success);
      color: white;
    }
    .node-running .pipeline-node-dot {
      background: transparent;
      border: 2px solid var(--accent-orange);
    }
    .node-pending .pipeline-node-dot {
      background: var(--bg-surface-subtle);
      border: 1.5px solid var(--border-medium);
    }
    .node-spinner {
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(232, 115, 74, 0.25);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .pipeline-node-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      flex: 1;
    }
    .node-completed .pipeline-node-label {
      color: var(--text-primary);
    }
    .node-running .pipeline-node-label {
      color: var(--accent-orange);
      font-weight: 600;
    }
    .pipeline-node-dur {
      font-size: 10px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }
    .pipeline-connector {
      width: 2px;
      height: 12px;
      margin-left: 8px;
      background: var(--border-medium);
      border-radius: 1px;
      transition: background 0.3s;
    }
    .connector-done {
      background: var(--accent-success);
    }

    .entity-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .entity-tag {
      padding: 4px 12px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    /* ═══ Animations ═══ */
    @keyframes msgSlideIn {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes toolSlideIn {
      from {
        opacity: 0;
        transform: translateX(-8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes checkPop {
      from {
        opacity: 0;
        transform: scale(0.5);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes badgeFadeIn {
      from {
        opacity: 0;
        transform: translateX(-6px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes subtlePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes panelSlideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes tlRowIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes tlCorePulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(232, 115, 74, 0.4);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.2);
        box-shadow: 0 0 0 4px rgba(232, 115, 74, 0);
      }
    }

    @keyframes tlNodePop {
      from {
        opacity: 0;
        transform: scale(0.4);
      }
      60% {
        transform: scale(1.15);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes textFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ═══ Responsive ═══ */
    @media (max-width: 1024px) {
      .state-panel { display: none; }
    }
    @media (max-width: 768px) {
      .sidebar { display: none; }
      .chat-topbar { padding: 12px 16px; }
      .chat-messages { padding: 16px; }
      .chat-input-area { padding: 12px 16px 16px; }
    }
  `]
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

}
