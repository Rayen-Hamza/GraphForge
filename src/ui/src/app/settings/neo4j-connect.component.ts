import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectionService } from '../services/connection.service';

@Component({
  selector: 'app-neo4j-connect',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="neo4j-panel">
      <!-- Connection Status Badge -->
      <div class="status-row" (click)="expanded.set(!expanded())">
        <div class="status-indicator" [class.connected]="conn.status().connected && !conn.status().is_demo" [class.demo]="conn.status().is_demo">
          <span class="dot"></span>
          <span class="label">
            @if (conn.status().connected && !conn.status().is_demo) {
              Connected
            } @else {
              Demo Mode
            }
          </span>
        </div>
        <svg class="chevron" [class.open]="expanded()" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      @if (conn.status().connected && !conn.status().is_demo) {
        <div class="stats-mini">
          <span>{{ conn.status().node_count ?? 0 }} nodes</span>
          <span class="sep">&middot;</span>
          <span>{{ conn.status().relationship_count ?? 0 }} rels</span>
        </div>
      }

      @if (expanded()) {
        <div class="connect-form">
          @if (conn.status().connected && !conn.status().is_demo) {
            <!-- Connected state -->
            <div class="connected-info">
              <div class="info-row">
                <span class="info-label">URI</span>
                <span class="info-value">{{ conn.status().uri }}</span>
              </div>
              <button class="btn-disconnect" (click)="disconnect()">Disconnect</button>
            </div>
          } @else {
            <!-- Connection form -->
            <div class="form-group">
              <label>Neo4j URI</label>
              <input type="text" [(ngModel)]="uri" placeholder="neo4j+s://xxxx.databases.neo4j.io">
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" [(ngModel)]="username" placeholder="neo4j">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
            </div>
            <div class="form-group">
              <label>Database <span class="optional">(optional)</span></label>
              <input type="text" [(ngModel)]="database" placeholder="neo4j">
            </div>

            @if (conn.testResult(); as result) {
              <div class="test-result" [class.success]="result.ok" [class.error]="!result.ok">
                {{ result.message }}
              </div>
            }

            <div class="form-actions">
              <button class="btn-test" (click)="test()" [disabled]="conn.testing() || !uri || !username || !password">
                @if (conn.testing()) { Testing... } @else { Test }
              </button>
              <button class="btn-connect" (click)="connectNeo4j()" [disabled]="conn.connecting() || !uri || !username || !password">
                @if (conn.connecting()) { Connecting... } @else { Connect }
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .neo4j-panel { padding: 8px 12px; border-top: 1px solid var(--color-border, #e0ddd6); }
    .status-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 4px 0; }
    .status-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
    .dot { width: 7px; height: 7px; border-radius: 50%; }
    .demo .dot { background: #d4a847; }
    .connected .dot { background: #3D8B56; }
    .demo .label { color: var(--color-text-secondary, #5A6B5E); }
    .connected .label { color: #3D8B56; }
    .chevron { transition: transform 0.2s; color: var(--color-text-tertiary, #8B9D83); }
    .chevron.open { transform: rotate(180deg); }
    .stats-mini { font-size: 11px; color: var(--color-text-tertiary, #8B9D83); padding: 2px 0 4px; display: flex; gap: 4px; }
    .connect-form { padding: 8px 0 4px; }
    .form-group { margin-bottom: 8px; }
    .form-group label { display: block; font-size: 11px; font-weight: 500; color: var(--color-text-secondary, #5A6B5E); margin-bottom: 3px; }
    .optional { font-weight: 400; color: var(--color-text-tertiary, #8B9D83); }
    .form-group input {
      width: 100%; padding: 6px 8px; border: 1px solid var(--color-border, #e0ddd6);
      border-radius: 6px; font-size: 12px; background: var(--color-surface, #fff);
      font-family: 'JetBrains Mono', monospace;
    }
    .form-group input:focus { outline: none; border-color: var(--color-primary, #4A5D4F); }
    .form-actions { display: flex; gap: 6px; margin-top: 10px; }
    .btn-test, .btn-connect, .btn-disconnect {
      flex: 1; padding: 6px 10px; border: none; border-radius: 6px;
      font-size: 12px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
    }
    .btn-test { background: var(--color-surface-alt, #f0ece4); color: var(--color-text, #1A2F1E); }
    .btn-connect { background: var(--color-primary, #4A5D4F); color: white; }
    .btn-disconnect { width: 100%; background: #f5e6e6; color: #C94A4A; margin-top: 8px; padding: 6px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .test-result { font-size: 11px; padding: 6px 8px; border-radius: 6px; margin-top: 6px; }
    .test-result.success { background: #e8f5e9; color: #2e7d32; }
    .test-result.error { background: #fce4ec; color: #c62828; }
    .connected-info { font-size: 12px; }
    .info-row { display: flex; gap: 6px; margin-bottom: 4px; }
    .info-label { font-weight: 500; color: var(--color-text-secondary, #5A6B5E); min-width: 30px; }
    .info-value { color: var(--color-text, #1A2F1E); font-family: 'JetBrains Mono', monospace; font-size: 11px; word-break: break-all; }
  `],
})
export class Neo4jConnectComponent implements OnInit {
  readonly conn = inject(ConnectionService);

  expanded = signal(false);
  uri = '';
  username = '';
  password = '';
  database = '';

  ngOnInit() {
    this.conn.refreshStatus();
  }

  async test() {
    await this.conn.testConnection({
      uri: this.uri,
      username: this.username,
      password: this.password,
      database: this.database || undefined,
    });
  }

  async connectNeo4j() {
    const ok = await this.conn.connect({
      uri: this.uri,
      username: this.username,
      password: this.password,
      database: this.database || undefined,
    });
    if (ok) {
      this.expanded.set(false);
    }
  }

  async disconnect() {
    await this.conn.disconnect();
  }
}
