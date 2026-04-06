import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ChatService } from '../../services/chat.service';
import { Neo4jConnectComponent } from '../../settings/neo4j-connect.component';

@Component({
    selector: 'app-chat-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, Neo4jConnectComponent],
    templateUrl: './chat-sidebar.component.html',
    styleUrls: ['./chat-sidebar.component.css'],
})
export class ChatSidebarComponent {
    private readonly chat = inject(ChatService);
    private readonly router = inject(Router);

    conversations = this.chat.conversations;
    mobileSidebarOpen = this.chat.mobileSidebarOpen;

    sidebarCollapsed = signal(false);
    searchQuery = '';

    /** Auto-expand sidebar when opened on mobile */
    private mobileExpandEffect = effect(() => {
        if (this.mobileSidebarOpen()) {
            this.sidebarCollapsed.set(false);
        }
    });

    filteredConversations = computed(() => {
        const q = this.searchQuery.toLowerCase();
        if (!q) return this.conversations();
        return this.conversations().filter(c =>
            c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
        );
    });

    selectConversation(id: string) {
        this.router.navigate(['/chat', id]);
        this.chat.mobileSidebarOpen.set(false);
    }

    startNewChat() {
        this.chat.startNewChat();
        this.router.navigate(['/chat']);
        this.chat.mobileSidebarOpen.set(false);
    }
}
