import { Component, computed, input, output } from '@angular/core';

import type { Post, ServiceCategory, User } from '../../../core/models';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { StatusPill } from '../../../shared/status-pill/status-pill';

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  food: 'Đi chợ & ăn uống',
  laundry: 'Giặt ủi',
  goods: 'Giao nhận đồ',
  repair: 'Sửa chữa',
  support: 'Hỗ trợ',
  other: 'Khác',
};

@Component({
  selector: 'app-post-detail-panel',
  imports: [StarRating, StatusPill],
  templateUrl: './post-detail-panel.html',
  styleUrl: './post-detail-panel.scss',
})
export class PostDetailPanel {
  readonly post = input.required<Post>();
  readonly author = input<User>();
  readonly closed = output<void>();
  readonly acceptRequested = output<Post>();
  readonly messageRequested = output<Post>();

  protected readonly categoryLabel = computed(() => CATEGORY_LABELS[this.post().category]);
  protected readonly typeLabel = computed(() =>
    this.post().type === 'request' ? 'Cần giúp' : 'Cung cấp dịch vụ',
  );
  protected readonly statusLabel = computed(() => {
    const labels = {
      open: 'Đang mở',
      connected: 'Đã kết nối',
      closed: 'Đã đóng',
      expired: 'Hết hạn',
    };
    return labels[this.post().status];
  });
  protected readonly actionLabel = computed(() =>
    this.post().type === 'request' ? 'Nhận việc này' : 'Đặt dịch vụ',
  );
  protected readonly price = computed(() =>
    new Intl.NumberFormat('vi-VN').format(this.post().price),
  );
  protected readonly initials = computed(() =>
    (this.author()?.displayName ?? 'AntGo')
      .split(' ')
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
  );
  protected readonly completionPercent = computed(() =>
    Math.round((this.author()?.completionRate ?? 0) * 100),
  );
  protected readonly reviewPercent = computed(() =>
    Math.round((this.author()?.reviewParticipationRate ?? 0) * 100),
  );
  protected readonly isOpen = computed(() => this.post().status === 'open');
}
