import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import type { AdminToastMessage } from '../../../../core/models';

@Component({
  selector: 'app-admin-toast-region',
  templateUrl: './admin-toast-region.html',
  styleUrl: './admin-toast-region.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminToastRegion {
  @Input() messages: readonly AdminToastMessage[] = [];
  readonly dismissed = output<string>();
}
