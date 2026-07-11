import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import {
  hasAdminPermission,
  type AdminSortState,
  type AuditTargetType,
  type ExportJob,
} from '../../../core/models';
import { AdminAuditStore, SessionStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { adminLabel } from '../shared/admin-labels';
import { AdminPagination } from '../shared/admin-pagination/admin-pagination';
import {
  adminAriaSort,
  paginateAdminRows,
  stableAdminSort,
  toggleAdminSort,
} from '../shared/admin-table.utils';

type AuditSort = 'createdAt' | 'actorId' | 'action' | 'targetType';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, AdminConfirmDialog, AdminPagination],
  templateUrl: './admin-audit.html',
  styleUrl: './admin-audit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAudit implements OnInit {
  protected readonly audit = inject(AdminAuditStore);
  private readonly session = inject(SessionStore);
  protected readonly canExport = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'audit.export'),
  );
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly exportConfirmationOpen = signal(false);
  protected readonly expandedIds = signal<string[]>([]);
  protected readonly sort = signal<AdminSortState<AuditSort>>({
    key: 'createdAt',
    direction: 'desc',
  });
  protected readonly label = adminLabel;
  protected readonly targets: { value: AuditTargetType | 'all'; label: string }[] = [
    { value: 'all', label: 'Tất cả mục tiêu' },
    { value: 'user', label: 'Tài khoản' },
    { value: 'moderation_report', label: 'Báo cáo kiểm duyệt' },
    { value: 'complaint', label: 'Khiếu nại' },
    { value: 'configuration', label: 'Cấu hình' },
    { value: 'export', label: 'Yêu cầu xuất' },
  ];
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
  protected readonly sortedEvents = computed(() => {
    const sort = this.sort();
    return stableAdminSort(this.audit.events(), (event) => event[sort.key], sort.direction);
  });
  protected readonly pagedEvents = computed(() =>
    paginateAdminRows(this.sortedEvents(), this.page(), this.pageSize()),
  );
  protected readonly activeFilterCount = computed(() => {
    const filter = this.audit.filter();
    return [
      filter.search,
      filter.actorId,
      filter.action,
      filter.targetType !== 'all' && filter.targetType,
    ].filter(Boolean).length;
  });
  protected readonly exportScopeItems = computed(() => {
    const filter = this.audit.filter();
    const items = [
      filter.search && `Từ khóa: ${filter.search}`,
      filter.actorId && `Người thực hiện: ${filter.actorId}`,
      filter.action && `Hành động: ${adminLabel(filter.action)}`,
      filter.targetType &&
        filter.targetType !== 'all' &&
        `Mục tiêu: ${adminLabel(filter.targetType)}`,
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
    const search = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.applyFilter({ search });
  }

  protected updateFilter(key: 'actorId' | 'action' | 'targetType', event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.applyFilter({ [key]: value || (key === 'targetType' ? 'all' : undefined) });
  }

  protected clearFilters(): void {
    this.page.set(1);
    this.audit.setFilter({
      search: undefined,
      actorId: undefined,
      action: undefined,
      targetType: 'all',
    });
  }

  protected setPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.audit.events().length / this.pageSize()));
    this.page.set(Math.min(Math.max(1, page), totalPages));
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  protected toggleDisclosure(id: string): void {
    this.expandedIds.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }

  protected toggleSort(key: AuditSort): void {
    this.sort.set(toggleAdminSort(this.sort(), key));
    this.page.set(1);
  }

  protected ariaSort(key: AuditSort): 'ascending' | 'descending' | 'none' {
    return adminAriaSort(this.sort(), key);
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
    return 'Sẵn sàng tạo yêu cầu xuất.';
  }

  protected jobMeta(job: ExportJob): string {
    return `${job.createdAt} · CSV · ${job.redaction === 'default' ? 'Che dữ liệu mặc định' : job.redaction}`;
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
      platformFeePct: 'Phí nền tảng',
      escrowFeePct: 'Phí đảm bảo',
    };
    return Object.entries(values).map(([key, value]) => {
      const rendered = typeof value === 'string' ? adminLabel(value) : String(value ?? 'Không có');
      return `${keyLabels[key] ?? 'Giá trị'}: ${rendered}`;
    });
  }

  private applyFilter(partial: Parameters<AdminAuditStore['setFilter']>[0]): void {
    this.page.set(1);
    this.audit.setFilter(partial);
  }
}
