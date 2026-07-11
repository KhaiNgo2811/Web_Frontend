import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Conversation, Message, SendMessageInput } from '../models';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { MockDb } from './mock-db';
import { createNotification } from './notification.factory';
import { ConversationRepository } from './repositories';

@Injectable()
export class LocalConversationRepository extends ConversationRepository {
  private readonly db = inject(MockDb);

  listForUser(userId: string): Observable<Conversation[]> {
    return asObservable(() =>
      this.db
        .snapshot()
        .conversations.filter((conversation) => conversation.participantIds.includes(userId))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    );
  }

  getById(id: string, userId: string): Observable<Conversation | undefined> {
    return asObservable(() =>
      this.db
        .snapshot()
        .conversations.find(
          (conversation) => conversation.id === id && conversation.participantIds.includes(userId),
        ),
    );
  }

  listMessages(conversationId: string, userId: string): Observable<Message[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      const conversation = data.conversations.find(
        (candidate) => candidate.id === conversationId && candidate.participantIds.includes(userId),
      );
      if (!conversation) {
        throw new RepositoryError('Bạn không thuộc cuộc trò chuyện này.');
      }
      return data.messages
        .filter((message) => message.conversationId === conversationId && !message.hidden)
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    });
  }

  sendMessage(input: SendMessageInput): Observable<Message> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const conversation = requireValue(
          data.conversations.find((candidate) => candidate.id === input.conversationId),
          'Không tìm thấy cuộc trò chuyện.',
        );
        if (!conversation.participantIds.includes(input.senderId)) {
          throw new RepositoryError('Bạn không thuộc cuộc trò chuyện này.');
        }
        if (!input.content.trim()) {
          throw new RepositoryError('Tin nhắn không được để trống.');
        }

        const now = nowIso();
        const message: Message = {
          id: createEntityId('message'),
          conversationId: conversation.id,
          orderId: conversation.orderId,
          senderId: input.senderId,
          kind: input.kind,
          content: input.content.trim(),
          hidden: false,
          attachment: input.attachment,
          createdAt: now,
        };
        data.messages.push(message);
        conversation.updatedAt = now;
        const recipientId = conversation.participantIds.find((id) => id !== input.senderId);
        if (recipientId) {
          data.notifications.push(
            createNotification({
              userId: recipientId,
              type: 'message_received',
              title: 'Tin nhắn mới',
              body: input.kind === 'text' ? message.content : 'Bạn nhận được một tệp đính kèm.',
              route: `/messages/${conversation.id}`,
              orderId: conversation.orderId,
            }),
          );
        }
        return message;
      }),
    );
  }
}
