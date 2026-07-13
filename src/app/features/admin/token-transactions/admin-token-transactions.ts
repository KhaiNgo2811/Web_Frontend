import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import type {
  AdminTokenTransaction,
  AdminTokenTransactionFilter,
  AdminTokenTransactionSort,
  TokenTransactionDisplayType,
  TokenTransactionStatus,
} from '../../../core/models/admin-token-transaction';
import { DEMO_TOKEN_TRANSACTIONS } from '../../../core/mock/demo-token-transactions';
import {
  AdminExportDialog,
  type ExportDialogOptions,
} from '../shared/admin-export-dialog/admin-export-dialog';

@Component({
  selector: 'app-admin-token-transactions',
  imports: [RouterLink, AdminExportDialog, DecimalPipe],
  templateUrl: './admin-token-transactions.html',
  styleUrl: './admin-token-transactions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTokenTransactions {
  protected readonly transactions = signal<AdminTokenTransaction[]>(DEMO_TOKEN_TRANSACTIONS);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly filter = signal<AdminTokenTransactionFilter>({
    search: '',
    type: 'all',
    status: 'all',
    timeRange: '30d',
  });
  protected readonly sort = signal<AdminTokenTransactionSort>('newest');
  protected readonly page = signal(1);
  protected readonly pageSize = 10;

  protected readonly filteredTransactions = computed(() => {
    let result = [...this.transactions()];
    const f = this.filter();

    if (f.search) {
      const s = f.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.code.toLowerCase().includes(s) ||
          t.userName.toLowerCase().includes(s) ||
          t.typeLabel.toLowerCase().includes(s),
      );
    }

    if (f.type !== 'all') {
      result = result.filter((t) => t.type === f.type);
    }

    if (f.status !== 'all') {
      result = result.filter((t) => t.status === f.status);
    }

    const now = new Date('2026-07-13T00:00:00.000Z');
    if (f.timeRange !== 'all') {
      const days = f.timeRange === '7d' ? 7 : f.timeRange === '30d' ? 30 : 90;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((t) => new Date(t.createdAt) >= cutoff);
    }

    const s = this.sort();
    if (s === 'newest') {
      result.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    } else if (s === 'oldest') {
      result.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    } else if (s === 'amount') {
      result.sort((a, b) => b.tokenAmount - a.tokenAmount);
    }

    return result;
  });

  protected readonly totalCount = computed(() => this.filteredTransactions().length);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize)),
  );
  protected readonly pagedTransactions = computed(() => {
    const safePage = Math.min(this.page(), this.pageCount());
    const start = (safePage - 1) * this.pageSize;
    return this.filteredTransactions().slice(start, start + this.pageSize);
  });

  protected readonly paginationStart = computed(() => {
    if (this.totalCount() === 0) return 0;
    return (this.page() - 1) * this.pageSize + 1;
  });
  protected readonly paginationEnd = computed(() =>
    Math.min(this.page() * this.pageSize, this.totalCount()),
  );

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
    const f = this.filter();
    return (
      Number(!!f.search) +
      Number(f.type !== 'all') +
      Number(f.status !== 'all') +
      Number(f.timeRange !== '30d')
    );
  });

  // Stats
  protected readonly totalTokens = computed(() =>
    this.transactions().reduce((sum, t) => sum + t.tokenAmount, 0),
  );
  protected readonly totalDepositMoney = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'nap_xu' || t.type === 'token_purchase')
      .reduce((sum, t) => sum + (t.moneyAmount ?? 0), 0),
  );
  protected readonly totalSpendMoney = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'day_bai' || t.type === 'goi_ho_so')
      .reduce((sum, t) => sum + (t.moneyAmount ?? 0), 0),
  );

  protected readonly exportOpen = signal(false);
  protected readonly exportOptions: ExportDialogOptions = {
    title: 'Xuất báo cáo giao dịch',
    subtitle: 'Xuất bảng dữ liệu: Giao dịch & Token',
    timeRanges: [
      { value: 'all', label: 'Tất cả thời gian' },
      { value: '7d', label: '7 ngày gần nhất' },
      { value: '30d', label: '30 ngày gần nhất' },
      { value: '90d', label: '90 ngày gần nhất' },
    ],
  };

  protected updateSearch(event: Event): void {
    const value = this.valueOf(event);
    this.page.set(1);
    this.filter.update((f) => ({ ...f, search: value }));
  }

  protected updateType(event: Event): void {
    const value = this.valueOf(event) as TokenTransactionDisplayType | 'all';
    this.page.set(1);
    this.filter.update((f) => ({ ...f, type: value }));
  }

  protected updateStatus(event: Event): void {
    const value = this.valueOf(event) as TokenTransactionStatus | 'all';
    this.page.set(1);
    this.filter.update((f) => ({ ...f, status: value }));
  }

  protected updateTimeRange(event: Event): void {
    const value = this.valueOf(event) as AdminTokenTransactionFilter['timeRange'];
    this.page.set(1);
    this.filter.update((f) => ({ ...f, timeRange: value }));
  }

  protected updateSort(event: Event): void {
    const value = this.valueOf(event) as AdminTokenTransactionSort;
    this.page.set(1);
    this.sort.set(value);
  }

  protected clearFilters(): void {
    this.page.set(1);
    this.filter.set({ search: '', type: 'all', status: 'all', timeRange: '30d' });
  }

  protected refresh(): void {
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.error.set(null);
    }, 400);
  }

  protected goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  protected typeBadgeClass(type: AdminTokenTransaction['type']): string {
    const map: Record<string, string> = {
      nap_xu: 'type-nap',
      token_purchase: 'type-nap',
      day_bai: 'type-day',
      goi_ho_so: 'type-goi',
      hoan_xu: 'type-hoan',
      check_in: 'type-hoan',
      task_reward: 'type-hoan',
    };
    return map[type] ?? 'type-default';
  }

  protected statusBadgeClass(status: TokenTransactionStatus): string {
    return `status-${status}`;
  }

  protected formatToken(amount: number, direction: 'in' | 'out'): string {
    const sign = direction === 'in' ? '+' : '-';
    return `${sign}${amount.toLocaleString('vi-VN')} Xu`;
  }

  protected formatMoney(amount: number | null): string {
    if (amount === null) return '—';
    return `${amount.toLocaleString('vi-VN')}đ`;
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
      ? event.target.value
      : '';
  }
}
