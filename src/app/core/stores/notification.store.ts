import { computed, inject, Injectable, signal } from '@angular/core';

import { NotificationRepository } from '../data';
import type { Notification } from '../models';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly repository = inject(NotificationRepository);
  private readonly session = inject(SessionStore);
  private readonly notificationsState = signal<Notification[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly notifications = this.notificationsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly unreadCount = computed(
    () => this.notificationsState().filter((notification) => !notification.read).length,
  );

  load(): void {
    const userId = this.session.currentUser()?.id;
    if (!userId) {
      this.notificationsState.set([]);
      return;
    }
    this.loadingState.set(true);
    this.repository.listForUser(userId).subscribe({
      next: (notifications) => this.notificationsState.set(notifications),
      error: (error: unknown) => this.fail(error),
      complete: () => this.loadingState.set(false),
    });
  }

  markRead(id: string): void {
    const userId = this.session.currentUser()?.id;
    if (!userId) return;
    this.repository.markRead(id, userId).subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.fail(error),
    });
  }

  markAllRead(): void {
    const userId = this.session.currentUser()?.id;
    if (!userId) return;
    this.repository.markAllRead(userId).subscribe({
      next: (notifications) => this.notificationsState.set(notifications),
      error: (error: unknown) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    this.errorState.set(error instanceof Error ? error.message : 'Không thể tải thông báo.');
    this.loadingState.set(false);
  }
}

