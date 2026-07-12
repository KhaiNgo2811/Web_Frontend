import { computed, inject, Injectable, signal } from '@angular/core';
import type { Observable } from 'rxjs';

import { WalletRepository } from '../data';
import type {
  BoostDuration,
  WalletFeedback,
  WalletSummary,
  WalletTransactionFilter,
} from '../models';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class WalletStore {
  private readonly repository = inject(WalletRepository);
  private readonly session = inject(SessionStore);
  private readonly summaryState = signal<WalletSummary | null>(null);
  private readonly loadingState = signal(false);
  private readonly pendingActionState = signal<string | null>(null);
  private readonly errorState = signal<string | null>(null);
  private readonly feedbackState = signal<WalletFeedback | null>(null);
  private readonly transactionFilterState = signal<WalletTransactionFilter>('all');
  private readonly selectedPostIdState = signal<string | null>(null);
  private readonly selectedBoostDaysState = signal<BoostDuration>(1);

  readonly summary = this.summaryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly pendingAction = this.pendingActionState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly feedback = this.feedbackState.asReadonly();
  readonly transactionFilter = this.transactionFilterState.asReadonly();
  readonly selectedPostId = this.selectedPostIdState.asReadonly();
  readonly selectedBoostDays = this.selectedBoostDaysState.asReadonly();
  readonly filteredTransactions = computed(() => {
    const transactions = this.summaryState()?.transactions ?? [];
    const filter = this.transactionFilterState();
    return filter === 'all'
      ? transactions
      : transactions.filter((transaction) => transaction.direction === filter);
  });

  load(): void {
    const userId = this.userId();
    if (!userId) {
      this.summaryState.set(null);
      this.errorState.set('Vui lòng đăng nhập để mở ví Ant Xu.');
      return;
    }
    this.loadingState.set(true);
    this.errorState.set(null);
    this.repository.getSummary(userId).subscribe({
      next: (summary) => this.acceptSummary(summary),
      error: (error: unknown) => this.fail(error, true),
      complete: () => this.loadingState.set(false),
    });
  }

  claimEarning(activityId: string): void {
    const userId = this.userId();
    if (!userId) return;
    this.mutate(
      `earning:${activityId}`,
      this.repository.claimEarning({ userId, activityId }),
      'Đã cộng phần thưởng vào ví Ant Xu.',
    );
  }

  purchasePackage(packageId: string): void {
    const userId = this.userId();
    if (!userId) return;
    this.mutate(
      `package:${packageId}`,
      this.repository.purchasePackage({ userId, packageId }),
      'Mua gói Ant Xu thành công.',
    );
  }

  boostSelectedPost(): void {
    const userId = this.userId();
    const postId = this.selectedPostIdState();
    if (!userId || !postId) {
      this.feedbackState.set({ type: 'error', message: 'Vui lòng chọn bài đăng cần đẩy tin.' });
      return;
    }
    this.mutate(
      `boost:${postId}`,
      this.repository.boostPost({
        userId,
        postId,
        durationDays: this.selectedBoostDaysState(),
      }),
      'Đẩy tin thành công.',
    );
  }

  purchaseProviderPlan(planId: 'basic' | 'professional' | 'featured'): void {
    const userId = this.userId();
    if (!userId) return;
    this.mutate(
      `provider-plan:${planId}`,
      this.repository.purchaseProviderPlan({ userId, planId }),
      'Đăng ký gói nhà cung cấp thành công.',
    );
  }

  setTransactionFilter(filter: WalletTransactionFilter): void {
    this.transactionFilterState.set(filter);
  }

  selectPost(id: string): void {
    this.selectedPostIdState.set(id);
  }

  selectBoostDays(days: BoostDuration): void {
    this.selectedBoostDaysState.set(days);
  }

  clearFeedback(): void {
    this.feedbackState.set(null);
    this.errorState.set(null);
  }

  private mutate(action: string, source: Observable<WalletSummary>, successMessage: string): void {
    if (this.pendingActionState()) return;
    this.pendingActionState.set(action);
    this.errorState.set(null);
    this.feedbackState.set(null);
    source.subscribe({
      next: (summary) => this.acceptSummary(summary),
      error: (error: unknown) => this.fail(error),
      complete: () => {
        this.pendingActionState.set(null);
        this.feedbackState.set({ type: 'success', message: successMessage });
        this.session.refreshUser();
      },
    });
  }

  private acceptSummary(summary: WalletSummary): void {
    this.summaryState.set(summary);
    if (
      !this.selectedPostIdState() ||
      !summary.ownedPosts.some((post) => post.id === this.selectedPostIdState())
    ) {
      this.selectedPostIdState.set(summary.ownedPosts[0]?.id ?? null);
    }
  }

  private fail(error: unknown, loading = false): void {
    const message = error instanceof Error ? error.message : 'Không thể cập nhật ví Ant Xu.';
    this.errorState.set(message);
    this.feedbackState.set({ type: 'error', message });
    this.pendingActionState.set(null);
    if (loading) this.loadingState.set(false);
  }

  private userId(): string | null {
    return this.session.currentUser()?.id ?? null;
  }
}
