import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StatusPill } from '../../../shared/status-pill/status-pill';

@Component({
  selector: 'app-notifications-page',
  imports: [RouterLink, EmptyState, StatusPill],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage {
  protected readonly store = inject(MarketplaceStore);
}
