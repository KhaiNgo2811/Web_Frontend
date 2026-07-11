import type { AdminSortDirection, AdminSortState } from '../../../core/models';

export function paginateAdminRows<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const maxPage = Math.max(1, Math.ceil(rows.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), maxPage);
  const start = (safePage - 1) * safeSize;
  return rows.slice(start, start + safeSize);
}

export function toggleAdminSort<T extends string>(
  current: AdminSortState<T> | null,
  key: T,
): AdminSortState<T> {
  return { key, direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc' };
}

export function adminAriaSort<T extends string>(
  sort: AdminSortState<T> | null,
  key: T,
): 'ascending' | 'descending' | 'none' {
  if (sort?.key !== key) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export function stableAdminSort<T>(
  rows: readonly T[],
  valueOf: (row: T) => string | number | null | undefined,
  direction: Exclude<AdminSortDirection, null>,
): T[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = valueOf(left.row);
      const rightValue = valueOf(right.row);
      if (leftValue == null) return rightValue == null ? left.index - right.index : 1;
      if (rightValue == null) return -1;
      const result = compareValues(leftValue, rightValue);
      return result === 0 ? left.index - right.index : result * multiplier;
    })
    .map(({ row }) => row);
}

function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'vi', { numeric: true, sensitivity: 'base' });
}
