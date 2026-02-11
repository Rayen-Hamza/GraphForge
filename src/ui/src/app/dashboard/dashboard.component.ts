import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { OrchestratorStatusComponent } from './components/orchestrator-status/orchestrator-status.component';
import { PipelineGridComponent } from './components/agent-pipeline/agent-pipeline.component';
import { WorkflowVizComponent } from './components/workflow-pipeline/workflow-pipeline.component';
import { GraphPreviewComponent } from './components/graph-preview/graph-preview.component';
import { ActivityFeedComponent } from './components/activity-feed/activity-feed.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    OrchestratorStatusComponent,
    PipelineGridComponent,
    WorkflowVizComponent,
    GraphPreviewComponent,
    ActivityFeedComponent
  ],
  template: `
    <app-header></app-header>
    <main class="dashboard-content">
      <div class="container">
        <app-orchestrator-status></app-orchestrator-status>
        
        <section class="section-title">
          <h3>Active Agent Pipelines</h3>
        </section>
        <app-pipeline-grid></app-pipeline-grid>
        
        <app-workflow-viz></app-workflow-viz>
        
        <div class="viz-grid">
          <app-graph-view></app-graph-view>
          <app-activity-log></app-activity-log>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .dashboard-content {
      height: calc(100vh - 72px);
      overflow-y: auto;
      padding: 32px 0;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 32px;
    }
    .section-title h3 {
      font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-tertiary); margin-bottom: 16px; font-weight: 600;
    }
    .viz-grid {
      display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px;
      padding-bottom: 40px;
    }
    @media (max-width: 1024px) {
      .viz-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent {}
