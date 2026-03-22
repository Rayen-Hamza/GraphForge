import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';

import { ChatService } from './chat.service';
import { ApiService } from './api.service';
import { SSEAgentEvent } from '../models/chat.models';

describe('ChatService', () => {
  let service: ChatService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let sseSubject: Subject<SSEAgentEvent>;

  beforeEach(() => {
    sseSubject = new Subject<SSEAgentEvent>();

    apiSpy = jasmine.createSpyObj('ApiService', [
      'createSession',
      'runAgentStream',
      'getSessionState',
    ]);
    apiSpy.createSession.and.returnValue(
      new Subject() as any, // will be controlled per test
    );
    apiSpy.runAgentStream.and.returnValue(sseSubject.asObservable());

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ChatService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ChatService);
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      // Mock createSession to resolve immediately
      const sessionSubject = new Subject<{ session_id: string }>();
      apiSpy.createSession.and.returnValue(sessionSubject.asObservable());

      // Auto-complete session creation
      const origSendMessage = service.sendMessage.bind(service);
      spyOn(service, 'sendMessage').and.callFake(async (text: string) => {
        const promise = origSendMessage(text);
        sessionSubject.next({ session_id: 'test-session' });
        sessionSubject.complete();
        return promise;
      });
    });

    it('should append user message immediately', async () => {
      await service.sendMessage('hello');

      const msgs = service.messages();
      expect(msgs.length).toBe(2); // user + placeholder assistant
      expect(msgs[0].role).toBe('user');
      expect(msgs[0].content).toBe('hello');
    });

    it('should create a session on first message', async () => {
      await service.sendMessage('hello');

      expect(apiSpy.createSession).toHaveBeenCalledWith({
        user_id: 'default-user',
      });
      expect(service.sessionId()).toBe('test-session');
    });

    it('should create placeholder assistant message with isStreaming', async () => {
      await service.sendMessage('hello');

      const msgs = service.messages();
      const assistant = msgs[1];
      expect(assistant.role).toBe('assistant');
      expect(assistant.content).toBe('');
      expect(assistant.isStreaming).toBeTrue();
    });

    it('should set isStreaming to true', async () => {
      await service.sendMessage('hello');
      expect(service.isStreaming()).toBeTrue();
    });

    it('should subscribe to runAgentStream', async () => {
      await service.sendMessage('hello');
      expect(apiSpy.runAgentStream).toHaveBeenCalledWith('test-session', {
        user_id: 'default-user',
        message: 'hello',
      });
    });
  });

  describe('SSE event handling', () => {
    beforeEach(async () => {
      // Setup: send a message to get into streaming state
      const sessionSubject = new Subject<{ session_id: string }>();
      apiSpy.createSession.and.returnValue(sessionSubject.asObservable());

      const promise = service.sendMessage('hello');
      sessionSubject.next({ session_id: 'test-session' });
      sessionSubject.complete();
      await promise;
    });

    it('should append text content from SSE events', () => {
      sseSubject.next({
        author: 'user_intent_agent_v2',
        content: { parts: [{ text: 'Analyzing ' }] },
        partial: true,
        is_final: false,
      });

      sseSubject.next({
        author: 'user_intent_agent_v2',
        content: { parts: [{ text: 'your request.' }] },
        partial: false,
        is_final: false,
      });

      const msgs = service.messages();
      const assistant = msgs[msgs.length - 1];
      expect(assistant.content).toBe('Analyzing your request.');
    });

    it('should update pipeline step to running', () => {
      sseSubject.next({
        author: 'user_intent_agent_v2',
        content: null,
        partial: true,
        is_final: false,
      });

      const pipeline = service.agentPipeline();
      const intentStep = pipeline.find((s) => s.agent === 'user_intent_agent_v2');
      expect(intentStep?.status).toBe('running');
    });

    it('should mark prior agents as completed when later agent emits', () => {
      sseSubject.next({
        author: 'schema_proposal_agent_v1',
        content: null,
        partial: false,
        is_final: false,
      });

      const pipeline = service.agentPipeline();
      expect(pipeline[0].status).toBe('completed'); // user_intent_agent_v2
      expect(pipeline[1].status).toBe('completed'); // file_suggestion_agent_v3
      expect(pipeline[2].status).toBe('running'); // schema_proposal_agent_v1
      expect(pipeline[3].status).toBe('pending'); // graph_construction_agent_v1
    });

    it('should finalize on stream complete', () => {
      // Spy on getSessionState to prevent HTTP call
      const stateSubject = new Subject<any>();
      apiSpy.getSessionState.and.returnValue(stateSubject.asObservable());

      sseSubject.complete();

      expect(service.isStreaming()).toBeFalse();
      const msgs = service.messages();
      const assistant = msgs[msgs.length - 1];
      expect(assistant.isStreaming).toBeFalse();
    });

    it('should set error on stream error after retries exhausted', (done) => {
      // Install fake timers so retry backoff resolves instantly
      jasmine.clock().install();

      sseSubject.error(new Error('connection lost'));

      // Advance past all retry delays: 1s + 2s + 4s
      jasmine.clock().tick(8000);

      // Use setTimeout to let microtasks flush
      setTimeout(() => {
        expect(service.isStreaming()).toBeFalse();
        expect(service.error()).toContain('connection lost');
        jasmine.clock().uninstall();
        done();
      }, 0);
      jasmine.clock().tick(1);
    });
  });

  describe('startNewChat', () => {
    it('should reset all state', () => {
      service.startNewChat();

      expect(service.sessionId()).toBeNull();
      expect(service.messages()).toEqual([]);
      expect(service.error()).toBeNull();
      expect(service.isStreaming()).toBeFalse();
    });
  });

  describe('cancelStream', () => {
    it('should set isStreaming to false', () => {
      service.isStreaming.set(true);
      service.cancelStream();
      expect(service.isStreaming()).toBeFalse();
    });
  });
});
