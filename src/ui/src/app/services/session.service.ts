import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'gf_session_id';

interface InitSessionResponse {
  session_id: string;
  is_demo: boolean;
}

interface SessionInfoResponse {
  session_id: string;
  is_demo: boolean;
  neo4j_connected: boolean;
  ttl_seconds: number;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  readonly sessionId = signal<string | null>(this.loadFromStorage());
  readonly isDemo = signal(true);
  readonly neo4jConnected = signal(false);
  readonly initialized = signal(false);

  /** Initialize session on app startup. */
  async init(): Promise<void> {
    const existing = this.sessionId();

    if (existing) {
      // Validate the existing session is still alive
      try {
        const info = await firstValueFrom(
          this.http.get<SessionInfoResponse>(`${this.baseUrl}/sessions/me`, {
            headers: { 'X-Session-ID': existing },
          }),
        );
        this.isDemo.set(info.is_demo);
        this.neo4jConnected.set(info.neo4j_connected);
        this.initialized.set(true);
        return;
      } catch {
        // Session expired, create a new one
        this.clearStorage();
      }
    }

    // Create a new anonymous session
    try {
      const resp = await firstValueFrom(
        this.http.post<InitSessionResponse>(`${this.baseUrl}/sessions/init`, {}),
      );
      this.sessionId.set(resp.session_id);
      this.isDemo.set(resp.is_demo);
      this.saveToStorage(resp.session_id);
    } catch {
      // Backend unavailable — generate a local fallback ID
      const fallback = crypto.randomUUID();
      this.sessionId.set(fallback);
      this.saveToStorage(fallback);
    }
    this.initialized.set(true);
  }

  /** Refresh session info from the backend. */
  async refresh(): Promise<void> {
    const sid = this.sessionId();
    if (!sid) return;
    try {
      const info = await firstValueFrom(
        this.http.get<SessionInfoResponse>(`${this.baseUrl}/sessions/me`, {
          headers: { 'X-Session-ID': sid },
        }),
      );
      this.isDemo.set(info.is_demo);
      this.neo4jConnected.set(info.neo4j_connected);
    } catch {
      // ignore
    }
  }

  /** Clear the current session and create a new one. */
  async reset(): Promise<void> {
    const sid = this.sessionId();
    if (sid) {
      try {
        await firstValueFrom(
          this.http.delete(`${this.baseUrl}/sessions/me`, {
            headers: { 'X-Session-ID': sid },
          }),
        );
      } catch {
        // ignore
      }
    }
    this.clearStorage();
    this.sessionId.set(null);
    this.isDemo.set(true);
    this.neo4jConnected.set(false);
    await this.init();
  }

  private loadFromStorage(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private saveToStorage(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
