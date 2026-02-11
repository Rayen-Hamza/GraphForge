import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
  selector: 'app-pipeline-grid',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="grid-container">
      <div class="pipeline-card" *ngFor="let pipe of pipelines$ | async" 
           [class.active]="pipe.status === 'working'">
        <div class="card-header">
          <div class="pipe-icon" [ngClass]="pipe.status">
            {{ pipe.name.charAt(0) }}
          </div>
          <div class="header-text">
            <h3>{{ pipe.name }}</h3>
            <span class="status-label">{{ pipe.message }}</span>
          </div>
        </div>

        <div class="agents-list" *ngIf="pipe.subAgents?.length">
          <div class="agent-row" *ngFor="let agent of pipe.subAgents">
            <div class="agent-info">
              <span class="agent-id">{{ agent.id }}</span>
              <span class="agent-name">{{ agent.name }}</span>
            </div>
            <div class="agent-status" [class.complete]="agent.status === 'complete'">
              <mat-icon *ngIf="agent.status === 'complete'" class="small-icon">check</mat-icon>
              <div *ngIf="agent.status === 'working'" class="mini-loader"></div>
            </div>
            <div class="micro-track">
              <div class="micro-fill" [style.width.%]="agent.progress"></div>
            </div>
          </div>
        </div>
        
        <div class="empty-state" *ngIf="!pipe.subAgents?.length">
          <span class="empty-text">Awaiting Activation</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-container {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
      margin-bottom: 32px;
    }
    .pipeline-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 20px; transition: all 0.3s ease;
      position: relative;
    }
    .pipeline-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .pipeline-card.active { border-color: var(--accent-highlight); }
    
    .card-header { display: flex; gap: 12px; margin-bottom: 20px; }
    .pipe-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--bg-app); color: var(--text-tertiary);
      display: grid; place-items: center; font-weight: 700;
    }
    .pipe-icon.working { background: rgba(59, 130, 246, 0.1); color: var(--accent-highlight); }
    .header-text h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .status-label { font-size: 12px; color: var(--text-secondary); }

    .agent-row {
      background: var(--bg-surface-subtle);
      border-radius: 6px; padding: 10px; margin-bottom: 8px;
      position: relative; overflow: hidden;
    }
    .agent-info { display: flex; gap: 8px; align-items: baseline; margin-bottom: 6px; z-index: 2; position: relative; }
    .agent-id { font-family: var(--font-mono); font-size: 10px; color: var(--text-tertiary); }
    .agent-name { font-size: 13px; font-weight: 500; font-family: var(--font-sans); }
    
    .agent-status {
      position: absolute; right: 10px; top: 10px;
      color: var(--accent-success);
    }
    .small-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }
    .mini-loader {
      width: 10px; height: 10px; border: 2px solid var(--border-light);
      border-top-color: var(--accent-highlight); border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .micro-track {
      height: 2px; width: 100%; background: var(--bg-app);
      position: absolute; bottom: 0; left: 0;
    }
    .micro-fill { height: 100%; background: var(--accent-highlight); transition: width 0.3s; }
    
    .empty-state { text-align: center; padding: 20px; color: var(--text-tertiary); font-size: 12px; border: 1px dashed var(--border-light); border-radius: 8px; }

    @media(max-width: 1024px) {
      .grid-container { grid-template-columns: repeat(2, 1fr); }
    }
    @media(max-width: 768px) {
      .grid-container { grid-template-columns: 1fr; }
    }
  `]
})
export class PipelineGridComponent {
  pipelines$ = inject(MockDataService).pipelines$;
}
