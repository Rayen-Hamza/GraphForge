import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="log-panel">
      <div class="panel-header">
        <h3>Live System Activity</h3>
      </div>
      <div class="log-list">
        <div class="log-entry" *ngFor="let log of logs$ | async" 
             [ngClass]="'type-' + log.type">
          <div class="time-col">{{ log.timestamp }}</div>
          <div class="icon-col">
            <mat-icon *ngIf="log.type === 'info'" class="log-icon">info</mat-icon>
            <mat-icon *ngIf="log.type === 'success'" class="log-icon success">check_circle</mat-icon>
            <mat-icon *ngIf="log.type === 'warning'" class="log-icon warning">warning</mat-icon>
          </div>
          <div class="source-badge" [class.orch]="log.source === 'Orch'">{{ log.source }}</div>
          <div class="event-text">{{ log.event }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .log-panel {
      background: var(--bg-surface); border: 1px solid var(--border-light);
      border-radius: var(--radius-md); height: 400px;
      display: flex; flex-direction: column;
    }
    .panel-header { padding: 16px 24px; border-bottom: 1px solid var(--border-light); }
    h3 { margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
    
    .log-list { flex: 1; overflow-y: auto; padding: 0; }
    .log-entry {
      padding: 12px 24px; display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border-light);
      animation: slideUpFade 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .log-entry:hover { background: var(--bg-surface-subtle); }
    
    .time-col { font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); min-width: 60px; }
    
    .icon-col { display: flex; align-items: center; }
    .log-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-tertiary); }
    .log-icon.success { color: var(--accent-success); }
    .log-icon.warning { color: var(--accent-warning); }

    .source-badge {
      font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
      background: #E2E8F0; color: #64748B; min-width: 30px; text-align: center;
    }
    .source-badge.orch { background: #FEF3C7; color: #D97706; }
    
    .event-text { font-size: 13px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .type-success .event-text { color: var(--accent-success); }
  `]
})
export class ActivityFeedComponent {
  logs$ = inject(MockDataService).activity$;
}
