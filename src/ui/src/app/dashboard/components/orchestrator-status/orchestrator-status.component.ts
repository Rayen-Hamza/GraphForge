import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
  selector: 'app-orchestrator-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card orch-card" *ngIf="orch$ | async as orch">
      <div class="card-glow"></div>
      <div class="content">
        <div class="header">
          <div class="title-group">
            <span class="indicator working"></span>
            <h2>{{ orch.name }}</h2>
          </div>
          <span class="mono-badge">{{ orch.id }}</span>
        </div>
        
        <div class="metrics">
          <div class="metric-item">
            <label>Progress</label>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="orch.progress"></div>
            </div>
          </div>
        </div>

        <div class="status-row">
          <p>{{ orch.message }}</p>
          <span class="meta">{{ orch.meta }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .orch-card {
      position: relative;
      background: linear-gradient(145deg, #ffffff, #f8f9fa);
      border-radius: var(--radius-md);
      padding: 24px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.6);
      box-shadow: var(--shadow-md);
      margin-bottom: 24px;
    }
    .card-glow {
      position: absolute; top: 0; left: 0; width: 100%; height: 4px;
      background: linear-gradient(90deg, var(--accent-highlight), var(--accent-purple));
    }
    .header {
      display: flex; justify-content: space-between; align-items: start;
      margin-bottom: 20px;
    }
    .title-group { display: flex; align-items: center; gap: 12px; }
    h2 {
      margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .indicator {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-success);
      box-shadow: 0 0 0 4px rgba(16,185,129,0.1);
    }
    .mono-badge {
      font-family: var(--font-mono); font-size: 11px;
      color: var(--text-tertiary); background: var(--bg-app);
      padding: 4px 8px; border-radius: 4px;
    }
    .progress-track {
      height: 6px; background: var(--bg-app); border-radius: 3px;
      overflow: hidden; margin-top: 8px;
    }
    .progress-fill {
      height: 100%; background: var(--accent-primary);
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .status-row {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-top: 24px; font-size: 14px;
    }
    p { margin: 0; color: var(--text-secondary); }
    .meta { font-size: 12px; color: var(--text-tertiary); font-weight: 500; }
  `]
})
export class OrchestratorStatusComponent {
  orch$ = inject(MockDataService).orchestrator$;
}
