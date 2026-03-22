import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { ApiService } from './api.service';
import { SSEAgentEvent } from '../models/chat.models';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── REST endpoints ──

  describe('createSession', () => {
    it('should POST to /chat/sessions and return session_id', () => {
      const req = { user_id: 'user-1' };
      service.createSession(req).subscribe((resp) => {
        expect(resp.session_id).toBe('session-abc');
      });

      const httpReq = httpMock.expectOne('/api/v1/chat/sessions');
      expect(httpReq.request.method).toBe('POST');
      expect(httpReq.request.body).toEqual(req);
      httpReq.flush({ session_id: 'session-abc' });
    });
  });

  describe('getSessionState', () => {
    it('should GET session state with user_id param', () => {
      service.getSessionState('sess-1', 'user-1').subscribe((resp) => {
        expect(resp.session_id).toBe('sess-1');
        expect(resp.state).toEqual({ graph_stats: { nodes: 5 } });
      });

      const httpReq = httpMock.expectOne(
        '/api/v1/chat/sessions/sess-1?user_id=user-1',
      );
      expect(httpReq.request.method).toBe('GET');
      httpReq.flush({ session_id: 'sess-1', state: { graph_stats: { nodes: 5 } } });
    });
  });

  // ── SSE stream (fetch-based) ──

  describe('runAgentStream', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    function mockFetchWithSSE(chunks: string[]): void {
      const encoder = new TextEncoder();
      let chunkIndex = 0;

      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (chunkIndex < chunks.length) {
            controller.enqueue(encoder.encode(chunks[chunkIndex]));
            chunkIndex++;
          } else {
            controller.close();
          }
        },
      });

      globalThis.fetch = jasmine
        .createSpy('fetch')
        .and.returnValue(
          Promise.resolve(new Response(stream, { status: 200 })),
        );
    }

    it('should parse SSE events and complete on [DONE]', (done) => {
      const events: SSEAgentEvent[] = [];
      const sseData = [
        'data: {"author":"agent_a","content":{"parts":[{"text":"hello"}]},"partial":false,"is_final":false}\n\n',
        'data: {"author":"agent_b","content":null,"partial":false,"is_final":true}\n\n',
        'data: [DONE]\n\n',
      ];
      mockFetchWithSSE(sseData);

      service
        .runAgentStream('sess-1', { user_id: 'u1', message: 'test' })
        .subscribe({
          next: (e) => events.push(e),
          complete: () => {
            expect(events.length).toBe(2);
            expect(events[0].author).toBe('agent_a');
            expect(events[0].content?.parts?.[0].text).toBe('hello');
            expect(events[1].is_final).toBeTrue();
            done();
          },
        });
    });

    it('should error on SSE error event', (done) => {
      mockFetchWithSSE(['data: {"error":"something broke"}\n\n']);

      service
        .runAgentStream('sess-1', { user_id: 'u1', message: 'test' })
        .subscribe({
          error: (err: Error) => {
            expect(err.message).toBe('something broke');
            done();
          },
        });
    });

    it('should error on non-200 HTTP response', (done) => {
      globalThis.fetch = jasmine
        .createSpy('fetch')
        .and.returnValue(
          Promise.resolve(new Response(null, { status: 500, statusText: 'Internal Server Error' })),
        );

      service
        .runAgentStream('sess-1', { user_id: 'u1', message: 'test' })
        .subscribe({
          error: (err: Error) => {
            expect(err.message).toContain('500');
            done();
          },
        });
    });

    it('should abort fetch on unsubscribe', () => {
      const abortSpy = spyOn(AbortController.prototype, 'abort');
      mockFetchWithSSE([]); // never resolves

      const sub = service
        .runAgentStream('sess-1', { user_id: 'u1', message: 'test' })
        .subscribe();

      sub.unsubscribe();
      expect(abortSpy).toHaveBeenCalled();
    });
  });
});
