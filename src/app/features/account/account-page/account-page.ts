import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SessionStore } from '../../../core/stores/session.store';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { StatusPill } from '../../../shared/status-pill/status-pill';

@Component({
  selector: 'app-account-page',
  imports: [FormsModule, StarRating, StatusPill],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  protected readonly session = inject(SessionStore);
  protected displayName = this.session.currentUser()?.displayName ?? 'Nguyễn Hoàng An';
  protected phone = this.session.currentUser()?.phone ?? '0901234567';
  protected email = this.session.currentUser()?.email ?? 'an.nguyen@antgo.vn';
}
