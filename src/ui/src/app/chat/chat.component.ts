import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';
import { ChatService } from '../services/chat.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, RouterOutlet, ChatSidebarComponent],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
})
export class ChatComponent {
    readonly chat = inject(ChatService);
}
