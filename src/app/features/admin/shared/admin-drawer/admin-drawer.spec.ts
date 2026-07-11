import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDrawer } from './admin-drawer';

describe('AdminDrawer', () => {
  let fixture: ComponentFixture<AdminDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminDrawer] }).compileComponents();
    fixture = TestBed.createComponent(AdminDrawer);
    fixture.componentRef.setInput('title', 'Chi tiết kiểm duyệt');
  });

  it('focuses close and closes with Escape', async () => {
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await new Promise((resolve) => window.setTimeout(resolve));
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toBe('Đóng');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('uses unique accessible title identifiers', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    const title = fixture.nativeElement.querySelector('h2');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
  });
});
