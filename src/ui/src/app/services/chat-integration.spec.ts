import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';

import { ChatService } from './chat.service';
import { ApiService } from './api.service';
import { SSEAgentEvent } from '../models/chat.models';

/**
 * Integration test: ChatService + ApiService wired together,
 * with ApiService.runAgentStream mocked at the fetch level.
 */
describe('Chat Integration (Service → API)', () => {
  let chatService: ChatService;
  let apiService: ApiService;
  let sseSubject: Subject<SSEAgentEvent>;

  beforeEach(() => {
    sseSubject = new Subject<SSEAgentEvent>();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ChatService,
        ApiService,
      ],
    });

    chatService = TestBed.inject(ChatService);
    apiService = TestBed.inject(ApiService);

    // Mock only the SSE stream, let everything else flow through
    spyOn(apiService, 'createSession').and.returnValue(
      new Subject<any>().asObservable(),
    );
    spyOn(apiService, 'runAgentStream').and.returnValue(
      sseSubject.asObservable(),
    );
    spyOn(apiService, 'getSessionState').and.returnValue(
      new Subject<any>().asObservable(),
    );
  });

  it('should flow: send message → create session → stream events → finalize', async () => {
    // Override createSession to resolve
    const sessionSubject = new Subject<{ session_id: string }>();
    (apiService.createSession as jasmine.Spy).and.returnValue(
      sessionSubject.asObservable(),
    );

    const sendPromise = chatService.sendMessage('Build a knowledge graph about AI');
    sessionSubject.next({ session_id: 'integration-sess' });
    sessionSubject.complete();
    await sendPromise;

    // Verify user message
    expect(chatService.messages().length).toBe(2);
    expect(chatService.messages()[0].content).toBe('Build a knowledge graph about AI');
    expect(chatService.isStreaming()).toBeTrue();

    // Simulate SSE events from multi-agent pipeline
    sseSubject.next({
      author: 'user_intent_agent_v2',
      content: { parts: [{ text: 'Analyzing intent: knowledge graph construction for AI domain. ' }] },
      partial: false,
      is_final: true,
    });

    sseSubject.next({
      author: 'file_suggestion_agent_v3',
      content: { parts: [{ text: 'Suggested sources identified. ' }] },
      partial: false,
      is_final: true,
    });

    sseSubject.next({
      author: 'schema_proposal_agent_v1',
      content: { parts: [{ text: 'Schema: entities=[Concept, Paper, Author], relations=[cites, studies]. ' }] },
      partial: false,
      is_final: true,
    });

    sseSubject.next({
      author: 'graph_construction_agent_v1',
      content: { parts: [{ text: 'Graph constructed with 24 nodes and 47 edges. ' }] },
      partial: false,
      is_final: true,
    });

    sseSubject.next({
      author: 'graphrag_agent_v1',
      content: { parts: [{ text: 'Knowledge graph is ready for exploration.' }] },
      partial: false,
      is_final: true,
    });

    // Verify only the last agent's text is shown (each new agent replaces content)
    const assistant = chatService.messages()[1];
    expect(assistant.content).toBe('Knowledge graph is ready for exploration.');
    expect(assistant.content).not.toContain('Analyzing intent');

    // Verify pipeline states
    const pipeline = chatService.agentPipeline();
    expect(pipeline[0].status).toBe('completed'); // user_intent_agent_v2
    expect(pipeline[4].status).toBe('completed'); // graphrag_agent_v1

    // Complete the stream
    sseSubject.complete();

    expect(chatService.isStreaming()).toBeFalse();
    expect(chatService.messages()[1].isStreaming).toBeFalse();
  });

  it('should handle error mid-stream gracefully', (done) => {
    // Install fake timers BEFORE anything runs so retry backoff is instant
    jasmine.clock().install();

    const sessionSubject = new Subject<{ session_id: string }>();
    (apiService.createSession as jasmine.Spy).and.returnValue(
      sessionSubject.asObservable(),
    );

    chatService.sendMessage('test').then(() => {
      // Send one event then error
      sseSubject.next({
        author: 'user_intent_agent_v2',
        content: { parts: [{ text: 'Started...' }] },
        partial: false,
        is_final: false,
      });

      sseSubject.error(new Error('Backend crashed'));

      // Advance past all retry delays: 1s + 2s + 4s
      jasmine.clock().tick(8000);

      setTimeout(() => {
        expect(chatService.isStreaming()).toBeFalse();
        expect(chatService.error()).toContain('Backend crashed');

        const assistant = chatService.messages()[1];
        expect(assistant.content).toContain('Started...');
        expect(assistant.isStreaming).toBeFalse();

        jasmine.clock().uninstall();
        done();
      }, 0);
      jasmine.clock().tick(1);
    });

    // Resolve session creation (needs to happen synchronously since clock is installed)
    sessionSubject.next({ session_id: 'err-sess' });
    sessionSubject.complete();

    // Tick to allow the sendMessage promise chain to resolve
    jasmine.clock().tick(1);
  });

  it('should handle multiple messages in same session', async () => {
    const sessionSubject = new Subject<{ session_id: string }>();
    (apiService.createSession as jasmine.Spy).and.returnValue(
      sessionSubject.asObservable(),
    );

    // First message
    const p1 = chatService.sendMessage('first');
    sessionSubject.next({ session_id: 'multi-sess' });
    sessionSubject.complete();
    await p1;

    sseSubject.next({
      author: 'graphrag_agent_v1',
      content: { parts: [{ text: 'Response 1' }] },
      partial: false,
      is_final: true,
    });
    sseSubject.complete();

    expect(chatService.messages().length).toBe(2);

    // Second message — should reuse session
    const sseSubject2 = new Subject<SSEAgentEvent>();
    (apiService.runAgentStream as jasmine.Spy).and.returnValue(
      sseSubject2.asObservable(),
    );

    await chatService.sendMessage('second');

    // Should NOT call createSession again
    expect(apiService.createSession).toHaveBeenCalledTimes(1);
    expect(chatService.messages().length).toBe(4); // 2 from first + 2 from second

    sseSubject2.next({
      author: 'graphrag_agent_v1',
      content: { parts: [{ text: 'Response 2' }] },
      partial: false,
      is_final: true,
    });
    sseSubject2.complete();

    expect(chatService.messages()[3].content).toBe('Response 2');
  });
});
