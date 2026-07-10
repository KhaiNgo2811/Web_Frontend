import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  template: '<span class="pill" [class]="\'pill pill--\' + tone()"><ng-content /></span>',
  styleUrl: './status-pill.scss',
})
export class StatusPill {
  readonly status = input('neutral');
  protected readonly tone = computed(() => {
    const status = this.status();
    if (['completed', 'selected', 'active', 'open'].includes(status)) return 'success';
    if (['cancelled', 'rejected', 'locked'].includes(status)) return 'danger';
    if (['in_progress', 'connected'].includes(status)) return 'info';
    if (['pending', 'priority'].includes(status)) return 'warning';
    return 'neutral';
  });
}
