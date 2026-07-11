import { adminBooleanLabel, adminLabel } from './admin-labels';

describe('admin labels', () => {
  it('translates internal workflow values without changing the value', () => {
    expect(adminLabel('collecting_evidence')).toBe('Đang thu thập bằng chứng');
    expect(adminLabel('pending')).toBe('Đang chờ');
  });

  it('keeps unknown technical values visible and labels booleans', () => {
    expect(adminLabel('custom_action')).toBe('custom_action');
    expect(adminBooleanLabel(true)).toBe('Có');
  });
});
