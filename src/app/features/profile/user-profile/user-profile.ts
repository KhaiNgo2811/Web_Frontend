import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { ServiceCategory } from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

const REPORT_REASONS: readonly string[] = [
  'Giả mạo danh tính',
  'Lừa đảo, gian lận',
  'Quấy rối, hành vi không phù hợp',
  'Spam bài đăng',
  'Lý do khác',
];

@Component({
  selector: 'app-user-profile',
  imports: [FormsModule, RouterLink, EmptyState, StarRating, UiDialog],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(MarketplaceStore);
  private readonly session = inject(SessionStore);

  protected readonly reportReasons = REPORT_REASONS;
  protected readonly selectedReportReason = signal(REPORT_REASONS[0]);
  protected reportDetails = '';
  protected readonly showReport = signal(false);

  private readonly userId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly isSelf = computed(() => this.session.currentUser()?.id === this.userId);

  protected readonly user = computed(() =>
    this.store.users().find((candidate) => candidate.id === this.userId),
  );

  protected readonly initials = computed(() => {
    const name = this.user()?.displayName ?? 'AntGo';
    return name
      .split(' ')
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  });

  protected readonly isTrusted = computed(() => {
    const user = this.user();
    return !!user && (user.reputationScore ?? 0) >= 4.5 && user.completedCount >= 10;
  });

  protected readonly openPosts = computed(() =>
    this.store
      .posts()
      .filter((post) => post.authorId === this.userId && post.status === 'open')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );

  protected readonly reviews = computed(() => {
    const rawReviews = this.store
      .reviews()
      .filter((review) => review.rateeId === this.userId && !review.hidden)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const usersById = new Map(this.store.users().map((candidate) => [candidate.id, candidate]));
    return rawReviews.map((review) => ({
      review,
      rater: usersById.get(review.raterId),
    }));
  });

  protected joinLabel(iso: string): string {
    const date = new Date(iso);
    return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  protected timeAgo(iso: string): string {
    const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
    const hours = Math.floor(elapsed / 3_600_000);
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return `${Math.floor(days / 7)} tuần trước`;
  }

  protected categoryLabel(category: ServiceCategory): string {
    const labels: Record<ServiceCategory, string> = {
      food: 'Ăn uống',
      laundry: 'Giặt ủi',
      goods: 'Giao nhận đồ',
      repair: 'Sửa chữa',
      support: 'Hỗ trợ',
      other: 'Khác',
    };
    return labels[category];
  }

  protected openReport(): void {
    this.selectedReportReason.set(REPORT_REASONS[0]);
    this.reportDetails = '';
    this.showReport.set(true);
  }

  protected closeReport(): void {
    this.showReport.set(false);
  }

  protected submitReport(): void {
    this.showReport.set(false);
  }
}
