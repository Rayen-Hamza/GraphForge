import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../services/mock-data.service';

@Component({
  selector: 'app-workflow-viz',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flow-container">
      <div class="stage-wrapper" *ngFor="let stage of workflow$ | async; let i = index; let last = last">
        <div class="stage-node" [ngClass]="stage.status">
          <div class="icon-box">
            <mat-icon *ngIf="stage.status === 'complete'" class="small-icon">check</mat-icon>
            <mat-icon *ngIf="stage.status === 'active'" class="spinner small-icon">sync</mat-icon>
            <span *ngIf="stage.status === 'pending'">{{ i + 1 }}</span>
          </div>
          <div class="details">
            <span class="label">{{ stage.name }}</span>
            <span class="status-text">{{ stage.status }}</span>
          </div>
        </div>
        <div class="connector" *ngIf="!last" [class.active]="stage.status === 'complete'"></div>
      </div>
    </div>
  `,
  styles: [`
    .flow-container {
      display: flex; align-items: center; justify-content: space-between;
      padding: 32px; background: var(--bg-surface);
      border-radius: var(--radius-md); border: 1px solid var(--border-light);
      margin-bottom: 32px; overflow-x: auto;
    }
    .stage-wrapper { display: flex; align-items: center; flex: 1; }
    .stage-node {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 50px;
      background: var(--bg-app); border: 1px solid transparent;
      transition: all 0.3s ease; white-space: nowrap;
    }
    .stage-node.active {
      background: #FFFFFF; border-color: var(--accent-highlight);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    .stage-node.complete {
      background: rgba(16, 185, 129, 0.05); color: var(--accent-success);
    }
    
    .icon-box {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--bg-surface); border: 1px solid var(--border-light);
      display: grid; place-items: center; font-size: 12px; font-weight: 600;
    }
    .stage-node.active .icon-box { border-color: var(--accent-highlight); color: var(--accent-highlight); }
    .stage-node.complete .icon-box { background: var(--accent-success); border-color: var(--accent-success); color: white; }

    .details { display: flex; flex-direction: column; }
    .label { font-size: 13px; font-weight: 600; }
    .status-text { font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.05em; }

    .connector {
      flex: 1; height: 2px; background: var(--border-light); margin: 0 16px;
      position: relative; overflow: hidden;
    }
    .connector.active::after {
      content: ''; position: absolute; inset: 0;
      background: var(--accent-success);
      animation: flowLine 1s linear forwards;
    }
    .small-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }
    .spinner { display: inline-block; animation: spin 2s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes flowLine { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  `]
})
export class WorkflowVizComponent {
  workflow$ = inject(MockDataService).workflow$;
}
