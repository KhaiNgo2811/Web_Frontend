import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type {
  Application,
  Order,
  OrderAction,
  OrderStatus,
  ServiceCategory,
} from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { StatusPill } from '../../../shared/status-pill/status-pill';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

type WorkspaceTab = 'posts' | 'accepted' | 'booked';
type DialogName = 'review' | 'reviewSuccess' | 'cancel' | 'report' | 'completeSuccess' | null;

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  food: 'Ăn uống',
  laundry: 'Giặt ủi',
  goods: 'Giao nhận đồ',
  repair: 'Sửa chữa',
  support: 'Hỗ trợ',
  other: 'Khác',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'CHỜ BẮT ĐẦU',
  in_progress: 'ĐANG THỰC HIỆN',
  completed: 'HOÀN THÀNH',
  cancelled: 'ĐÃ HUỶ',
};

const TIMELINE_STEP_META: Record<OrderStatus, { title: string; desc: string }> = {
  pending: { title: 'Đối tác nhận đơn', desc: 'Thoả thuận giao nhận được tự động thiết lập' },
  in_progress: { title: 'Bắt đầu thực hiện đơn hàng', desc: 'Đối tác đang tiến hành công việc' },
  completed: { title: 'Đơn hàng hoàn thành', desc: 'Cảm ơn bạn đã sử dụng AntGo!' },
  cancelled: { title: 'Đơn hàng đã huỷ', desc: 'Đơn đã được huỷ theo yêu cầu' },
};

const CANCEL_REASONS: readonly string[] = [
  'Tôi đã tìm được người khác',
  'Người nhận không phản hồi',
  'Yêu cầu thay đổi thông tin',
  'Lý do cá nhân khác',
];

const REPORT_REASONS: readonly string[] = [
  'Dịch vụ không đúng mô tả',
  'Không nhận được tiền công',
  'Hành vi không phù hợp',
  'Thông tin sai lệch',
  'Lý do khác',
];

const REVIEW_TAGS: readonly string[] = ['Đúng giá', 'Thân thiện', 'Chất lượng tốt', 'Đúng mô tả'];

const MAX_EVIDENCE_IMAGES = 3;

interface TimelineStep {
  at: string;
  title: string;
  desc: string;
}

@Component({
  selector: 'app-orders-workspace',
  imports: [DatePipe, FormsModule, RouterLink, EmptyState, StarRating, StatusPill, UiDialog],
  templateUrl: './orders-workspace.html',
  styleUrls: ['./orders-workspace.scss', './orders-detail.scss'],
})
export class OrdersWorkspace {
  protected readonly store = inject(MarketplaceStore);
  protected readonly session = inject(SessionStore);
  protected readonly tab = signal<WorkspaceTab>('booked');
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly selectedApplicationId = signal<string | null>(null);
  protected readonly mobileDetailOpen = signal(false);
  protected readonly dialog = signal<DialogName>(null);

  protected readonly cancelReasons = CANCEL_REASONS;
  protected readonly reportReasons = REPORT_REASONS;
  protected readonly reviewTags = REVIEW_TAGS;
  protected readonly maxEvidenceImages = MAX_EVIDENCE_IMAGES;

  protected readonly rating = signal(5);
  protected readonly selectedTags = signal<Set<string>>(new Set());
  protected reviewComment = '';

  protected readonly selectedCancelReason = signal(CANCEL_REASONS[0]);
  protected cancelNote = '';

  protected readonly selectedReportReason = signal(REPORT_REASONS[0]);
  protected reportDescription = '';
  protected readonly reportEvidence = signal<string[]>([]);

  protected readonly currentUserId = computed(() => this.session.currentUser()?.id ?? 'user-demo');
  protected readonly ownPosts = computed(() =>
    this.store.posts().filter((post) => post.authorId === this.currentUserId()),
  );
  protected readonly selectedOrder = computed<Order | undefined>(() => {
    const orders = this.store.orders();
    return orders.find((order) => order.id === this.selectedOrderId()) ?? orders[0];
  });
  protected readonly selectedApplication = computed<Application | undefined>(() => {
    const applications = this.store.applications();
    return applications.find((item) => item.id === this.selectedApplicationId()) ?? applications[0];
  });
  protected readonly selectedPost = computed(() => {
    const id =
      this.tab() === 'accepted' ? this.selectedApplication()?.postId : this.selectedOrder()?.postId;
    return this.store.posts().find((post) => post.id === id);
  });

  protected readonly provider = computed(() => {
    const order = this.selectedOrder();
    return order ? this.store.users().find((u) => u.id === order.providerId) : undefined;
  });

  protected readonly orderStatusLabel = computed(() => {
    const order = this.selectedOrder();
    return order ? STATUS_LABELS[order.status] : '';
  });

  protected readonly categoryLabel = computed(() => {
    const category = this.selectedPost()?.category;
    return category ? CATEGORY_LABELS[category] : '';
  });

  protected readonly deliveryLocation = computed(() => {
    const order = this.selectedOrder();
    const customer = order ? this.store.users().find((u) => u.id === order.customerId) : undefined;
    if (!customer) return 'Trong khu vực của bạn';
    const room = customer.location.room ? `Phòng ${customer.location.room}, ` : '';
    const university = customer.university ? ` · ${customer.university}` : '';
    return `${room}Toà ${customer.location.building}${university}`;
  });

  protected readonly deadlineCountdown = computed(() => {
    const order = this.selectedOrder();
    const post = this.selectedPost();
    if (!order || !post || order.status === 'completed' || order.status === 'cancelled') return '';
    const remainingMs = new Date(post.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) return '';
    const minutes = Math.round(remainingMs / 60_000);
    if (minutes < 60) return `Hạn chốt còn lại: ${minutes} phút`;
    return `Hạn chốt còn lại: ${Math.round(minutes / 60)} giờ`;
  });

  protected readonly timelineSteps = computed<TimelineStep[]>(() => {
    const order = this.selectedOrder();
    if (!order) return [];
    const steps: TimelineStep[] = [
      {
        at: order.createdAt,
        title: 'Yêu cầu được tạo thành công',
        desc: 'Hệ thống ghi nhận đơn hàng của bạn',
      },
    ];
    for (const entry of order.statusHistory) {
      const meta = TIMELINE_STEP_META[entry.status];
      steps.push({ at: entry.at, title: meta.title, desc: entry.note || meta.desc });
    }
    return steps;
  });

  protected userName(id: string | undefined): string {
    return this.store.users().find((user) => user.id === id)?.displayName ?? 'Thành viên AntGo';
  }

  protected chooseTab(tab: WorkspaceTab): void {
    this.tab.set(tab);
    this.mobileDetailOpen.set(false);
  }

  protected selectApplication(id: string): void {
    this.selectedApplicationId.set(id);
    this.mobileDetailOpen.set(true);
  }

  protected selectOrder(id: string): void {
    this.selectedOrderId.set(id);
    this.mobileDetailOpen.set(true);
  }

  protected closeMobileDetail(): void {
    this.mobileDetailOpen.set(false);
  }

  protected acceptApplication(): void {
    const application = this.selectedApplication();
    if (application) this.store.selectApplication(application.id);
  }

  protected transition(action: OrderAction, reason?: string): void {
    const order = this.selectedOrder();
    if (order) this.store.transitionOrder(order.id, action, reason);
    if (action === 'confirm_complete') this.dialog.set('completeSuccess');
    else this.dialog.set(null);
  }

  protected openReview(): void {
    this.rating.set(5);
    this.selectedTags.set(new Set());
    this.reviewComment = '';
    this.dialog.set('review');
  }

  protected toggleTag(tag: string): void {
    this.selectedTags.update((tags) => {
      const next = new Set(tags);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  protected submitReview(): void {
    const order = this.selectedOrder();
    const tagText = [...this.selectedTags()].join(', ');
    const comment = [this.reviewComment.trim(), tagText].filter(Boolean).join(' — ');
    if (order) this.store.reviewOrder(order.id, this.rating(), comment);
    this.dialog.set('reviewSuccess');
  }

  protected openCancel(): void {
    this.selectedCancelReason.set(CANCEL_REASONS[0]);
    this.cancelNote = '';
    this.dialog.set('cancel');
  }

  protected confirmCancel(): void {
    const reason = [this.selectedCancelReason(), this.cancelNote.trim()].filter(Boolean).join(' — ');
    this.transition('cancel', reason);
  }

  protected openReport(): void {
    this.selectedReportReason.set(REPORT_REASONS[0]);
    this.reportDescription = '';
    this.reportEvidence.set([]);
    this.dialog.set('report');
  }

  protected onPickEvidence(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(
      0,
      this.maxEvidenceImages - this.reportEvidence().length,
    );
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.reportEvidence.update((list) =>
            [...list, reader.result as string].slice(0, this.maxEvidenceImages),
          );
        }
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  protected removeEvidence(index: number): void {
    this.reportEvidence.update((list) => list.filter((_, i) => i !== index));
  }

  protected submitReport(): void {
    const order = this.selectedOrder();
    if (order) {
      this.store.fileComplaint({
        orderId: order.id,
        respondentId: order.providerId,
        subject: this.selectedReportReason(),
        description: [
          `Báo cáo đơn hàng #${order.id}.`,
          this.selectedReportReason(),
          this.reportDescription.trim(),
        ]
          .filter(Boolean)
          .join(' '),
        evidence: this.reportEvidence(),
      });
    }
    this.dialog.set(null);
  }
}
