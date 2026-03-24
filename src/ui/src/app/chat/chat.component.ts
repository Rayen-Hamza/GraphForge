import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [RouterOutlet, ChatSidebarComponent],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css'],
})
export class ChatComponent {}
