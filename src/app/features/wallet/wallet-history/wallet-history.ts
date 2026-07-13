import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { WalletTransaction, WalletTransactionType } from '../../../core/models';
import { SessionStore, WalletStore } from '../../../core/stores';

type HistoryCategory = 'earn' | 'topup' | 'spend';
type DateRange = 'all' | 'today' | '7d' | '30d' | 'month';
type SortOrder = 'newest' | 'oldest';

interface HistoryRow extends WalletTransaction {
  category: HistoryCategory;
  balanceAfter: number;
}

interface HistoryGroup {
  label: string;
  rows: HistoryRow[];
}

const PAGE_SIZE = 8;

function categoryOf(type: WalletTransactionType): HistoryCategory {
  if (type === 'token_purchase') return 'topup';
  if (type === 'post_boost' || type === 'provider_plan') return 'spend';
  return 'earn';
}

@Component({
  selector: 'app-wallet-history',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './wallet-history.html',
  styleUrl: './wallet-history.scss',
})
export class WalletHistory {
  protected readonly wallet = inject(WalletStore);
  private readonly session = inject(SessionStore);

  protected readonly typeFilter = signal<'all' | HistoryCategory>('all');
  protected readonly rangeFilter = signal<DateRange>('all');
  protected readonly search = signal('');
  protected readonly sort = signal<SortOrder>('newest');
  protected readonly page = signal(1);

  private readonly rows = computed<HistoryRow[]>(() => {
    const summary = this.wallet.summary();
    if (!summary) return [];
    const sorted = [...summary.transactions].sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
    let runningBalance = summary.balance;
    return sorted.map((transaction) => {
      const balanceAfter = runningBalance;
      runningBalance -= transaction.direction === 'earned' ? transaction.amount : -transaction.amount;
      return { ...transaction, category: categoryOf(transaction.type), balanceAfter };
    });
  });

  protected readonly totals = computed(() => {
    const rows = this.rows();
    return {
      earned: rows
        .filter((row) => row.direction === 'earned')
        .reduce((sum, row) => sum + row.amount, 0),
      spent: rows
        .filter((row) => row.direction === 'spent')
        .reduce((sum, row) => sum + row.amount, 0),
    };
  });

  protected readonly counts = computed(() => {
    const rows = this.rows();
    return {
      all: rows.length,
      earn: rows.filter((row) => row.category === 'earn').length,
      topup: rows.filter((row) => row.category === 'topup').length,
      spend: rows.filter((row) => row.category === 'spend').length,
    };
  });

  private readonly filtered = computed<HistoryRow[]>(() => {
    const type = this.typeFilter();
    const range = this.rangeFilter();
    const term = this.search().trim().toLowerCase();
    const order = this.sort();
    const now = Date.now();
    const rangeMs: Record<Exclude<DateRange, 'all' | 'month'>, number> = {
      today: 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const result = this.rows().filter((row) => {
      if (type !== 'all' && row.category !== type) return false;
      if (term && !row.description.toLowerCase().includes(term)) return false;
      if (range === 'all') return true;
      const age = now - Date.parse(row.createdAt);
      if (range === 'month') {
        const created = new Date(row.createdAt);
        const today = new Date();
        return (
          created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear()
        );
      }
      return age <= rangeMs[range];
    });
    return order === 'newest'
      ? result
      : [...result].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected readonly groups = computed<HistoryGroup[]>(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = this.filtered().slice(start, start + PAGE_SIZE);
    const groups: HistoryGroup[] = [];
    for (const row of pageRows) {
      const label = this.dayLabel(row.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rows.push(row);
      else groups.push({ label, rows: [row] });
    }
    return groups;
  });

  constructor() {
    if (this.session.currentUser()) this.wallet.load();
  }

  protected setTypeFilter(type: 'all' | HistoryCategory): void {
    this.typeFilter.set(type);
    this.page.set(1);
  }

  protected setRangeFilter(range: DateRange): void {
    this.rangeFilter.set(range);
    this.page.set(1);
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  protected toggleSort(): void {
    this.sort.update((current) => (current === 'newest' ? 'oldest' : 'newest'));
  }

  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(target, 1), this.totalPages()));
  }

  protected categoryLabel(category: HistoryCategory): string {
    return { earn: 'Kiếm Xu', topup: 'Nạp Xu', spend: 'Sử dụng Xu' }[category];
  }

  protected categoryIcon(category: HistoryCategory): string {
    return { earn: 'bi-check2-circle', topup: 'bi-coin', spend: 'bi-dash-circle' }[category];
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  private dayLabel(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(date, today)) return 'Hôm nay';
    if (sameDay(date, yesterday)) return 'Hôm qua';
    return 'Trước đó';
  }
}
