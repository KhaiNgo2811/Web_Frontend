import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AdminConfirmDialog } from './admin-confirm-dialog';

describe('AdminConfirmDialog', () => {
  it('focuses cancellation for a destructive action and cancels with Escape', async () => {
    await TestBed.configureTestingModule({ imports: [AdminConfirmDialog] }).compileComponents();
    const fixture: ComponentFixture<AdminConfirmDialog> =
      TestBed.createComponent(AdminConfirmDialog);
    const cancelled = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);
    fixture.componentRef.setInput('request', {
      title: 'Khóa tài khoản?',
      message: 'Thao tác này ảnh hưởng đến quyền truy cập.',
      tone: 'danger',
    });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await new Promise((resolve) => window.setTimeout(resolve));

    expect((document.activeElement as HTMLButtonElement).textContent?.trim()).toBe('Hủy');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(cancelled).toHaveBeenCalledOnce();
  });
});
