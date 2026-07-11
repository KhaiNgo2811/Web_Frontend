import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  hasAdminPermission,
  type AdminConfirmationRequest,
  type ModerationReport,
} from '../../../core/models';
import { AdminModerationStore, SessionStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminDrawer } from '../shared/admin-drawer/admin-drawer';

type ModerationAction = 'hide' | 'restore' | 'dismiss';
type SortColumn = 'createdAt' | 'reason' | 'status' | 'targetType';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-admin-moderation',
  imports: [AdminConfirmDialog, AdminDrawer],
  templateUrl: './admin-moderation.html',
  styleUrl: './admin-moderation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminModeration {
  protected readonly moderation = inject(AdminModerationStore);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly note = signal('');
  protected readonly localError = signal<string | null>(null);
  protected readonly announcement = signal('');
  protected readonly pendingAction = signal<{
    report: ModerationReport;
    action: ModerationAction;
    note: string;
  } | null>(null);
  protected readonly confirmationRequest = computed<AdminConfirmationRequest>(() => {
    const action = this.pendingAction()?.action;
    const label =
      action === 'hide'
        ? 'ẩn nội dung'
        : action === 'dismiss'
          ? 'bỏ qua báo cáo'
          : 'khôi phục nội dung';
    return {
      title: `Xác nhận ${label}`,
      message: `Thao tác sẽ ${label} và được ghi vào nhật ký kiểm toán.`,
      confirmLabel:
        action === 'hide' ? 'Ẩn nội dung' : action === 'dismiss' ? 'Bỏ qua' : 'Khôi phục',
      cancelLabel: 'Hủy',
      tone: action === 'hide' ? 'danger' : 'default',
    };
  });
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly sortColumn = signal<SortColumn>('createdAt');
  protected readonly sortDirection = signal<SortDirection>('desc');
  private readonly operationPending = signal(false);
  protected readonly selectedReport = computed(() => this.moderation.selectedReport());
  protected readonly resultCount = computed(() => this.moderation.reports().length);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.resultCount() / this.pageSize())),
  );
  protected readonly visibleReports = computed(() => {
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const column = this.sortColumn();
    const sorted = [...this.moderation.reports()].sort((left, right) => {
      const leftValue = column === 'createdAt' ? Date.parse(left.createdAt) : left[column];
      const rightValue = column === 'createdAt' ? Date.parse(right.createdAt) : right[column];
      return typeof leftValue === 'number' && typeof rightValue === 'number'
        ? (leftValue - rightValue) * direction
        : String(leftValue).localeCompare(String(rightValue), 'vi') * direction;
    });
    const start = (this.page() - 1) * this.pageSize();
    return sorted.slice(start, start + this.pageSize());
  });
  protected readonly hasFilters = computed(() => {
    const filter = this.moderation.filter();
    return !!filter.search || filter.status !== 'all' || filter.targetType !== 'all';
  });
  protected readonly canAct = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'moderation.act'),
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.localError.set(null);
      this.note.set('');
      const reportId = params.get('report');
      const status = params.get('status');
      const targetType = params.get('targetType');
      const nextFilter = {
        status: ['all', 'pending', 'hidden', 'dismissed'].includes(status ?? '')
          ? (status as ModerationReport['status'] | 'all')
          : this.moderation.filter().status,
        targetType: ['all', 'post', 'review', 'message'].includes(targetType ?? '')
          ? (targetType as ModerationReport['targetType'] | 'all')
          : this.moderation.filter().targetType,
      };
      const changed =
        nextFilter.status !== this.moderation.filter().status ||
        nextFilter.targetType !== this.moderation.filter().targetType;
      if (changed) {
        this.moderation.setFilter(nextFilter);
        this.moderation.select(reportId);
      } else this.moderation.load(reportId);
    });
    effect(() => {
      const loading = this.moderation.loading();
      const error = this.moderation.error();
      if (!this.operationPending() || loading) return;
      this.operationPending.set(false);
      this.announcement.set(error ? `Thao tác thất bại: ${error}` : 'Đã cập nhật báo cáo.');
    });
  }

  protected openReport(report: ModerationReport): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report: report.id },
      queryParamsHandling: 'merge',
    });
  }

  protected closeDrawer(): void {
    this.note.set('');
    this.localError.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected act(report: ModerationReport, action: ModerationAction): void {
    if (!this.validActions(report).includes(action)) return;
    if ((action === 'hide' || action === 'dismiss') && !this.note().trim()) {
      this.localError.set('Cần nhập ghi chú xử lý trước khi ẩn hoặc bỏ qua báo cáo.');
      return;
    }
    this.pendingAction.set({ report, action, note: this.note().trim() });
  }

  protected confirmAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;
    const actionLabel =
      pending.action === 'hide'
        ? 'ẩn nội dung'
        : pending.action === 'dismiss'
          ? 'bỏ qua báo cáo'
          : 'khôi phục nội dung';
    this.pendingAction.set(null);
    this.localError.set(null);
    this.announcement.set(`Đang ${actionLabel}...`);
    this.operationPending.set(true);
    this.moderation.act(pending.report.id, pending.action, pending.note);
    this.note.set('');
  }

  protected validActions(report: ModerationReport): ModerationAction[] {
    if (report.status === 'pending') return ['hide', 'dismiss'];
    if (report.status === 'hidden') return ['restore'];
    return [];
  }

  protected moderationProgress(report: ModerationReport): number {
    if (report.status === 'dismissed') return 100;
    if (report.status === 'hidden') return 75;
    if (this.wasRestored(report) || report.assignedAdminId || report.handoffNote) return 50;
    return 25;
  }

  protected moderationStepIndex(report: ModerationReport): number {
    if (report.status === 'dismissed') return 3;
    if (report.status === 'hidden') return 2;
    if (this.wasRestored(report) || report.assignedAdminId || report.handoffNote) return 1;
    return 0;
  }

  protected moderationStepLabel(index: number): string {
    return ['Tiếp nhận', 'Đang xem xét', 'Đã ghi quyết định', 'Đã đóng'][index] || 'Tiếp nhận';
  }

  protected moderationStatusNote(report: ModerationReport): string {
    if (report.status === 'dismissed') return 'Báo cáo đã được bỏ qua và đóng.';
    if (report.status === 'hidden') return 'Nội dung đang được ẩn sau quyết định kiểm duyệt.';
    if (this.wasRestored(report)) return 'Nội dung đã được khôi phục, báo cáo chờ rà soát tiếp.';
    if (report.assignedAdminId || report.handoffNote) return 'Báo cáo đã có người phụ trách.';
    return 'Báo cáo mới đang chờ tiếp nhận.';
  }

  protected lastHistoryLabel(report: ModerationReport): string {
    const entry = report.history?.at(-1);
    if (!entry) return 'Chưa có thao tác trước đó.';
    return `${this.actionHistoryLabel(entry.action)} · ${entry.note || 'Không có ghi chú'}`;
  }

  protected sort(column: SortColumn): void {
    if (this.sortColumn() === column)
      this.sortDirection.update((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }

  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected clearFilters(): void {
    this.page.set(1);
    this.moderation.setFilter({ search: '', status: 'all', targetType: 'all' });
  }

  protected refresh(): void {
    this.announcement.set('Đang làm mới danh sách báo cáo...');
    this.operationPending.set(true);
    this.moderation.load();
  }

  protected targetText(report: ModerationReport): string {
    const target = report.target;
    if (!target) return `Nội dung ${report.targetId} không còn tồn tại`;
    if ('title' in target) return target.title;
    if ('comment' in target) return target.comment || `Đánh giá ${target.stars} sao`;
    return 'content' in target ? target.content : report.targetId;
  }

  protected statusLabel(status: ModerationReport['status']): string {
    return { pending: 'Chờ xử lý', hidden: 'Đã ẩn', dismissed: 'Đã bỏ qua' }[status];
  }

  protected typeLabel(type: ModerationReport['targetType']): string {
    return { post: 'Bài đăng', review: 'Đánh giá', message: 'Tin nhắn' }[type];
  }

  protected priorityLabel(priority?: ModerationReport['priority']): string {
    return priority === 'high' ? 'Cao' : 'Bình thường';
  }

  protected actionHistoryLabel(action: ModerationAction): string {
    return { hide: 'Ẩn nội dung', restore: 'Khôi phục nội dung', dismiss: 'Bỏ qua báo cáo' }[
      action
    ];
  }

  private wasRestored(report: ModerationReport): boolean {
    return report.history?.some((entry) => entry.action === 'restore') ?? false;
  }

  protected updateStatus(event: Event): void {
    this.page.set(1);
    this.moderation.setFilter({
      status: this.valueOf(event) as ModerationReport['status'] | 'all',
    });
  }

  protected updateType(event: Event): void {
    this.page.set(1);
    this.moderation.setFilter({
      targetType: this.valueOf(event) as ModerationReport['targetType'] | 'all',
    });
  }

  protected updateSearch(event: Event): void {
    this.page.set(1);
    this.moderation.setFilter({ search: this.valueOf(event) });
  }

  protected updatePageSize(event: Event): void {
    this.pageSize.set(Number(this.valueOf(event)) || 10);
    this.page.set(1);
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
      ? event.target.value
      : '';
  }
}
