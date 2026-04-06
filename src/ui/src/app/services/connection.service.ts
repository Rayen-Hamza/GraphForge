import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Neo4jConnectionStatus {
  connected: boolean;
  is_demo: boolean;
  uri: string | null;
  node_count: number | null;
  relationship_count: number | null;
}

export interface Neo4jConnectionRequest {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly status = signal<Neo4jConnectionStatus>({
    connected: false,
    is_demo: true,
    uri: null,
    node_count: null,
    relationship_count: null,
  });

  readonly testing = signal(false);
  readonly connecting = signal(false);
  readonly testResult = signal<{ ok: boolean; message: string } | null>(null);

  async refreshStatus(): Promise<void> {
    try {
      const resp = await firstValueFrom(
        this.http.get<Neo4jConnectionStatus>(`${this.baseUrl}/connections/neo4j/status`),
      );
      this.status.set(resp);
    } catch {
      // backend unavailable
    }
  }

  async testConnection(req: Neo4jConnectionRequest): Promise<boolean> {
    this.testing.set(true);
    this.testResult.set(null);
    try {
      const resp = await firstValueFrom(
        this.http.post<{ status: string; message: string }>(
          `${this.baseUrl}/connections/neo4j/test`,
          req,
        ),
      );
      const ok = resp.status === 'ok';
      this.testResult.set({ ok, message: resp.message });
      return ok;
    } catch (e: any) {
      this.testResult.set({ ok: false, message: e?.error?.detail || 'Connection failed' });
      return false;
    } finally {
      this.testing.set(false);
    }
  }

  async connect(req: Neo4jConnectionRequest): Promise<boolean> {
    this.connecting.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/connections/neo4j`, req),
      );
      await this.refreshStatus();
      return true;
    } catch {
      return false;
    } finally {
      this.connecting.set(false);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/connections/neo4j`),
      );
    } catch {
      // ignore
    }
    await this.refreshStatus();
  }
}
