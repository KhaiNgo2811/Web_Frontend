import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

export interface AdminTabItem {
  value: string;
  label: string;
}

@Component({
  selector: 'app-admin-tabs',
  templateUrl: './admin-tabs.html',
  styleUrl: './admin-tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTabs {
  @Input({ required: true }) tabs: readonly AdminTabItem[] = [];
  @Input({ required: true }) active = '';
  @Input() label = 'Chuyển thẻ';

  readonly activeChange = output<string>();

  protected select(tab: string, focus = false): void {
    this.activeChange.emit(tab);
    if (focus) queueMicrotask(() => document.getElementById(`admin-tab-${tab}`)?.focus());
  }

  protected move(event: KeyboardEvent, current: string): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = this.tabs.findIndex((tab) => tab.value === current);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.select(this.tabs[next].value, true);
  }
}
