import { Injectable, computed, inject, signal } from '@angular/core';

import type { AuditEvent, AuditFilter, ExportJob } from '../models';
import { AuditRepository } from '../data';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AdminAuditStore {
  private readonly repository = inject(AuditRepository);
  private readonly session = inject(SessionStore);
  private readonly eventsState = signal<AuditEvent[]>([]);
  private readonly exportsState = signal<ExportJob[]>([]);
  private readonly filterState = signal<AuditFilter>({});
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly exportStateSignal = signal<'idle' | 'pending' | 'success' | 'error'>('idle');
  private pendingOperations = 0;
  private loadRequest = 0;

  readonly events = this.eventsState.asReadonly();
  readonly exports = this.exportsState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly exportState = this.exportStateSignal.asReadonly();
  readonly latestExport = computed(() => this.exportsState()[0] ?? null);

  load(): void {
    const request = ++this.loadRequest;
    const actorId = this.actorId();
    this.run(this.repository.list(actorId, this.filterState()), (events) => {
      if (request === this.loadRequest) this.eventsState.set(events);
    });
    this.run(this.repository.listExports(actorId), (jobs) => {
      if (request === this.loadRequest) this.exportsState.set(jobs);
    });
  }

  setFilter(partial: Partial<AuditFilter>): void {
    this.filterState.update((filter) => ({ ...filter, ...partial }));
    this.load();
  }

  requestExport(): void {
    this.exportStateSignal.set('pending');
    this.run(
      this.repository.requestExport(this.actorId()),
      () => this.load(),
      () => this.exportStateSignal.set('error'),
      () => this.exportStateSignal.set('success'),
    );
  }

  clearExportState(): void {
    this.exportStateSignal.set('idle');
  }

  private actorId(): string {
    return this.session.currentUser()?.id ?? '';
  }

  private run<T>(
    source: import('rxjs').Observable<T>,
    next: (value: T) => void,
    onError?: () => void,
    onComplete?: () => void,
  ): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next,
      error: (error: unknown) => {
        onError?.();
        this.fail(error);
      },
      complete: () => {
        onComplete?.();
        this.finish();
      },
    });
  }

  private fail(error: unknown): void {
    this.errorState.set(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }
}
