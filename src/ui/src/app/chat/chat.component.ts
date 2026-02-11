import { Component, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AgentStep {
    agent: string;
    status: 'completed' | 'running' | 'pending';
    description: string;
    duration?: string;
    tool?: string;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    agentSteps?: AgentStep[];
    graphStats?: { nodes: number; edges: number; clusters: number };
}

interface Conversation {
    id: number;
    title: string;
    preview: string;
    timestamp: string;
    active: boolean;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
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

        <div class="chat-messages" #messagesContainer>
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
                  <span class="msg-timestamp">{{ msg.timestamp }}</span>
                </div>
                <div class="msg-content-text">{{ msg.content }}</div>

                @if (msg.agentSteps) {
                  <div class="agent-steps-card">
                    <div class="steps-header">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8h12M8 2v12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/>
                        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>
                      </svg>
                      <span>Agent Pipeline</span>
                    </div>
                    @for (step of msg.agentSteps; track step.agent) {
                      <div class="step-row" [class.step-completed]="step.status === 'completed'"
                                            [class.step-running]="step.status === 'running'"
                                            [class.step-pending]="step.status === 'pending'">
                        <div class="step-status-icon">
                          @if (step.status === 'completed') {
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="6" fill="var(--accent-success)" opacity="0.15"/>
                              <path d="M4 7l2 2 4-4" stroke="var(--accent-success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          } @else if (step.status === 'running') {
                            <div class="spinner"></div>
                          } @else {
                            <div class="pending-dot"></div>
                          }
                        </div>
                        <div class="step-info">
                          <div class="step-agent-name">{{ step.agent }}</div>
                          <div class="step-desc">{{ step.description }}</div>
                        </div>
                        @if (step.tool) {
                          <span class="step-tool">{{ step.tool }}</span>
                        }
                        @if (step.duration) {
                          <span class="step-duration">{{ step.duration }}</span>
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

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-container">
            <textarea
              #inputBox
              placeholder="Describe what you want to explore..."
              [(ngModel)]="inputText"
              (keydown.enter)="onEnter($event)"
              rows="1"
            ></textarea>
            <button class="send-btn" [disabled]="!inputText.trim()" (click)="sendMessage()">
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
                <span class="sc-value">{{ currentGraphStats().confidence }}%</span>
                <span class="sc-label">Confidence</span>
              </div>
            </div>
          </div>

          <!-- Agent Pipeline -->
          <div class="panel-section">
            <div class="panel-section-title">Agent Pipeline</div>
            <div class="pipeline-list">
              @for (agent of agentPipeline(); track agent.name) {
                <div class="agent-row" [class]="'agent-' + agent.status">
                  <div class="agent-status-dot" [class]="'dot-' + agent.status"></div>
                  <div class="agent-info">
                    <span class="agent-name">{{ agent.name }}</span>
                    <span class="agent-desc">{{ agent.statusText }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Recent Entities -->
          <div class="panel-section">
            <div class="panel-section-title">Recent Entities</div>
            <div class="entity-tags">
              @for (entity of recentEntities; track entity) {
                <span class="entity-tag">{{ entity }}</span>
              }
            </div>
          </div>

          <!-- Mini Graph Visualization -->
          <div class="panel-section">
            <div class="panel-section-title">Graph Topology</div>
            <div class="mini-graph">
              <svg viewBox="0 0 220 160" fill="none">
                <!-- Edges -->
                <line x1="110" y1="40" x2="50" y2="80" stroke="var(--accent-green-muted)" stroke-width="1.5"/>
                <line x1="110" y1="40" x2="170" y2="70" stroke="var(--accent-green-muted)" stroke-width="1.5"/>
                <line x1="50" y1="80" x2="80" y2="130" stroke="var(--accent-green-muted)" stroke-width="1"/>
                <line x1="170" y1="70" x2="140" y2="120" stroke="var(--accent-green-muted)" stroke-width="1"/>
                <line x1="50" y1="80" x2="140" y2="120" stroke="var(--accent-green-muted)" stroke-width="0.8" opacity="0.5"/>
                <line x1="110" y1="40" x2="80" y2="130" stroke="var(--accent-green-muted)" stroke-width="0.8" opacity="0.4"/>
                <line x1="170" y1="70" x2="30" y2="130" stroke="var(--accent-green-muted)" stroke-width="0.6" opacity="0.3"/>

                <!-- Nodes -->
                <circle cx="110" cy="40" r="12" fill="var(--accent-primary)"/>
                <text x="110" y="44" text-anchor="middle" fill="white" font-size="8" font-weight="600" font-family="var(--font-mono)">ML</text>

                <circle cx="50" cy="80" r="10" fill="var(--accent-green)"/>
                <text x="50" y="84" text-anchor="middle" fill="white" font-size="7" font-weight="600" font-family="var(--font-mono)">NLP</text>

                <circle cx="170" cy="70" r="10" fill="var(--accent-green)"/>
                <text x="170" y="74" text-anchor="middle" fill="white" font-size="7" font-weight="600" font-family="var(--font-mono)">CV</text>

                <circle cx="80" cy="130" r="8" fill="var(--accent-green-light)"/>
                <text x="80" y="133" text-anchor="middle" fill="white" font-size="6" font-weight="600" font-family="var(--font-mono)">LLM</text>

                <circle cx="140" cy="120" r="8" fill="var(--accent-green-light)"/>
                <text x="140" y="123" text-anchor="middle" fill="white" font-size="6" font-weight="600" font-family="var(--font-mono)">GNN</text>

                <circle cx="30" cy="130" r="6" fill="var(--accent-green-muted)"/>
                <circle cx="190" cy="120" r="5" fill="var(--accent-green-muted)"/>
              </svg>
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
    }

    .message {
      display: flex;
      gap: 14px;
      margin-bottom: 24px;
      animation: fadeInUp 0.4s ease both;
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
    .msg-content-text {
      font-size: 14.5px;
      line-height: 1.7;
      color: var(--text-primary);
    }

    /* Agent Steps Card */
    .agent-steps-card {
      margin-top: 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .steps-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-light);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-tertiary);
    }
    .step-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-light);
      transition: background 0.2s;
    }
    .step-row:last-child {
      border-bottom: none;
    }
    .step-row:hover {
      background: var(--bg-surface-warm);
    }
    .step-status-icon {
      width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--accent-green-muted);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .pending-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-green-muted);
    }
    .step-info {
      flex: 1;
      min-width: 0;
    }
    .step-agent-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .step-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }
    .step-tool {
      font-size: 11px;
      padding: 2px 8px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-xs);
      color: var(--accent-green);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
    .step-duration {
      font-size: 11px;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
      flex-shrink: 0;
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
      transition: border-color 0.2s;
    }
    .input-container:focus-within {
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

    /* ═══ State Panel ═══ */
    .state-panel {
      width: 300px;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex-shrink: 0;
      animation: fadeIn 0.3s ease both;
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

    .pipeline-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .agent-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      transition: background 0.2s;
    }
    .agent-row:hover {
      background: var(--bg-surface-warm);
    }
    .agent-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-completed { background: var(--accent-success); }
    .dot-running {
      background: var(--accent-orange);
      animation: pulse-glow 1.5s infinite;
    }
    .dot-idle { background: var(--accent-green-muted); }
    .dot-pending { background: var(--accent-green-muted); }
    .agent-name {
      font-size: 13px;
      font-weight: 600;
    }
    .agent-desc {
      font-size: 11px;
      color: var(--text-tertiary);
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

    .mini-graph {
      padding: 12px;
      background: var(--bg-surface-warm);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }
    .mini-graph svg {
      width: 100%;
      height: auto;
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
    sidebarCollapsed = signal(false);
    statePanelOpen = signal(true);
    inputText = '';
    searchQuery = '';

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    suggestions = [
        'Map AI research to cognitive science',
        'Explore renewable energy supply chains',
        'Connect programming paradigms to math theories',
        'Trace the evolution of neural architectures',
    ];

    conversations = signal<Conversation[]>([
        { id: 1, title: 'Renewable Energy Technologies', preview: '47 nodes, 83 edges constructed', timestamp: '2m', active: true },
        { id: 2, title: 'ML & Cognitive Science', preview: 'Research phase complete', timestamp: '1h', active: false },
        { id: 3, title: 'Programming Paradigms', preview: '12 entities extracted', timestamp: '3h', active: false },
        { id: 4, title: 'Neural Architecture History', preview: 'Intent parsed', timestamp: '1d', active: false },
    ]);

    messages = signal<ChatMessage[]>([
        {
            id: 1,
            role: 'user',
            content: 'Map the relationships between renewable energy technologies and their environmental impacts across different deployment regions.',
            timestamp: '10:42 AM'
        },
        {
            id: 2,
            role: 'assistant',
            content: 'I\'ll construct a knowledge graph mapping renewable energy technologies to their environmental impacts. Let me orchestrate the agent pipeline for this analysis.',
            timestamp: '10:42 AM',
            agentSteps: [
                { agent: 'Intent Analyzer', status: 'completed', description: 'Parsed domain: Energy & Environment, scope: global regions', duration: '0.8s' },
                { agent: 'Research Agent', status: 'completed', description: 'Analyzed 24 sources across academic papers and policy documents', duration: '3.2s', tool: 'web_search' },
                { agent: 'Entity Extractor', status: 'completed', description: 'Extracted 47 unique entities: technologies, impacts, regions', duration: '2.1s', tool: 'ner_pipeline' },
                { agent: 'Relationship Builder', status: 'running', description: 'Constructing typed edges between entities...', tool: 'graph_builder' },
                { agent: 'Validator', status: 'pending', description: 'Awaiting relationship construction' },
            ],
            graphStats: { nodes: 47, edges: 83, clusters: 6 }
        },
        {
            id: 3,
            role: 'user',
            content: 'Can you focus specifically on solar and wind energy? I want to understand their comparative lifecycle impacts.',
            timestamp: '10:45 AM'
        },
        {
            id: 4,
            role: 'assistant',
            content: 'Narrowing the graph construction to solar and wind energy lifecycle analysis. I\'m re-routing the research agent to focus on comparative lifecycle assessment studies.',
            timestamp: '10:45 AM',
            agentSteps: [
                { agent: 'Intent Refiner', status: 'completed', description: 'Scope refined: solar vs wind, lifecycle analysis focus', duration: '0.4s' },
                { agent: 'Research Agent', status: 'completed', description: 'Found 18 lifecycle assessment studies for solar/wind', duration: '2.8s', tool: 'academic_search' },
                { agent: 'Entity Extractor', status: 'running', description: 'Extracting lifecycle phases, environmental metrics...', tool: 'ner_pipeline' },
                { agent: 'Graph Merger', status: 'pending', description: 'Will merge with existing graph' },
            ]
        }
    ]);

    currentGraphStats = signal({
        nodes: 47,
        edges: 83,
        clusters: 6,
        confidence: 87
    });

    agentPipeline = signal([
        { name: 'Intent Analyzer', status: 'completed', statusText: 'Done — 2 intents parsed' },
        { name: 'Research Agent', status: 'completed', statusText: 'Done — 42 sources' },
        { name: 'Entity Extractor', status: 'running', statusText: 'Processing batch 3/4...' },
        { name: 'Relationship Builder', status: 'pending', statusText: 'Waiting for entities' },
        { name: 'Validator', status: 'idle', statusText: 'Idle' },
        { name: 'Graph Compiler', status: 'idle', statusText: 'Idle' },
    ]);

    recentEntities = [
        'Solar PV', 'Wind Turbine', 'CO₂ Emissions',
        'Land Use', 'Lifecycle', 'EROI',
        'Offshore', 'Grid Parity', 'Recycling'
    ];

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

    selectConversation(id: number) {
        this.conversations.update(convs =>
            convs.map(c => ({ ...c, active: c.id === id }))
        );
    }

    startNewChat() {
        this.messages.set([]);
        this.conversations.update(convs =>
            convs.map(c => ({ ...c, active: false }))
        );
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
        if (!text) return;

        const newMsg: ChatMessage = {
            id: this.messages().length + 1,
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.messages.update(msgs => [...msgs, newMsg]);
        this.inputText = '';

        // Simulate agent response after a short delay
        setTimeout(() => {
            const agentMsg: ChatMessage = {
                id: this.messages().length + 1,
                role: 'assistant',
                content: 'Processing your request through the multi-agent pipeline. I\'ll analyze the domain and begin knowledge extraction.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                agentSteps: [
                    { agent: 'Intent Analyzer', status: 'completed', description: 'Query parsed and decomposed', duration: '0.5s' },
                    { agent: 'Research Agent', status: 'running', description: 'Searching knowledge bases...', tool: 'web_search' },
                    { agent: 'Entity Extractor', status: 'pending', description: 'Awaiting research results' },
                ]
            };
            this.messages.update(msgs => [...msgs, agentMsg]);
        }, 800);
    }
}
