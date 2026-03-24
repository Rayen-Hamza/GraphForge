import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../services/chat.service';

@Component({
    selector: 'app-chat-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './chat-sidebar.component.html',
    styleUrls: ['./chat-sidebar.component.css'],
})
export class ChatSidebarComponent {
    private readonly chat = inject(ChatService);
    private readonly router = inject(Router);

    conversations = this.chat.conversations;

    sidebarCollapsed = signal(false);
    searchQuery = '';

    filteredConversations = computed(() => {
        const q = this.searchQuery.toLowerCase();
        if (!q) return this.conversations();
        return this.conversations().filter(c =>
            c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
        );
    });

    selectConversation(id: string) {
        this.router.navigate(['/chat', id]);
    }

    startNewChat() {
        this.chat.startNewChat();
        this.router.navigate(['/chat']);
    }
}
