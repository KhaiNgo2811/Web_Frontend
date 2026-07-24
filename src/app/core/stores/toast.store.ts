import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

const DEFAULT_DURATION_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastStore {
  private readonly messageState = signal<ToastMessage | null>(null);
  private nextId = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly message = this.messageState.asReadonly();

  show(text: string, tone: ToastTone = 'success', durationMs = DEFAULT_DURATION_MS): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.nextId += 1;
    this.messageState.set({ id: this.nextId, text, tone });
    this.timeoutId = setTimeout(() => this.messageState.set(null), durationMs);
  }

  dismiss(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.messageState.set(null);
  }
}
