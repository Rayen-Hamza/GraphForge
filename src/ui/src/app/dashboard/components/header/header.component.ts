import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="header-container">
      <div class="brand">
        <div class="logo-box">GF</div>
        <div class="brand-text">
          <h1>GraphForge</h1>
          <span class="badge">v2.0</span>
        </div>
      </div>
      
      <div class="system-pill">
        <span class="dot"></span>
        <span class="pill-text">System Optimal</span>
      </div>

      <div class="controls">
        <button class="btn-icon" aria-label="Settings">
          <mat-icon>settings</mat-icon>
        </button>
        <button class="btn-icon" aria-label="Notifications">
           <mat-icon>notifications</mat-icon>
        </button>
        <button class="btn-icon" aria-label="User">
          <div class="avatar">AS</div>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .header-container {
      height: 72px;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-box {
      width: 36px; height: 36px;
      background: var(--accent-primary);
      color: white;
      border-radius: 8px;
      display: grid; place-items: center;
      font-weight: 700; font-size: 14px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .brand-text h1 {
      margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
    }
    .brand-text { display: flex; align-items: baseline; gap: 8px; }
    .badge {
      font-size: 11px; color: var(--text-secondary); background: var(--bg-app);
      padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);
    }
    .system-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      padding: 6px 16px;
      border-radius: 20px;
      display: flex; align-items: center; gap: 8px;
      box-shadow: var(--shadow-sm);
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-success);
      animation: pulse-glow 2s infinite;
    }
    .pill-text { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
    .controls { display: flex; gap: 12px; }
    .btn-icon {
      width: 40px; height: 40px; border: none; background: transparent;
      border-radius: 8px; cursor: pointer; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-icon:hover { background: var(--bg-app); color: var(--text-primary); }
    .avatar {
      width: 32px; height: 32px; background-color: #E2E8F0;
      border-radius: 50%; font-size: 12px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-primary);
    }
  `]
})
export class HeaderComponent {}
