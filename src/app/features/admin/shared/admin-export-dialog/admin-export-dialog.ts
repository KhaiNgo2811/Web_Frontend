import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ExportDialogOptions {
  title: string;
  subtitle: string;
  timeRanges: { value: string; label: string }[];
}

@Component({
  selector: 'app-admin-export-dialog',
  imports: [],
  templateUrl: './admin-export-dialog.html',
  styleUrl: './admin-export-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminExportDialog {
  readonly open = input<boolean>(false);
  readonly options = input<ExportDialogOptions>({
    title: 'Xuất dữ liệu Excel',
    subtitle: 'Xuất bảng dữ liệu',
    timeRanges: [
      { value: 'all', label: 'Tất cả thời gian' },
      { value: '7d', label: '7 ngày gần nhất' },
      { value: '30d', label: '30 ngày gần nhất' },
      { value: '90d', label: '90 ngày gần nhất' },
    ],
  });
  readonly cancelled = output<void>();
  readonly confirmed = output<string>();

  protected selectedRange = 'all';

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected confirm(): void {
    this.confirmed.emit(this.selectedRange);
  }

  protected onRangeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedRange = target.value;
  }
}
