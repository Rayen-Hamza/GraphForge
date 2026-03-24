import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  RunAgentRequest,
  SessionEventsResponse,
  SessionStateResponse,
  SSEAgentEvent,
} from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** List all sessions for a user. */
  listSessions(userId: string): Observable<ListSessionsResponse> {
    return this.http.get<ListSessionsResponse>(
      `${this.baseUrl}/chat/sessions`,
      { params: { user_id: userId } },
    );
  }

  /** Create a new agent session. */
  createSession(req: CreateSessionRequest): Observable<CreateSessionResponse> {
    return this.http.post<CreateSessionResponse>(
      `${this.baseUrl}/chat/sessions`,
      req,
    );
  }

  /** Get the conversation history (events) for a session. */
  getSessionEvents(sessionId: string, userId: string): Observable<SessionEventsResponse> {
    return this.http.get<SessionEventsResponse>(
      `${this.baseUrl}/chat/sessions/${sessionId}/events`,
      { params: { user_id: userId } },
    );
  }

  /** Get the current state of an agent session. */
  getSessionState(sessionId: string, userId: string): Observable<SessionStateResponse> {
    return this.http.get<SessionStateResponse>(
      `${this.baseUrl}/chat/sessions/${sessionId}`,
      { params: { user_id: userId } },
    );
  }

  /**
   * POST SSE stream using fetch + ReadableStream.
   * Native EventSource only supports GET — we need POST for the request body.
   * Returns an Observable that emits parsed SSE events and completes on [DONE].
   * Unsubscribing aborts the fetch automatically.
   */
  runAgentStream(sessionId: string, req: RunAgentRequest): Observable<SSEAgentEvent> {
    const url = `${this.baseUrl}/chat/sessions/${sessionId}/run`;

    return new Observable<SSEAgentEvent>((subscriber) => {
      const controller = new AbortController();

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (!response.body) {
            throw new Error('Response body is null — SSE streaming not supported');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          function processStream(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                subscriber.complete();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const chunks = buffer.split('\n\n');
              buffer = chunks.pop()!; // keep incomplete trailing chunk

              for (const chunk of chunks) {
                const match = chunk.match(/^data:\s*(.+)$/m);
                if (!match) continue;

                const raw = match[1].trim();
                if (raw === '[DONE]') {
                  subscriber.complete();
                  return;
                }

                try {
                  const parsed = JSON.parse(raw);
                  if ('error' in parsed) {
                    subscriber.error(new Error(parsed.error));
                    return;
                  }
                  subscriber.next(parsed as SSEAgentEvent);
                } catch {
                  // skip malformed JSON lines
                }
              }

              return processStream();
            });
          }

          return processStream();
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') {
            subscriber.error(err);
          }
        });

      // teardown: abort fetch when unsubscribed
      return () => controller.abort();
    });
  }
}
