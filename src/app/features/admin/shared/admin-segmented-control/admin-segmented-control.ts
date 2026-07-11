import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { AdminSegmentOption } from '../../../../core/models';

@Component({
  selector: 'app-admin-segmented-control',
  templateUrl: './admin-segmented-control.html',
  styleUrl: './admin-segmented-control.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSegmentedControl {
  @Input({ required: true }) label = '';
  @Input() value = '';
  @Input() options: readonly AdminSegmentOption[] = [];
  readonly valueChange = output<string>();
}
