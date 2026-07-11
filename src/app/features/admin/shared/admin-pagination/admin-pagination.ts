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

  protected goTo(page: number): void {
    this.pageChange.emit(Math.min(Math.max(1, page), this.totalPages));
  }

  protected changePageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
