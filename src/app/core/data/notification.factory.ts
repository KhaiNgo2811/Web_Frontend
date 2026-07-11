import type { Notification } from '../models';
import { createEntityId, nowIso } from './local-repository.utils';

type NotificationDraft = Omit<Notification, 'id' | 'createdAt' | 'read'>;

export function createNotification(draft: NotificationDraft): Notification {
  return {
    ...draft,
    id: createEntityId('notification'),
    read: false,
    createdAt: nowIso(),
  };
}
