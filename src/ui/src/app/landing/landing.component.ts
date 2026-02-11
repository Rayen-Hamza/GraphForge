import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <!-- ═══ HERO SECTION ═══ -->
    <section class="hero">
      <div class="hero-bg">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
        <div class="grain-overlay"></div>
      </div>

      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          <span>Multi-Agent Intelligence Platform</span>
        </div>

        <h1 class="hero-title">
          Transform intent into<br>
          <em>knowledge</em>, automatically.
        </h1>

        <p class="hero-subtitle">
          GraphForge orchestrates intelligent agents to understand your intent,
          extract insights, and construct rich knowledge graphs — all in real time.
        </p>

        <div class="hero-actions">
          <a routerLink="/chat" class="btn-primary">
            Start Building
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.75 9h10.5m0 0L10.5 5.25m3.75 3.75L10.5 12.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="#features" class="btn-secondary">
            Explore Features
          </a>
        </div>

        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-value">5+</span>
            <span class="stat-label">Specialized Agents</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">Real-time</span>
            <span class="stat-label">Graph Construction</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">∞</span>
            <span class="stat-label">Knowledge Depth</span>
          </div>
        </div>
      </div>

      <!-- Floating Preview Card -->
      <div class="hero-preview">
        <div class="preview-card">
          <div class="preview-topbar">
            <div class="preview-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="preview-title">GraphForge Agent Console</span>
            <div class="preview-badge-live">
              <span class="live-dot"></span> Live
            </div>
          </div>
          <div class="preview-body">
            <div class="preview-msg user-msg">
              <div class="msg-avatar user-avatar">U</div>
              <div class="msg-content">
                <div class="msg-text">Map the relationships between renewable energy technologies and their environmental impacts</div>
              </div>
            </div>
            <div class="preview-msg agent-msg">
              <div class="msg-avatar agent-avatar">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="2" fill="currentColor"/>
                  <circle cx="7" cy="2" r="1" fill="currentColor" opacity="0.6"/>
                  <circle cx="7" cy="12" r="1" fill="currentColor" opacity="0.6"/>
                  <circle cx="2" cy="7" r="1" fill="currentColor" opacity="0.6"/>
                  <circle cx="12" cy="7" r="1" fill="currentColor" opacity="0.6"/>
                </svg>
              </div>
              <div class="msg-content">
                <div class="agent-steps">
                  <div class="step-item completed">
                    <span class="step-icon">✓</span>
                    <span class="step-text">Intent parsed — domain: Energy & Environment</span>
                  </div>
                  <div class="step-item completed">
                    <span class="step-icon">✓</span>
                    <span class="step-text">Research agent: 24 sources analyzed</span>
                  </div>
                  <div class="step-item active">
                    <span class="step-icon spinning">◐</span>
                    <span class="step-text">Building knowledge graph — 47 nodes, 83 edges...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ FEATURES SECTION ═══ -->
    <section class="features" id="features">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Capabilities</span>
          <h2 class="section-title">Intelligence at every layer</h2>
          <p class="section-subtitle">
            From understanding your query to constructing structured knowledge — every step is powered by specialized agents.
          </p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" stroke-linecap="round"/>
                <path d="M8 14s-4 2-4 6h16c0-4-4-6-4-6" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h3>Intent Understanding</h3>
            <p>Natural language parsing that deconstructs complex queries into actionable research directives for specialized agents.</p>
          </div>

          <div class="feature-card featured">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="4" cy="6" r="2"/>
                <circle cx="20" cy="6" r="2"/>
                <circle cx="4" cy="18" r="2"/>
                <circle cx="20" cy="18" r="2"/>
                <line x1="9.5" y1="10.5" x2="5.5" y2="7.5"/>
                <line x1="14.5" y1="10.5" x2="18.5" y2="7.5"/>
                <line x1="9.5" y1="13.5" x2="5.5" y2="16.5"/>
                <line x1="14.5" y1="13.5" x2="18.5" y2="16.5"/>
              </svg>
            </div>
            <h3>Multi-Agent Orchestration</h3>
            <p>A coordinated pipeline of research, extraction, validation, and construction agents — each specialized for maximum accuracy.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12,2 20,7 20,17 12,22 4,17 4,7" stroke-linejoin="round"/>
                <line x1="12" y1="2" x2="12" y2="22"/>
                <line x1="4" y1="7" x2="20" y2="17"/>
                <line x1="20" y1="7" x2="4" y2="17"/>
              </svg>
            </div>
            <h3>Knowledge Graph Output</h3>
            <p>Structured, queryable knowledge graphs with entities, relationships, and metadata — ready for downstream applications.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2 12h4l3-9 6 18 3-9h4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3>Real-time Streaming</h3>
            <p>Watch agents think, decide, and build in real time. Every step, tool call, and decision is streamed to your interface live.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                <line x1="10" y1="6.5" x2="14" y2="6.5"/>
                <line x1="6.5" y1="10" x2="6.5" y2="14"/>
              </svg>
            </div>
            <h3>Modular Architecture</h3>
            <p>Plug in custom agents, data sources, and output formats. Built for extensibility from the ground up.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h3>Execution History</h3>
            <p>Full audit trail of every agent decision, with the ability to replay, branch, and refine knowledge construction workflows.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ HOW IT WORKS ═══ -->
    <section class="how-it-works" id="how-it-works">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">Process</span>
          <h2 class="section-title">From question to knowledge</h2>
          <p class="section-subtitle">
            Three intelligent phases transform natural language into structured understanding.
          </p>
        </div>

        <div class="pipeline">
          <div class="pipeline-step">
            <div class="step-number">01</div>
            <div class="step-connector"></div>
            <div class="step-card">
              <h3>Describe Your Intent</h3>
              <p>Tell GraphForge what you want to explore. Use natural language — be as broad or specific as you like.</p>
              <div class="step-example">
                <code>"How do machine learning algorithms relate to cognitive science research?"</code>
              </div>
            </div>
          </div>

          <div class="pipeline-step">
            <div class="step-number">02</div>
            <div class="step-connector"></div>
            <div class="step-card">
              <h3>Agents Orchestrate</h3>
              <p>Specialized agents decompose your query, research domains, extract entities, and validate relationships in parallel.</p>
              <div class="step-agents">
                <span class="agent-pill"><mat-icon class="pill-icon">search</mat-icon> Research</span>
                <span class="agent-pill"><mat-icon class="pill-icon">extension</mat-icon> Extract</span>
                <span class="agent-pill"><mat-icon class="pill-icon">verified</mat-icon> Validate</span>
                <span class="agent-pill"><mat-icon class="pill-icon">link</mat-icon> Link</span>
              </div>
            </div>
          </div>

          <div class="pipeline-step">
            <div class="step-number">03</div>
            <div class="step-card">
              <h3>Knowledge Graph Built</h3>
              <p>A rich, structured knowledge graph emerges — complete with entities, typed relationships, confidence scores, and source attribution.</p>
              <div class="step-graph-preview">
                <div class="mini-node n1">ML</div>
                <div class="mini-node n2">NLP</div>
                <div class="mini-node n3">Cognition</div>
                <div class="mini-node n4">Neuroscience</div>
                <svg class="mini-edges" viewBox="0 0 200 80">
                  <line x1="40" y1="30" x2="100" y2="20" stroke="var(--accent-green-light)" stroke-width="1.5" opacity="0.6"/>
                  <line x1="100" y1="20" x2="160" y2="35" stroke="var(--accent-green-light)" stroke-width="1.5" opacity="0.6"/>
                  <line x1="40" y1="30" x2="100" y2="60" stroke="var(--accent-green-light)" stroke-width="1.5" opacity="0.4"/>
                  <line x1="100" y1="60" x2="160" y2="35" stroke="var(--accent-green-light)" stroke-width="1.5" opacity="0.4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ CTA SECTION ═══ -->
    <section class="cta-section">
      <div class="section-container">
        <div class="cta-card">
          <div class="cta-bg-pattern"></div>
          <h2>Ready to forge your knowledge graph?</h2>
          <p>Start a conversation with GraphForge's multi-agent system and watch intelligence unfold in real time.</p>
          <a routerLink="/chat" class="btn-primary btn-lg">
            Launch GraphForge
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3.75 9h10.5m0 0L10.5 5.25m3.75 3.75L10.5 12.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ FOOTER ═══ -->
    <footer class="footer">
      <div class="section-container">
        <div class="footer-inner">
          <div class="footer-brand">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="currentColor"/>
              <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="14" cy="24" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="4" cy="14" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="24" cy="14" r="2" fill="currentColor" opacity="0.7"/>
            </svg>
            <span>GraphForge</span>
          </div>
          <div class="footer-links">
            <a href="#">Documentation</a>
            <a href="#">GitHub</a>
            <a href="#">API Reference</a>
          </div>
          <p class="footer-copy">© 2026 GraphForge. Intelligent knowledge construction.</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    /* ── Hero ────────────────────────────────── */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 120px 24px 80px;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }
    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
    }
    .orb-1 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(139, 157, 131, 0.25) 0%, transparent 70%);
      top: -10%; left: -5%;
      animation: float 8s ease-in-out infinite;
    }
    .orb-2 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(212, 221, 208, 0.35) 0%, transparent 70%);
      top: 20%; right: -10%;
      animation: float 10s ease-in-out infinite reverse;
    }
    .orb-3 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(232, 115, 74, 0.08) 0%, transparent 70%);
      bottom: 10%; left: 30%;
      animation: float 12s ease-in-out infinite;
    }
    .grain-overlay {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      text-align: center;
      max-width: 740px;
      animation: fadeInUp 0.8s ease both;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 32px;
    }
    .badge-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: pulse-glow 2s infinite;
    }

    .hero-title {
      font-family: var(--font-serif);
      font-size: clamp(42px, 6vw, 72px);
      font-weight: 400;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin: 0 0 24px;
    }
    .hero-title em {
      font-style: italic;
      color: var(--accent-green);
    }

    .hero-subtitle {
      font-size: 18px;
      line-height: 1.7;
      color: var(--text-secondary);
      max-width: 560px;
      margin: 0 auto 40px;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 64px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 30px;
      background: var(--accent-orange);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(232, 115, 74, 0.3);
    }
    .btn-primary:hover {
      background: var(--accent-orange-hover);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(232, 115, 74, 0.4);
    }
    .btn-primary svg {
      transition: transform 0.25s ease;
    }
    .btn-primary:hover svg {
      transform: translateX(3px);
    }
    .btn-secondary {
      padding: 14px 30px;
      background: transparent;
      color: var(--text-primary);
      border: 1.5px solid var(--border-medium);
      border-radius: var(--radius-full);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }
    .btn-secondary:hover {
      border-color: var(--text-primary);
      background: rgba(26, 47, 30, 0.03);
    }

    .hero-stats {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .stat-value {
      font-family: var(--font-serif);
      font-size: 24px;
      color: var(--text-primary);
    }
    .stat-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .stat-divider {
      width: 1px;
      height: 36px;
      background: var(--border-light);
    }

    /* Hero Preview */
    .hero-preview {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 680px;
      margin-top: 60px;
      animation: fadeInUp 0.8s ease 0.3s both;
    }
    .preview-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-float);
    }
    .preview-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-light);
      background: rgba(245, 241, 235, 0.5);
    }
    .preview-dots {
      display: flex;
      gap: 6px;
    }
    .preview-dots span {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: var(--accent-green-muted);
    }
    .preview-dots span:first-child { background: #E8A0A0; }
    .preview-dots span:nth-child(2) { background: #E8D4A0; }
    .preview-dots span:last-child { background: #A0D4A8; }
    .preview-title {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-tertiary);
      font-family: var(--font-mono);
    }
    .preview-badge-live {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-success);
    }
    .live-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent-success);
      animation: pulse-glow 2s infinite;
    }

    .preview-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .preview-msg {
      display: flex;
      gap: 12px;
    }
    .msg-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .user-avatar {
      background: var(--accent-green-muted);
      color: var(--accent-green);
    }
    .agent-avatar {
      background: var(--accent-primary);
      color: white;
    }
    .msg-text {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
      padding: 12px 16px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-md);
    }

    .agent-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-surface-warm);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
    .step-item.completed {
      color: var(--accent-success);
    }
    .step-item.active {
      color: var(--accent-orange);
    }
    .step-icon {
      font-size: 12px;
      width: 18px;
      text-align: center;
    }
    .step-icon.spinning {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    /* ── Features ────────────────────────────── */
    .features {
      padding: 120px 24px;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-light);
    }
    .section-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .section-header {
      text-align: center;
      margin-bottom: 64px;
    }
    .section-tag {
      display: inline-block;
      padding: 6px 16px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-green);
      margin-bottom: 20px;
    }
    .section-title {
      font-family: var(--font-serif);
      font-size: clamp(32px, 4vw, 48px);
      font-weight: 400;
      line-height: 1.15;
      color: var(--text-primary);
      margin: 0 0 16px;
    }
    .section-subtitle {
      font-size: 17px;
      line-height: 1.7;
      color: var(--text-secondary);
      max-width: 520px;
      margin: 0 auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .feature-card {
      padding: 32px;
      background: var(--bg-surface-warm);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .feature-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }
    .feature-card.featured {
      background: var(--accent-primary);
      border-color: transparent;
      color: var(--text-inverse);
    }
    .feature-card.featured h3 { color: white; }
    .feature-card.featured p { color: rgba(255,255,255,0.75); }
    .feature-card.featured .feature-icon-wrap {
      background: rgba(255,255,255,0.12);
      color: white;
    }

    .feature-icon-wrap {
      width: 48px; height: 48px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--accent-green);
    }
    .feature-card h3 {
      font-size: 17px;
      font-weight: 600;
      margin: 0 0 10px;
      letter-spacing: -0.01em;
    }
    .feature-card p {
      font-size: 14px;
      line-height: 1.65;
      color: var(--text-secondary);
      margin: 0;
    }

    /* ── How It Works ────────────────────────── */
    .how-it-works {
      padding: 120px 24px;
      background: var(--bg-app);
    }
    .pipeline {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 640px;
      margin: 0 auto;
    }
    .pipeline-step {
      display: flex;
      gap: 24px;
      position: relative;
    }
    .step-number {
      font-family: var(--font-serif);
      font-size: 36px;
      color: var(--accent-green-muted);
      line-height: 1;
      width: 50px;
      flex-shrink: 0;
      padding-top: 8px;
    }
    .step-connector {
      position: absolute;
      left: 24px;
      top: 56px;
      bottom: -8px;
      width: 2px;
      background: linear-gradient(to bottom, var(--accent-green-muted), transparent);
    }
    .step-card {
      flex: 1;
      padding: 28px;
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      margin-bottom: 24px;
      transition: all 0.3s ease;
    }
    .step-card:hover {
      box-shadow: var(--shadow-md);
    }
    .step-card h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px;
      letter-spacing: -0.01em;
    }
    .step-card p {
      font-size: 14px;
      line-height: 1.65;
      color: var(--text-secondary);
      margin: 0;
    }
    .step-example {
      margin-top: 16px;
      padding: 14px 18px;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-sm);
    }
    .step-example code {
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--accent-green);
      line-height: 1.6;
    }
    .step-agents {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .agent-pill {
      padding: 6px 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .pill-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--accent-green);
    }
    .step-graph-preview {
      position: relative;
      height: 80px;
      margin-top: 16px;
    }
    .mini-node {
      position: absolute;
      padding: 4px 12px;
      background: var(--accent-primary);
      color: white;
      border-radius: var(--radius-full);
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-mono);
    }
    .mini-node.n1 { left: 5%; top: 25%; }
    .mini-node.n2 { left: 38%; top: 5%; }
    .mini-node.n3 { left: 62%; top: 45%; }
    .mini-node.n4 { left: 85%; top: 15%; }
    .mini-edges {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    /* ── CTA ─────────────────────────────────── */
    .cta-section {
      padding: 40px 24px 120px;
      background: var(--bg-app);
    }
    .cta-card {
      position: relative;
      text-align: center;
      padding: 80px 40px;
      background: var(--accent-primary);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .cta-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 20% 50%, rgba(139, 157, 131, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 30%, rgba(232, 115, 74, 0.1) 0%, transparent 50%);
    }
    .cta-card h2 {
      position: relative;
      font-family: var(--font-serif);
      font-size: clamp(28px, 3.5vw, 40px);
      color: white;
      margin: 0 0 16px;
      font-weight: 400;
    }
    .cta-card p {
      position: relative;
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
      max-width: 480px;
      margin: 0 auto 32px;
      line-height: 1.65;
    }
    .btn-lg {
      position: relative;
      padding: 16px 36px;
      font-size: 16px;
    }

    /* ── Footer ──────────────────────────────── */
    .footer {
      padding: 40px 24px;
      background: var(--bg-app);
      border-top: 1px solid var(--border-light);
    }
    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 15px;
      color: var(--text-primary);
    }
    .footer-links {
      display: flex;
      gap: 24px;
    }
    .footer-links a {
      font-size: 13px;
      color: var(--text-secondary);
      transition: color 0.2s;
    }
    .footer-links a:hover {
      color: var(--text-primary);
    }
    .footer-copy {
      font-size: 12px;
      color: var(--text-tertiary);
      margin: 0;
    }

    /* ── Responsive ──────────────────────────── */
    @media (max-width: 900px) {
      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .hero { padding: 100px 20px 60px; }
      .hero-actions { flex-direction: column; width: 100%; }
      .btn-primary, .btn-secondary { width: 100%; justify-content: center; }
      .hero-stats { flex-direction: column; gap: 16px; }
      .stat-divider { width: 40px; height: 1px; }
      .features-grid { grid-template-columns: 1fr; }
      .pipeline-step { flex-direction: column; gap: 12px; }
      .step-connector { display: none; }
      .step-number { width: auto; }
      .footer-inner { flex-direction: column; text-align: center; }
      .footer-links { justify-content: center; }
    }
  `]
})
export class LandingComponent { }
