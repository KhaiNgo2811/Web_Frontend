import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { InboxAssignment, InboxItem, InboxSlaFilter, User } from '../../../core/models';
import { AdminInboxStore, AdminUsersStore } from '../../../core/stores';

type InboxSort = 'createdAt' | 'priority' | 'dueAt';

@Component({
  selector: 'app-admin-inbox',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-inbox.html',
  styleUrl: './admin-inbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInbox {
  protected readonly inbox = inject(AdminInboxStore);
  private readonly staffDirectory = inject(AdminUsersStore);
  protected readonly assigneeId = signal('');
  protected readonly handoffNote = signal('');
  protected readonly search = signal('');
  protected readonly sort = signal<InboxSort>('dueAt');
  protected readonly sortDirection = signal<'ascending' | 'descending'>('ascending');
  protected readonly page = signal(1);
  protected readonly pageSize = 10;
  protected readonly filteredItems = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('vi');
    const items = term
      ? this.inbox
          .items()
          .filter((item) =>
            [item.title, item.status, item.assignedAdminId ?? '']
              .join(' ')
              .toLocaleLowerCase('vi')
              .includes(term),
          )
      : [...this.inbox.items()];
    const direction = this.sortDirection() === 'ascending' ? 1 : -1;
    return items.sort((left, right) => this.compare(left, right) * direction);
  });
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize)),
  );
  protected readonly pagedItems = computed(() => {
    const safePage = Math.min(this.page(), this.pageCount());
    const start = (safePage - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });
  protected readonly selectedOnPage = computed(
    () => this.pagedItems().filter((item) => this.inbox.selectedIds().includes(item.id)).length,
  );
  protected readonly allOnPageSelected = computed(
    () => !!this.pagedItems().length && this.selectedOnPage() === this.pagedItems().length,
  );
  protected readonly someOnPageSelected = computed(
    () => this.selectedOnPage() > 0 && !this.allOnPageSelected(),
  );
  protected readonly activeFilterCount = computed(() => {
    const filter = this.inbox.filter();
    return (
      Number(filter.savedView !== 'all_open') +
      Number((filter.assignment ?? 'all') !== 'all') +
      Number((filter.sla ?? 'all') !== 'all') +
      Number(!!this.search().trim())
    );
  });
  protected readonly assigneeOptions = computed(() => {
    return this.staffDirectory
      .users()
      .filter((user) => user.role !== 'user' && user.status === 'active')
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'vi'));
  });

  constructor() {
    this.inbox.load();
    this.staffDirectory.load();
  }

  protected setView(savedView: 'all_open' | 'unassigned' | 'breach_risk'): void {
    this.page.set(1);
    this.inbox.setFilter({ savedView, assignment: 'all', sla: 'all' });
  }

  protected updateAssignment(event: Event): void {
    this.page.set(1);
    this.inbox.setFilter({
      savedView: 'all_open',
      assignment: this.value(event) as InboxAssignment,
    });
  }

  protected updateSla(event: Event): void {
    this.page.set(1);
    this.inbox.setFilter({ savedView: 'all_open', sla: this.value(event) as InboxSlaFilter });
  }

  protected updateSearch(event: Event): void {
    this.page.set(1);
    this.search.set(this.value(event));
  }

  protected clearFilters(): void {
    this.search.set('');
    this.page.set(1);
    this.inbox.setFilter({ savedView: 'all_open', assignment: 'all', sla: 'all' });
  }

  protected refresh(): void {
    this.inbox.load();
  }

  protected togglePageSelection(): void {
    const shouldSelect = !this.allOnPageSelected();
    for (const item of this.pagedItems()) {
      const selected = this.inbox.selectedIds().includes(item.id);
      if (selected !== shouldSelect) this.inbox.toggle(item);
    }
  }

  protected deselectAll(): void {
    for (const item of this.inbox.items()) {
      if (this.inbox.selectedIds().includes(item.id)) this.inbox.toggle(item);
    }
  }

  protected assign(): void {
    this.inbox.assignSelected(
      this.assigneeId().trim() || undefined,
      this.handoffNote().trim() || undefined,
    );
  }

  protected setSort(sort: InboxSort): void {
    if (this.sort() === sort) {
      this.sortDirection.update((direction) =>
        direction === 'ascending' ? 'descending' : 'ascending',
      );
    } else {
      this.sort.set(sort);
      this.sortDirection.set('ascending');
    }
    this.page.set(1);
  }

  protected ariaSort(sort: InboxSort): 'ascending' | 'descending' | 'none' {
    return this.sort() === sort ? this.sortDirection() : 'none';
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  protected route(item: InboxItem): string {
    return item.source === 'moderation' ? '/admin/moderation' : '/admin/complaints';
  }

  protected query(item: InboxItem): Record<string, string> {
    return item.source === 'moderation' ? { report: item.sourceId } : { complaint: item.sourceId };
  }

  protected statusLabel(status: string): string {
    return (
      {
        pending: 'Chờ xử lý',
        received: 'Đã tiếp nhận',
        verifying: 'Đang xác minh',
        collecting_evidence: 'Đang thu thập bằng chứng',
        evaluating: 'Đang đánh giá',
        resolving: 'Đang giải quyết',
        notified: 'Đã thông báo',
        resolved: 'Đã giải quyết',
      }[status] ?? 'Đang xử lý'
    );
  }

  protected priorityLabel(priority: InboxItem['priority']): string {
    return priority === 'high' ? 'Cao' : 'Bình thường';
  }

  protected staffRoleLabel(role: User['role']): string {
    return {
      user: 'Người dùng',
      support_agent: 'Hỗ trợ',
      moderator: 'Kiểm duyệt',
      complaint_reviewer: 'Duyệt khiếu nại',
      super_admin: 'Siêu quản trị',
    }[role];
  }

  protected value(event: Event): string {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target.value
      : '';
  }

  private compare(left: InboxItem, right: InboxItem): number {
    if (this.sort() === 'priority')
      return Number(right.priority === 'high') - Number(left.priority === 'high');
    if (this.sort() === 'createdAt')
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
    const leftDue = left.dueAt ? Date.parse(left.dueAt) : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? Date.parse(right.dueAt) : Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  }
}
