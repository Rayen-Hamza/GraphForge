import { Component, inject, signal, OnInit, OnDestroy, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

const LABEL_COLORS: Record<string, string> = {};
const PALETTE = ['#4A5D4F', '#E8734A', '#3D8B56', '#6B4C8A', '#C4853A', '#4A7B8C', '#8B5E3C', '#5E7A4A'];
let colorIdx = 0;

function getColor(label: string): string {
  if (!LABEL_COLORS[label]) {
    LABEL_COLORS[label] = PALETTE[colorIdx % PALETTE.length];
    colorIdx++;
  }
  return LABEL_COLORS[label];
}

@Component({
  selector: 'app-graph-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="graph-container">
      <div class="graph-header">
        <span class="graph-title">Knowledge Graph</span>
        <button class="btn-refresh" (click)="loadGraph()" [disabled]="loading()">
          <svg [class.spinning]="loading()" width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M14 8A6 6 0 1 1 8 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8 0l2.5 2L8 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      @if (totalNodes() > 0) {
        <div class="graph-stats-overlay">
          <span>{{ totalNodes() }} nodes</span>
          <span class="sep">&middot;</span>
          <span>{{ totalEdges() }} edges</span>
        </div>
      }

      <canvas #graphCanvas class="graph-canvas"
              (mousedown)="onMouseDown($event)"
              (mousemove)="onMouseMove($event)"
              (mouseup)="onMouseUp()"
              (wheel)="onWheel($event)">
      </canvas>

      @if (selectedNode()) {
        <div class="node-detail">
          <div class="node-detail-header">
            <span class="node-label-badge" [style.background]="getColor(selectedNode()!.label)">
              {{ selectedNode()!.label }}
            </span>
            <button class="btn-close-detail" (click)="selectedNode.set(null)">
              <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="node-props">
            @for (entry of getNodeProps(); track entry[0]) {
              <div class="prop-row">
                <span class="prop-key">{{ entry[0] }}</span>
                <span class="prop-value">{{ entry[1] }}</span>
              </div>
            }
          </div>
        </div>
      }

      @if (!loading() && nodes().length === 0) {
        <div class="graph-empty">
          <span>No graph data yet</span>
          <span class="empty-hint">Build a knowledge graph to see it here</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .graph-container { position: relative; width: 100%; height: 300px; border-radius: 12px; background: #fafaf7; border: 1px solid var(--color-border, #e0ddd6); overflow: hidden; }
    .graph-header { position: absolute; top: 8px; left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; z-index: 2; }
    .graph-title { font-size: 11px; font-weight: 600; color: var(--color-text-secondary, #5A6B5E); text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-refresh { background: none; border: none; cursor: pointer; color: var(--color-text-tertiary, #8B9D83); padding: 2px; }
    .btn-refresh:hover { color: var(--color-text, #1A2F1E); }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .graph-stats-overlay { position: absolute; bottom: 8px; left: 10px; font-size: 11px; color: var(--color-text-tertiary, #8B9D83); z-index: 2; display: flex; gap: 4px; }
    .graph-canvas { width: 100%; height: 100%; cursor: grab; }
    .graph-canvas:active { cursor: grabbing; }
    .graph-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--color-text-tertiary, #8B9D83); font-size: 13px; }
    .empty-hint { font-size: 11px; }
    .node-detail { position: absolute; top: 30px; right: 8px; background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); padding: 10px; max-width: 200px; z-index: 3; font-size: 11px; }
    .node-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .node-label-badge { color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .btn-close-detail { background: none; border: none; cursor: pointer; color: var(--color-text-tertiary); padding: 0; }
    .prop-row { display: flex; gap: 6px; padding: 2px 0; border-bottom: 1px solid #f0ece4; }
    .prop-key { font-weight: 500; color: var(--color-text-secondary); min-width: 50px; }
    .prop-value { color: var(--color-text); word-break: break-all; }
  `],
})
export class GraphViewerComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('graphCanvas');

  nodes = signal<GraphNode[]>([]);
  edges = signal<GraphEdge[]>([]);
  totalNodes = signal(0);
  totalEdges = signal(0);
  loading = signal(false);
  selectedNode = signal<GraphNode | null>(null);

  private ctx: CanvasRenderingContext2D | null = null;
  private animFrame = 0;
  private panX = 0;
  private panY = 0;
  private scale = 1;
  private dragging = false;
  private lastMouse = { x: 0, y: 0 };
  private simNodes: GraphNode[] = [];
  private simEdges: { source: GraphNode; target: GraphNode; type: string }[] = [];
  private simRunning = false;
  private alpha = 1;

  getColor = getColor;

  getNodeProps(): [string, string][] {
    const node = this.selectedNode();
    if (!node) return [];
    return Object.entries(node.properties).map(([k, v]) => [k, String(v)]);
  }

  ngOnInit() {
    this.loadGraph();
  }

  ngOnDestroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.simRunning = false;
  }

  async loadGraph() {
    this.loading.set(true);
    try {
      const resp = await firstValueFrom(
        this.http.get<GraphSnapshot>(`${this.baseUrl}/graph/snapshot?limit=200`),
      );
      this.nodes.set(resp.nodes);
      this.edges.set(resp.edges);
      this.totalNodes.set(resp.total_nodes);
      this.totalEdges.set(resp.total_edges);

      if (resp.nodes.length > 0) {
        this.initSimulation(resp.nodes, resp.edges);
      }
    } catch {
      // backend unavailable
    } finally {
      this.loading.set(false);
    }
  }

  private initSimulation(nodes: GraphNode[], edges: GraphEdge[]) {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    this.panX = w / 2;
    this.panY = h / 2;

    // Initialize node positions randomly
    this.simNodes = nodes.map(n => ({
      ...n,
      x: (Math.random() - 0.5) * w * 0.6,
      y: (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(this.simNodes.map(n => [n.id, n]));
    this.simEdges = edges
      .map(e => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        type: e.type,
      }))
      .filter(e => e.source && e.target);

    this.alpha = 1;
    this.simRunning = true;
    this.tick();
  }

  private tick() {
    if (!this.simRunning) return;

    // Simple force simulation
    const nodes = this.simNodes;
    const edges = this.simEdges;

    // Repulsion between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x! - nodes[i].x!;
        const dy = nodes[j].y! - nodes[i].y!;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 800 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx! -= fx;
        nodes[i].vy! -= fy;
        nodes[j].vx! += fx;
        nodes[j].vy! += fy;
      }
    }

    // Attraction along edges
    for (const e of edges) {
      const dx = e.target.x! - e.source.x!;
      const dy = e.target.y! - e.source.y!;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 80) * 0.02;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      e.source.vx! += fx;
      e.source.vy! += fy;
      e.target.vx! -= fx;
      e.target.vy! -= fy;
    }

    // Centering force
    for (const n of nodes) {
      n.vx! -= n.x! * 0.005;
      n.vy! -= n.y! * 0.005;
    }

    // Apply velocities with damping
    for (const n of nodes) {
      n.vx! *= 0.85;
      n.vy! *= 0.85;
      n.x! += n.vx! * this.alpha;
      n.y! += n.vy! * this.alpha;
    }

    this.alpha *= 0.995;
    this.draw();

    if (this.alpha > 0.01) {
      this.animFrame = requestAnimationFrame(() => this.tick());
    } else {
      this.simRunning = false;
    }
  }

  private draw() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !this.ctx) return;

    const ctx = this.ctx;
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // Draw edges
    ctx.strokeStyle = '#c8c4bb';
    ctx.lineWidth = 1;
    for (const e of this.simEdges) {
      ctx.beginPath();
      ctx.moveTo(e.source.x!, e.source.y!);
      ctx.lineTo(e.target.x!, e.target.y!);
      ctx.stroke();
    }

    // Draw nodes
    for (const n of this.simNodes) {
      const r = 8;
      ctx.beginPath();
      ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
      ctx.fillStyle = getColor(n.label);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      const displayName = n.properties?.['name'] || n.properties?.['id'] || n.label;
      ctx.fillStyle = '#1A2F1E';
      ctx.font = '9px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(displayName).slice(0, 20), n.x!, n.y! + r + 12);
    }

    ctx.restore();
  }

  onMouseDown(event: MouseEvent) {
    this.dragging = true;
    this.lastMouse = { x: event.clientX, y: event.clientY };

    // Check if clicking on a node
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left - this.panX) / this.scale;
    const my = (event.clientY - rect.top - this.panY) / this.scale;

    for (const n of this.simNodes) {
      const dx = n.x! - mx;
      const dy = n.y! - my;
      if (dx * dx + dy * dy < 100) {
        this.selectedNode.set(n);
        return;
      }
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastMouse.x;
    const dy = event.clientY - this.lastMouse.y;
    this.panX += dx;
    this.panY += dy;
    this.lastMouse = { x: event.clientX, y: event.clientY };
    this.draw();
  }

  onMouseUp() {
    this.dragging = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    this.scale = Math.max(0.2, Math.min(5, this.scale * factor));
    this.draw();
  }
}
