import { Injectable } from '@angular/core';
import { BehaviorSubject, interval } from 'rxjs';

// Data shapes
export interface Agent {
  id: string;
  name: string;
  type: 'orchestrator' | 'primary';
  status: 'idle' | 'working' | 'complete' | 'error';
  progress: number;
  message: string;
  meta: string;
  subAgents?: SubAgent[];
}

export interface SubAgent {
  id: string;
  name: string;
  progress: number;
  status: 'idle' | 'working' | 'complete';
  message: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'complete';
}

export interface ActivityLog {
  timestamp: string;
  source: string;
  event: string;
  type: 'info' | 'success' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private orchestratorSubject = new BehaviorSubject<Agent>({
    id: 'ORCH-01',
    name: 'GraphLink Orchestrator',
    type: 'orchestrator',
    status: 'working',
    progress: 72,
    message: 'Coordinating distributed extraction',
    meta: '3 active pipelines'
  });

  private pipelinesSubject = new BehaviorSubject<Agent[]>([
    {
      id: 'P1',
      name: 'Structured Data',
      type: 'primary',
      status: 'working',
      progress: 84,
      message: 'Processing',
      meta: 'SQL/CSV',
      subAgents: [
        { id: 'L4', name: 'Intent Analysis', progress: 100, status: 'complete', message: 'Done' },
        { id: 'L5', name: 'File Mapping', progress: 90, status: 'working', message: 'Mapping fields...' },
        { id: 'L6', name: 'Schema Gen', progress: 15, status: 'idle', message: 'Pending' }
      ]
    },
    {
      id: 'P2',
      name: 'Unstructured Data',
      type: 'primary',
      status: 'working',
      progress: 45,
      message: 'Active',
      meta: 'PDF/Docs',
      subAgents: [
        { id: 'L4U', name: 'Intent Analysis', progress: 65, status: 'working', message: 'Parsing...' },
        { id: 'L5U', name: 'Entity Extract', progress: 30, status: 'working', message: 'Identifying...' },
        { id: 'L7', name: 'Fact Construc', progress: 0, status: 'idle', message: 'Queued' }
      ]
    },
    {
      id: 'P3',
      name: 'GraphRAG',
      type: 'primary',
      status: 'idle',
      progress: 0,
      message: 'Standby',
      meta: 'Knowledge Base',
      subAgents: []
    }
  ]);

  private workflowSubject = new BehaviorSubject<WorkflowStage[]>([
    { id: '1', name: 'Plan', status: 'complete' },
    { id: '2', name: 'Extract', status: 'active' },
    { id: '3', name: 'Build', status: 'pending' },
    { id: '4', name: 'Verify', status: 'pending' }
  ]);

  private activitySubject = new BehaviorSubject<ActivityLog[]>([
    { timestamp: '10:42:05', source: 'Orch', event: 'Initiated structured pipeline', type: 'info' },
    { timestamp: '10:42:08', source: 'L4', event: 'Detected user intent: "Sales Analysis"', type: 'success' },
    { timestamp: '10:42:15', source: 'L5', event: 'Table "transactions" mapped', type: 'info' }
  ]);

  orchestrator$ = this.orchestratorSubject.asObservable();
  pipelines$ = this.pipelinesSubject.asObservable();
  workflow$ = this.workflowSubject.asObservable();
  activity$ = this.activitySubject.asObservable();

  constructor() {
    this.startSimulation();
  }

  private startSimulation() {
    // Orchestrator Progress
    interval(800).subscribe(() => {
      const curr = this.orchestratorSubject.value;
      const prog = curr.progress >= 100 ? 0 : curr.progress + 1;
      this.orchestratorSubject.next({ ...curr, progress: prog });
    });

    // Pipeline Activity
    interval(1500).subscribe(() => {
      const pipes = [...this.pipelinesSubject.value];
      if (pipes[0].subAgents && pipes[0].subAgents[1]) {
        pipes[0].subAgents[1].progress = (pipes[0].subAgents[1].progress + 5) % 100;
        this.pipelinesSubject.next(pipes);
      }
    });

    // Activity Feed
    interval(4000).subscribe(() => {
      const logs = this.activitySubject.value;
      const newLog: ActivityLog = {
        timestamp: new Date().toLocaleTimeString('en-GB'),
        source: ['L5', 'L7', 'Sys'][Math.floor(Math.random() * 3)],
        event: ['Optimizing graph...', 'Ingesting chunk...', 'Memory sync...'][Math.floor(Math.random() * 3)],
        type: 'info'
      };
      this.activitySubject.next([newLog, ...logs].slice(0, 10));
    });
  }
}
