import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { hasAdminPermission } from '../../../core/models';
import { AdminAuditStore, SessionStore } from '../../../core/stores';
import { adminAvatarColor, adminInitials } from '../shared/admin-avatar.utils';
import { auditActionBadgeClass } from '../shared/admin-badge.utils';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { adminLabel } from '../shared/admin-labels';
import { AdminPagination } from '../shared/admin-pagination/admin-pagination';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, RouterLink, AdminConfirmDialog, AdminPagination],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAudit implements OnInit {
  protected readonly audit = inject(AdminAuditStore);
  private readonly session = inject(SessionStore);
  protected readonly label = adminLabel;
  protected readonly actorInitials = adminInitials;
  protected readonly actorColor = adminAvatarColor;

  protected readonly canExport = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'audit.export'),
  );

  protected readonly page = signal(1);
  protected readonly pageSize = signal(6);
  protected readonly expandedIds = signal<string[]>([]);
  protected readonly exportConfirmationOpen = signal(false);
  protected readonly timeRangeFilter = signal<'7d' | '30d' | '90d' | 'all'>('7d');
  protected readonly actorFilter = signal<string>('all');

  protected readonly actions = [
    'user.locked',
    'user.active',
    'moderation.hide',
    'moderation.restore',
    'moderation.dismiss',
    'inbox.assign',
    'complaint.verifying',
    'complaint.collecting_evidence',
    'complaint.evaluating',
    'complaint.decision',
    'complaint.notified',
    'complaint.party_response',
    'complaint.resolved',
    'configuration.save',
    'configuration.restore',
    'audit.export_requested',
  ];

  protected readonly actorOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const event of this.audit.events()) {
      seen.set(event.actorId, event.actorName || event.actorId);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  });

  protected readonly rangedEvents = computed(() => {
    const range = this.timeRangeFilter();
    const actor = this.actorFilter();
    let events = this.audit.events();
    if (actor !== 'all') events = events.filter((event) => event.actorId === actor);
    if (range === 'all') return events;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return events.filter((event) => new Date(event.createdAt) >= cutoff);
  });

  protected readonly pagedEvents = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rangedEvents().slice(start, start + this.pageSize());
  });

  protected readonly activeFilterCount = computed(() => {
    const filter = this.audit.filter();
    return [
      filter.search,
      this.actorFilter() !== 'all' && this.actorFilter(),
      filter.action,
      this.timeRangeFilter() !== '7d' && this.timeRangeFilter(),
    ].filter(Boolean).length;
  });

  protected readonly exportScopeItems = computed(() => {
    const filter = this.audit.filter();
    const items = [
      filter.search && `Từ khóa: ${filter.search}`,
      this.actorFilter() !== 'all' &&
        `Người thực hiện: ${this.actorOptions().find((a) => a.id === this.actorFilter())?.name ?? this.actorFilter()}`,
      filter.action && `Hành động: ${adminLabel(filter.action)}`,
    ].filter((item): item is string => !!item);
    return items.length ? items : ['Toàn bộ nhật ký đang xem'];
  });

  protected readonly exportRequest = computed(() => ({
    title: 'Tạo yêu cầu xuất nhật ký?',
    message: `Phạm vi: ${this.exportScopeItems().join('; ')}. CSV sẽ che dữ liệu mặc định và lưu yêu cầu trong nhật ký.`,
    confirmLabel: 'Tạo yêu cầu',
    cancelLabel: 'Hủy',
  }));

  ngOnInit(): void {
    this.audit.load();
  }

  protected search(event: Event): void {
    this.page.set(1);
    this.audit.setFilter({ search: this.valueOf(event) });
  }

  protected updateActorFilter(event: Event): void {
    this.page.set(1);
    this.actorFilter.set(this.valueOf(event));
  }

  protected updateActionFilter(event: Event): void {
    this.page.set(1);
    const value = this.valueOf(event);
    this.audit.setFilter({ action: value || undefined });
  }

  protected updateTimeRangeFilter(event: Event): void {
    this.page.set(1);
    this.timeRangeFilter.set(this.valueOf(event) as '7d' | '30d' | '90d' | 'all');
  }

  protected clearFilters(): void {
    this.page.set(1);
    this.timeRangeFilter.set('7d');
    this.actorFilter.set('all');
    this.audit.setFilter({ search: undefined, actorId: undefined, action: undefined, targetType: 'all' });
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }

  protected onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected toggleDisclosure(id: string): void {
    this.expandedIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  protected actionBadgeClass(action: string): string {
    return auditActionBadgeClass(action);
  }

  protected confirmExport(): void {
    this.exportConfirmationOpen.set(false);
    this.audit.requestExport();
  }

  protected exportStatusText(): string {
    const state = this.audit.exportState();
    if (state === 'pending') return 'Đang gửi yêu cầu xuất...';
    if (state === 'success') return 'Đã tạo yêu cầu xuất. Tệp đang được xếp hàng xử lý.';
    if (state === 'error') return this.audit.error() || 'Không thể tạo yêu cầu xuất.';
    return '';
  }

  protected reasonLabel(reason?: string): string {
    return reason === 'default redaction' ? 'Che dữ liệu mặc định' : reason || 'Không ghi lý do';
  }

  protected changeSummary(
    values?: Readonly<Record<string, string | number | boolean | null>>,
  ): string[] {
    if (!values) return ['Không có dữ liệu'];
    const keyLabels: Record<string, string> = {
      status: 'Trạng thái',
      stage: 'Bước xử lý',
      assignedAdminId: 'Người phụ trách',
      hidden: 'Đã ẩn',
    };
    return Object.entries(values).map(([key, value]) => {
      const rendered = typeof value === 'string' ? adminLabel(value) : String(value ?? 'Không có');
      return `${keyLabels[key] ?? 'Giá trị'}: ${rendered}`;
    });
  }

  protected refresh(): void {
    this.audit.load();
  }

  private valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target.value
      : '';
  }
}
