import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ChatComponent } from './chat.component';
import { ChatService } from '../services/chat.service';
import { AGENT_PIPELINE_ORDER } from '../models/chat.models';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let chatServiceSpy: jasmine.SpyObj<ChatService>;

  beforeEach(async () => {
    chatServiceSpy = jasmine.createSpyObj(
      'ChatService',
      ['sendMessage', 'startNewChat', 'cancelStream'],
      {
        messages: signal([]),
        isStreaming: signal(false),
        error: signal(null),
        conversations: signal([]),
        graphStats: signal({ nodes: 0, edges: 0, clusters: 0 }),
        agentPipelineWithDuration: signal(
          AGENT_PIPELINE_ORDER.map((name) => ({
            agent: name,
            status: 'pending' as const,
            description: 'Idle',
          })),
        ),
        userId: signal('default-user'),
        sessionId: signal(null),
        agentPipeline: signal([]),
      },
    );

    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ChatService, useValue: chatServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when no messages', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.empty-state')).toBeTruthy();
  });

  it('should delegate sendMessage to ChatService', () => {
    component.inputText = 'hello world';
    component.sendMessage();

    expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith('hello world');
    expect(component.inputText).toBe('');
  });

  it('should not send empty messages', () => {
    component.inputText = '   ';
    component.sendMessage();

    expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('should not send when streaming', () => {
    (chatServiceSpy.isStreaming as any).set(true);
    component.inputText = 'hello';
    component.sendMessage();

    expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
  });

  it('should delegate startNewChat to ChatService', () => {
    component.startNewChat();
    expect(chatServiceSpy.startNewChat).toHaveBeenCalled();
  });

  it('should delegate cancelStream to ChatService', () => {
    component.cancelStream();
    expect(chatServiceSpy.cancelStream).toHaveBeenCalled();
  });

  it('should dismiss error by setting it to null', () => {
    (chatServiceSpy.error as any).set('some error');
    component.dismissError();
    expect(chatServiceSpy.error()).toBeNull();
  });

  it('should disable send button when streaming', async () => {
    (chatServiceSpy.isStreaming as any).set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const sendBtn = fixture.nativeElement.querySelector('.send-btn') as HTMLButtonElement;
    expect(sendBtn.disabled).toBeTrue();
  });

  it('should show error banner when error is set', async () => {
    (chatServiceSpy.error as any).set('Backend unreachable');
    fixture.detectChanges();
    await fixture.whenStable();

    const banner = fixture.nativeElement.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Backend unreachable');
  });

  it('should show streaming indicator when streaming', async () => {
    (chatServiceSpy.isStreaming as any).set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const indicator = fixture.nativeElement.querySelector('.streaming-indicator');
    expect(indicator).toBeTruthy();
  });

  it('should populate suggestion on click', () => {
    component.useSuggestion('Map AI research');
    expect(component.inputText).toBe('Map AI research');
  });
});
