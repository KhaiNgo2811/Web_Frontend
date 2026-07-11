import { Injectable, computed, inject, signal } from '@angular/core';

import type { AdminOperationState, InboxFilter, InboxItem } from '../models';
import { InboxRepository } from '../data';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AdminInboxStore {
  private readonly repository = inject(InboxRepository);
  private readonly session = inject(SessionStore);
  private readonly itemsState = signal<InboxItem[]>([]);
  private readonly selectedIdsState = signal<string[]>([]);
  private readonly filterState = signal<InboxFilter>({ savedView: 'all_open' });
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly operationState = signal<AdminOperationState>({ status: 'idle' });
  private pendingOperations = 0;
  private listRequest = 0;

  readonly items = this.itemsState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly selectedIds = this.selectedIdsState.asReadonly();
  readonly operation = this.operationState.asReadonly();
  readonly selected = computed(() =>
    this.items().filter((item) => this.selectedIds().includes(item.id)),
  );

  load(): void {
    const request = ++this.listRequest;
    const actorId = this.session.currentUser()?.id ?? '';
    this.begin();
    this.errorState.set(null);
    this.repository.list(actorId, this.filterState()).subscribe({
      next: (items) => {
        if (request !== this.listRequest) return;
        this.itemsState.set(items);
        this.selectedIdsState.update((ids) =>
          ids.filter((id) => items.some((item) => item.id === id)),
        );
      },
      error: (error: unknown) => this.fail(error),
      complete: () => this.finish(),
    });
  }

  setFilter(partial: Partial<InboxFilter>): void {
    this.filterState.update((filter) => ({ ...filter, ...partial }));
    this.load();
  }

  toggle(item: InboxItem): void {
    this.selectedIdsState.update((ids) =>
      ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id],
    );
  }

  assignSelected(assigneeId?: string, handoffNote?: string): void {
    const actorId = this.session.currentUser()?.id ?? '';
    const selected = this.selected();
    if (!selected.length) return;
    this.operationState.set({ status: 'loading', message: 'Đang phân công công việc.' });
    this.begin();
    this.repository.assign({ actorId, items: selected, assigneeId, handoffNote }).subscribe({
      next: () => {
        this.selectedIdsState.set([]);
        this.operationState.set({ status: 'success', message: 'Đã cập nhật phân công.' });
        this.load();
      },
      error: (error: unknown) => {
        this.operationState.set({ status: 'error', message: this.errorMessage(error) });
        this.fail(error);
      },
      complete: () => this.finish(),
    });
  }

  private fail(error: unknown): void {
    this.errorState.set(this.errorMessage(error));
    this.finish();
  }

  private begin(): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
  }
}
