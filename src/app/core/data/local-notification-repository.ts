import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Notification } from '../models';
import { asObservable, RepositoryError, requireValue } from './local-repository.utils';
import { MockDb } from './mock-db';
import { NotificationRepository } from './repositories';

@Injectable()
export class LocalNotificationRepository extends NotificationRepository {
  private readonly db = inject(MockDb);

  listForUser(userId: string): Observable<Notification[]> {
    return asObservable(() =>
      this.db
        .snapshot()
        .notifications.filter((notification) => notification.userId === userId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    );
  }

  markRead(id: string, userId: string): Observable<Notification> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const notification = requireValue(
          data.notifications.find((candidate) => candidate.id === id),
          'Không tìm thấy thông báo.',
        );
        if (notification.userId !== userId) {
          throw new RepositoryError('Bạn không thể cập nhật thông báo này.');
        }
        notification.read = true;
        return notification;
      }),
    );
  }

  markAllRead(userId: string): Observable<Notification[]> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const notifications = data.notifications.filter(
          (notification) => notification.userId === userId,
        );
        notifications.forEach((notification) => (notification.read = true));
        return notifications;
      }),
    );
  }
}
