import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPagination } from './admin-pagination';

describe('AdminPagination', () => {
  let fixture: ComponentFixture<AdminPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminPagination] }).compileComponents();
    fixture = TestBed.createComponent(AdminPagination);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', 25);
    fixture.detectChanges();
  });

  it('announces the visible result range', () => {
    expect(fixture.nativeElement.textContent).toContain('Hiển thị 11–20 trong 25 kết quả');
  });

  it('emits the requested next page', () => {
    const emitted = vi.fn();
    fixture.componentInstance.pageChange.subscribe(emitted);
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();
    expect(emitted).toHaveBeenCalledWith(3);
  });
});
