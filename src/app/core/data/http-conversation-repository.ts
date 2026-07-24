import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Conversation, Message, SendMessageInput } from '../models';
import { toConversation, toMessage } from './http-mappers';
import { mapHttpError, notSupported } from './http-repository.utils';
import { ConversationRepository } from './repositories';

interface ListResponse<T> {
  data: T[];
}

@Injectable()
export class HttpConversationRepository extends ConversationRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/conversations`;

  listForUser(_userId: string): Observable<Conversation[]> {
    return this.http.get<ListResponse<Record<string, unknown>>>(this.baseUrl).pipe(
      map(({ data }) => data.map(toConversation)),
      mapHttpError(),
    );
  }

  /**
   * Backend has no direct GET /api/conversations/:id — only the "my
   * conversations" list and getConversationByOrder. Fetch the list and find
   * client-side (extra gap beyond CLAUDE.md's documented list).
   */
  getById(id: string, userId: string): Observable<Conversation | undefined> {
    return this.listForUser(userId).pipe(
      map((conversations) => conversations.find((c) => c.id === id)),
    );
  }

  listMessages(conversationId: string, _userId: string): Observable<Message[]> {
    return this.http
      .get<ListResponse<Record<string, unknown>>>(`${this.baseUrl}/${conversationId}/messages`)
      .pipe(
        map(({ data }) => data.map(toMessage)),
        mapHttpError(),
      );
  }

  /** Backend only creates conversations as a side effect of order selection (see CLAUDE.md "Backend" known gaps) — there's no endpoint to start one from a post directly. */
  startForPost(_viewerId: string, _postId: string, _otherUserId: string): Observable<Conversation> {
    return notSupported('Nhắn tin trước khi có đơn hàng chưa được antgo-backend hỗ trợ.');
  }

  sendMessage(input: SendMessageInput): Observable<Message> {
    return this.http
      .post<Record<string, unknown>>(`${this.baseUrl}/${input.conversationId}/messages`, {
        kind: input.kind,
        content: input.content,
        attachment: input.attachment,
      })
      .pipe(map(toMessage), mapHttpError());
  }
}
