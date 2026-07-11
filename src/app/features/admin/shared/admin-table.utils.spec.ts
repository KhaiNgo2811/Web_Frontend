import {
  adminAriaSort,
  paginateAdminRows,
  stableAdminSort,
  toggleAdminSort,
} from './admin-table.utils';

describe('admin table utilities', () => {
  it('clamps pages to the available result range', () => {
    expect(paginateAdminRows([1, 2, 3, 4, 5], 99, 2)).toEqual([5]);
    expect(paginateAdminRows([1, 2, 3], 0, 2)).toEqual([1, 2]);
  });

  it('toggles sort direction and exposes aria-sort', () => {
    const ascending = toggleAdminSort(null, 'name');
    const descending = toggleAdminSort(ascending, 'name');
    expect(adminAriaSort(ascending, 'name')).toBe('ascending');
    expect(adminAriaSort(descending, 'name')).toBe('descending');
    expect(adminAriaSort(descending, 'createdAt')).toBe('none');
  });

  it('sorts stably and places missing values last', () => {
    const rows = [{ value: 'B' }, { value: null }, { value: 'a' }, { value: 'A' }];
    expect(stableAdminSort(rows, (row) => row.value, 'asc')).toEqual([
      { value: 'a' },
      { value: 'A' },
      { value: 'B' },
      { value: null },
    ]);
    expect(stableAdminSort(rows, (row) => row.value, 'desc').at(-1)).toEqual({ value: null });
  });
});
