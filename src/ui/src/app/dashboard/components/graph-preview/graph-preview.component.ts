import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-graph-view',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="graph-panel">
      <div class="panel-header">
        <h3>Knowledge Graph</h3>
        <button class="expand-btn">
          <mat-icon>open_in_full</mat-icon>
        </button>
      </div>
      <div class="viz-area">
        <svg width="100%" height="100%" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- Edges -->
          <line x1="300" y1="200" x2="450" y2="100" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
          <line x1="300" y1="200" x2="150" y2="300" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
          <line x1="300" y1="200" x2="100" y2="100" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
          <line x1="450" y1="100" x2="550" y2="150" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
          
          <!-- Nodes -->
          <g class="node-g" transform="translate(300, 200)">
            <circle r="30" fill="url(#grad1)" filter="url(#glow)" class="core-node" />
            <text dy="5" text-anchor="middle" fill="white" font-size="10" font-family="Manrope">ROOT</text>
          </g>
          
          <g class="node-g" transform="translate(450, 100)">
            <circle r="15" fill="#3B82F6" opacity="0.8" />
            <text dy="25" text-anchor="middle" fill="#64748B" font-size="10">Entity</text>
          </g>
          <g class="node-g" transform="translate(150, 300)">
            <circle r="20" fill="#8B5CF6" opacity="0.8" />
             <text dy="30" text-anchor="middle" fill="#64748B" font-size="10">Person</text>
          </g>
          <g class="node-g" transform="translate(100, 100)">
            <circle r="12" fill="#10B981" opacity="0.8" />
          </g>
          
          <!-- Gradient -->
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:rgb(15, 23, 42);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(59, 130, 246);stop-opacity:1" />
          </radialGradient>
        </svg>
      </div>
      <div class="stats-bar">
        <div class="stat"><span class="val">1,240</span> <span class="lbl">Nodes</span></div>
        <div class="stat"><span class="val">3,892</span> <span class="lbl">Edges</span></div>
      </div>
    </div>
  `,
  styles: [`
    .graph-panel {
      background: var(--bg-surface); border: 1px solid var(--border-light);
      border-radius: var(--radius-md); overflow: hidden;
      display: flex; flex-direction: column; height: 400px;
    }
    .panel-header {
      padding: 16px 24px; border-bottom: 1px solid var(--border-light);
      display: flex; justify-content: space-between; align-items: center;
    }
    h3 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
    .expand-btn { 
      background: none; border: none; cursor: pointer; color: var(--text-tertiary);
      display: flex; align-items: center; justify-content: center;
      transition: color 0.2s;
    }
    .expand-btn:hover { color: var(--accent-highlight); }
    
    .viz-area { flex: 1; background: #F8FAFC; position: relative; }
    
    .core-node { animation: pulseCore 3s infinite; }
    @keyframes pulseCore {
      0% { r: 30; opacity: 1; }
      50% { r: 35; opacity: 0.9; }
      100% { r: 30; opacity: 1; }
    }
    
    .stats-bar {
      padding: 16px 24px; display: flex; gap: 32px; border-top: 1px solid var(--border-light);
    }
    .stat { display: flex; flex-direction: column; }
    .val { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px; }
    .lbl { font-size: 11px; text-transform: uppercase; color: var(--text-tertiary); }
  `]
})
export class GraphPreviewComponent {}
