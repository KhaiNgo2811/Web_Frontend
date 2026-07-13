import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  hasAdminPermission,
  type AdminConfirmationRequest,
  type AdminUserSort,
  type User,
  type UserRole,
} from '../../../core/models';
import { AdminUsersStore, SessionStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminDrawer } from '../shared/admin-drawer/admin-drawer';
import { AdminExportDialog, type ExportDialogOptions } from '../shared/admin-export-dialog/admin-export-dialog';

@Component({
  selector: 'app-admin-users',
  imports: [AdminConfirmDialog, AdminDrawer, AdminExportDialog, DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  protected readonly usersStore = inject(AdminUsersStore);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly actionReason = signal('');
  protected readonly reasonError = signal<string | null>(null);
  protected readonly pendingStatusUser = signal<User | null>(null);
  protected readonly confirmationRequest = computed<AdminConfirmationRequest>(() => {
    const user = this.pendingStatusUser();
    const unlocking = user?.status === 'locked';
    return {
      title: unlocking ? 'Xác nhận mở khóa tài khoản' : 'Xác nhận khóa tài khoản',
      message: user
        ? `${unlocking ? 'Mở khóa' : 'Khóa'} tài khoản ${user.displayName}. Lý do: ${this.actionReason().trim()}`
        : '',
      confirmLabel: unlocking ? 'Mở khóa' : 'Khóa tài khoản',
      cancelLabel: 'Hủy',
      tone: unlocking ? 'default' : 'danger',
    };
  });
  protected readonly page = signal(1);
  protected readonly pageSize = 10;
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.usersStore.users().length / this.pageSize)),
  );
  protected readonly pagedUsers = computed(() => {
    const safePage = Math.min(this.page(), this.pageCount());
    const start = (safePage - 1) * this.pageSize;
    return this.usersStore.users().slice(start, start + this.pageSize);
  });
  protected readonly totalUsers = computed(() => this.usersStore.users().length);
  protected readonly paginationStart = computed(() => {
    if (this.totalUsers() === 0) return 0;
    return (this.page() - 1) * this.pageSize + 1;
  });
  protected readonly paginationEnd = computed(() => {
    return Math.min(this.page() * this.pageSize, this.totalUsers());
  });
  protected readonly pageNumbers = computed(() => {
    const total = this.pageCount();
    const current = this.page();
    const pages: number[] = [];
    const maxVisible = 5;
    if (total <= maxVisible + 2) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    if (current <= 3) {
      start = 2;
      end = Math.min(4, total - 1);
    }
    if (current >= total - 2) {
      start = total - 3;
      end = total - 1;
    }
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  });
  protected readonly activeFilterCount = computed(() => {
    const filter = this.usersStore.filter();
    return (
      Number(!!filter.search) + Number(filter.status !== 'all') + Number(filter.role !== 'all') + Number(filter.regionId !== 'all')
    );
  });
  protected readonly canRestrict = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'users.restrict'),
  );
  protected readonly exportOpen = signal(false);
  protected readonly exportOptions: ExportDialogOptions = {
    title: 'Xuất dữ liệu Excel',
    subtitle: 'Xuất bảng dữ liệu: Người dùng',
    timeRanges: [
      { value: 'all', label: 'Tất cả thời gian' },
      { value: '7d', label: '7 ngày gần nhất' },
      { value: '30d', label: '30 ngày gần nhất' },
      { value: '90d', label: '90 ngày gần nhất' },
    ],
  };

  constructor() {
    this.usersStore.load();
    this.route.queryParamMap.subscribe((params) => {
      this.actionReason.set('');
      this.reasonError.set(null);
      this.usersStore.select(params.get('user'));
    });
  }

  protected updateSearch(event: Event): void {
    this.applyFilter({ search: this.valueOf(event) });
  }

  protected updateStatus(event: Event): void {
    this.applyFilter({ status: this.valueOf(event) as User['status'] | 'all' });
  }

  protected updateRegion(event: Event): void {
    this.applyFilter({ regionId: this.valueOf(event) });
  }

  protected updateRole(event: Event): void {
    this.applyFilter({ role: this.valueOf(event) as UserRole | 'all' });
  }

  protected updateSort(event: Event): void {
    this.setSort(this.valueOf(event) as AdminUserSort);
  }

  protected setSort(sort: AdminUserSort): void {
    this.page.set(1);
    this.usersStore.setFilter({ sort });
  }

  protected clearFilters(): void {
    this.page.set(1);
    this.usersStore.setFilter({ search: '', status: 'all', role: 'all', regionId: 'all' });
  }

  protected refresh(): void {
    this.usersStore.load();
  }

  protected openUser(user: User): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { user: user.id },
      queryParamsHandling: 'merge',
    });
  }

  protected closeDrawer(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { user: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected toggleStatus(user: User): void {
    const reason = this.actionReason().trim();
    if (!reason) {
      this.reasonError.set('Vui lòng nhập lý do trước khi thay đổi trạng thái tài khoản.');
      return;
    }
    this.reasonError.set(null);
    this.pendingStatusUser.set(user);
  }

  protected confirmStatusChange(): void {
    const user = this.pendingStatusUser();
    const reason = this.actionReason().trim();
    if (!user || !reason) return;
    if (user.status === 'locked') this.usersStore.unlock(user.id, reason);
    else this.usersStore.lock(user.id, reason);
    this.pendingStatusUser.set(null);
  }

  protected cancelStatusChange(): void {
    this.pendingStatusUser.set(null);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  protected getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected avatarColor(name: string): string {
    const colors = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#eab308'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  protected statusLabel(status: User['status'], isVerified: boolean): string {
    if (status === 'locked') return 'Bị báo cáo';
    if (!isVerified) return 'Chưa xác minh';
    return 'Hoạt động';
  }

  protected statusBadgeClass(status: User['status'], isVerified: boolean): string {
    if (status === 'locked') return 'status-reported';
    if (!isVerified) return 'status-unverified';
    return 'status-active';
  }

  protected roleLabel(role: UserRole): string {
    return {
      user: 'Người dùng',
      support_agent: 'Nhân viên hỗ trợ',
      moderator: 'Kiểm duyệt viên',
      complaint_reviewer: 'Nhân viên duyệt khiếu nại',
      super_admin: 'Siêu quản trị viên',
    }[role];
  }

  protected actionLabel(action: 'locked' | 'unlocked'): string {
    return action === 'locked' ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
  }

  protected sortState(sort: AdminUserSort): 'ascending' | 'descending' | 'none' {
    if (this.usersStore.filter().sort !== sort) return 'none';
    return sort === 'newest' || sort === 'tokens' || sort === 'completed'
      ? 'descending'
      : 'ascending';
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
      ? event.target.value
      : '';
  }

  private applyFilter(filter: {
    search?: string;
    status?: User['status'] | 'all';
    role?: UserRole | 'all';
    regionId?: string;
  }): void {
    this.page.set(1);
    this.usersStore.setFilter(filter);
  }
}
