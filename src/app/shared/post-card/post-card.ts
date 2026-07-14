import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Post, ServiceCategory, User } from '../../core/models';
import { StatusPill } from '../status-pill/status-pill';

const CATEGORY_META: Record<ServiceCategory, { icon: string; label: string }> = {
  food: { icon: 'bi-basket2-fill', label: 'Đi chợ & ăn uống' },
  laundry: { icon: 'bi-droplet', label: 'Giặt ủi' },
  goods: { icon: 'bi-box-seam-fill', label: 'Giao nhận đồ' },
  repair: { icon: 'bi-tools', label: 'Sửa chữa' },
  support: { icon: 'bi-hand-thumbs-up-fill', label: 'Hỗ trợ' },
  other: { icon: 'bi-three-dots', label: 'Khác' },
};

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, StatusPill],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  readonly post = input.required<Post>();
  readonly author = input<User>();
  readonly opened = output<Post>();
  readonly acceptRequested = output<Post>();
  readonly likeRequested = output<Post>();
  readonly reportRequested = output<Post>();

  protected readonly category = computed(() => CATEGORY_META[this.post().category]);
  protected readonly typeLabel = computed(() =>
    this.post().type === 'request' ? 'Cần giúp' : 'Cung cấp',
  );
  protected readonly actionLabel = computed(() =>
    this.post().type === 'request' ? 'Nhận việc' : 'Đặt dịch vụ',
  );
  protected readonly priceLabel = computed(() =>
    this.post().type === 'request' ? 'tiền công' : 'giá dịch vụ',
  );
  protected readonly price = computed(() =>
    new Intl.NumberFormat('vi-VN').format(this.post().price),
  );
  protected readonly authorInitials = computed(() => {
    const name = this.author()?.displayName ?? 'AntGo';
    return name
      .split(' ')
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  });
  protected readonly timeLabel = computed(() => {
    const elapsed = Math.max(0, Date.now() - new Date(this.post().createdAt).getTime());
    const hours = Math.floor(elapsed / 3_600_000);
    if (hours < 1) return 'Vừa đăng';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Hôm qua' : `${days} ngày trước`;
  });
  protected readonly isOpen = computed(() => this.post().status === 'open');
  protected readonly liked = computed(() => this.post().likedBy.length > 0);
}
