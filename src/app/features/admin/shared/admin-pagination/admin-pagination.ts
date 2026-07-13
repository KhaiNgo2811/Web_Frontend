import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

@Component({
  selector: 'app-admin-pagination',
  templateUrl: './admin-pagination.html',
  styleUrl: './admin-pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPagination {
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() total = 0;
  @Input() pageSizes: readonly number[] = [10, 20, 50];

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  protected get firstResult(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  protected get lastResult(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  protected get pageNumbers(): (number | 'ellipsis')[] {
    const total = this.totalPages;
    const current = this.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
    const result: (number | 'ellipsis')[] = [];
    let previous = 0;
    for (const page of sorted) {
      if (previous && page - previous > 1) result.push('ellipsis');
      result.push(page);
      previous = page;
    }
    return result;
  }

  protected goTo(page: number): void {
    this.pageChange.emit(Math.min(Math.max(1, page), this.totalPages));
  }

  protected changePageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
