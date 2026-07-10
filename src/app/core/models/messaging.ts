import type { IsoDateString } from './common';

export type MessageKind = 'text' | 'image' | 'qr';

export interface Conversation {
  id: string;
  postId: string;
  orderId?: string;
  participantIds: [string, string];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface MessageAttachment {
  url: string;
  name?: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  orderId?: string;
  senderId: string;
  kind: MessageKind;
  content: string;
  attachment?: MessageAttachment;
  createdAt: IsoDateString;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  content: string;
  attachment?: MessageAttachment;
}

