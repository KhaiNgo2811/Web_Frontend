import type { IsoDateString } from './common';

export type NotificationType =
  | 'application_received'
  | 'application_selected'
  | 'order_started'
  | 'work_reported_done'
  | 'order_completed'
  | 'order_cancelled'
  | 'message_received'
  | 'review_received';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  route?: string;
  orderId?: string;
  read: boolean;
  createdAt: IsoDateString;
}
