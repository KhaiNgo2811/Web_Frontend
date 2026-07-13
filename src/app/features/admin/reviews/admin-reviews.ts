import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { AdminConfirmationRequest, AdminReviewSummary } from '../../../core/models';
import { AdminReviewStore } from '../../../core/stores';
import { adminAvatarColor, adminInitials } from '../shared/admin-avatar.utils';
import { adminLabel } from '../shared/admin-labels';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminPagination } from '../shared/admin-pagination/admin-pagination';

type ReviewTab = 'all' | 'reported' | 'hidden' | 'lowReputation' | 'watching';
type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type TimeRangeFilter = '7d' | '30d' | '90d' | 'all';

@Component({
  selector: 'app-admin-reviews',
  imports: [AdminConfirmDialog, AdminPagination, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './admin-reviews.html',
  styleUrl: './admin-reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReviews implements OnInit {
  protected readonly store = inject(AdminReviewStore);
  protected readonly label = adminLabel;
  protected readonly getInitials = adminInitials;
  protected readonly avatarColor = adminAvatarColor;

  protected readonly statsHidden = signal(false);
  protected readonly activeTab = signal<ReviewTab>('all');
  protected readonly search = signal('');
  protected readonly starsFilter = signal<StarFilter>('all');
  protected readonly timeRangeFilter = signal<TimeRangeFilter>('7d');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(4);
  protected readonly pendingReview = signal<{ review: AdminReviewSummary; hidden: boolean } | null>(
    null,
  );

  private readonly lowReputationRateeIds = computed(
    () => new Set(this.store.flaggedAccounts().map((flagged) => flagged.user.id)),
  );

  protected readonly tabCounts = computed(() => {
    const reviews = this.store.reviews();
    return {
      all: reviews.length,
      reported: reviews.filter((review) => review.status === 'reported').length,
      hidden: reviews.filter((review) => review.status === 'hidden').length,
      lowReputation: reviews.filter((review) => review.lowReputationRatee).length,
      watching: reviews.filter((review) => review.watched).length,
    };
  });

  protected readonly averageRating = computed(() => {
    const reviews = this.store.reviews();
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length;
  });

  protected readonly filteredReviews = computed(() => {
    const tab = this.activeTab();
    const query = this.search().trim().toLocaleLowerCase('vi');
    const stars = this.starsFilter();
    const range = this.timeRangeFilter();
    const cutoff = this.rangeCutoff(range);

    return this.store.reviews().filter((review) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'reported' && review.status === 'reported') ||
        (tab === 'hidden' && review.status === 'hidden') ||
        (tab === 'lowReputation' && review.lowReputationRatee) ||
        (tab === 'watching' && review.watched);
      const matchesSearch =
        !query ||
        review.rater?.displayName.toLocaleLowerCase('vi').includes(query) ||
        review.ratee?.displayName.toLocaleLowerCase('vi').includes(query) ||
        review.comment?.toLocaleLowerCase('vi').includes(query);
      const matchesStars = stars === 'all' || review.stars === stars;
      const matchesRange = !cutoff || new Date(review.createdAt) >= cutoff;
      return matchesTab && matchesSearch && matchesStars && matchesRange;
    });
  });

  protected readonly visibleReviews = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredReviews().slice(start, start + this.pageSize());
  });

  protected readonly confirmationRequest = computed<AdminConfirmationRequest>(() => {
    const pending = this.pendingReview();
    const hiding = pending?.hidden ?? true;
    return {
      title: hiding ? 'Ẩn đánh giá này?' : 'Khôi phục đánh giá này?',
      message: hiding
        ? 'Đánh giá sẽ không còn hiển thị công khai và được ghi vào nhật ký kiểm toán.'
        : 'Đánh giá sẽ hiển thị công khai trở lại.',
      confirmLabel: hiding ? 'Ẩn đánh giá' : 'Khôi phục',
      cancelLabel: 'Hủy',
      tone: hiding ? 'danger' : 'default',
    };
  });

  ngOnInit(): void {
    this.store.load();
  }

  protected setTab(tab: ReviewTab): void {
    this.activeTab.set(tab);
    this.page.set(1);
  }

  protected updateSearch(event: Event): void {
    this.page.set(1);
    this.search.set(this.valueOf(event));
  }

  protected updateStars(event: Event): void {
    this.page.set(1);
    const value = this.valueOf(event);
    this.starsFilter.set(value === 'all' ? 'all' : (Number(value) as StarFilter));
  }

  protected updateTimeRange(event: Event): void {
    this.page.set(1);
    this.timeRangeFilter.set(this.valueOf(event) as TimeRangeFilter);
  }

  protected toggleStats(): void {
    this.statsHidden.update((hidden) => !hidden);
  }

  protected requestVisibility(review: AdminReviewSummary, hidden: boolean): void {
    this.pendingReview.set({ review, hidden });
  }

  protected confirmVisibility(): void {
    const pending = this.pendingReview();
    this.pendingReview.set(null);
    if (!pending) return;
    this.store.setVisibility(pending.review.id, pending.hidden);
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected starsArray(count: number): number[] {
    return Array.from({ length: 5 }, (_, index) => (index < count ? 1 : 0));
  }

  protected statusLabel(status: AdminReviewSummary['status']): string {
    return { visible: 'Hiển thị', hidden: 'Đã ẩn', reported: 'Bị báo cáo' }[status];
  }

  protected refresh(): void {
    this.store.load();
  }

  private rangeCutoff(range: TimeRangeFilter): Date | null {
    if (range === 'all') return null;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  }

  private valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target.value
      : '';
  }
}
