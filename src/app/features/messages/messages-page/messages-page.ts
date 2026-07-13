import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import type { Conversation, MessageKind } from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StatusPill } from '../../../shared/status-pill/status-pill';

@Component({
  selector: 'app-messages-page',
  imports: [FormsModule, EmptyState, StatusPill],
  templateUrl: './messages-page.html',
  styleUrls: ['./messages-page.scss', './messages-thread.scss'],
})
export class MessagesPage {
  protected readonly store = inject(MarketplaceStore);
  protected readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly roleTab = signal<'posted' | 'accepted'>('posted');
  protected readonly selectedId = signal<string | null>(
    this.route.snapshot.paramMap.get('conversationId'),
  );
  protected draft = '';
  protected readonly selected = computed<Conversation | undefined>(() => {
    const conversations = this.store.conversations();
    return conversations.find((item) => item.id === this.selectedId()) ?? conversations[0];
  });
  protected readonly conversationMessages = computed(() =>
    this.store.messages().filter((message) => message.conversationId === this.selected()?.id),
  );
  protected readonly currentUserId = computed(() => this.session.currentUser()?.id ?? 'user-demo');

  protected peerName(conversation: Conversation | undefined): string {
    const peerId = conversation?.participantIds.find((id) => id !== this.currentUserId());
    return this.store.users().find((user) => user.id === peerId)?.displayName ?? 'Thành viên AntGo';
  }

  protected postTitle(conversation: Conversation | undefined): string {
    return (
      this.store.posts().find((post) => post.id === conversation?.postId)?.title ??
      'Cuộc trò chuyện'
    );
  }

  protected selectConversation(id: string): void {
    this.selectedId.set(id);
    void this.router.navigate(['/messages', id]);
  }

  protected send(kind: MessageKind = 'text'): void {
    const conversation = this.selected();
    if (!conversation || (!this.draft.trim() && kind === 'text')) return;
    const content =
      kind === 'text'
        ? this.draft.trim()
        : kind === 'image'
          ? 'Ảnh minh hoạ công việc'
          : 'Mã QR thanh toán mẫu';
    this.store.sendMessage(conversation.id, kind, content);
    this.draft = '';
  }
}
