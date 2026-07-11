import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { AdminStaffOption } from '../../../../core/models';

@Component({
  selector: 'app-admin-staff-selector',
  templateUrl: './admin-staff-selector.html',
  styleUrl: './admin-staff-selector.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStaffSelector {
  @Input() label = 'Nhân sự phụ trách';
  @Input() value = '';
  @Input() staff: readonly AdminStaffOption[] = [];
  @Input() includeUnassigned = true;
  @Input() disabled = false;

  readonly valueChange = output<string>();

  protected select(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
