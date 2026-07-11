import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';

@Component({
  selector: 'app-admin-data-state',
  templateUrl: './admin-data-state.html',
  styleUrl: './admin-data-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDataState {
  @Input() state: 'loading' | 'empty' | 'no-results' | 'error' = 'loading';
  @Input() message = '';
  readonly retry = output<void>();
}
