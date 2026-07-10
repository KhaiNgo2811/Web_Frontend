import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BrandLogo } from '../../../../shared/brand-logo/brand-logo';

@Component({
  selector: 'app-auth-card',
  imports: [BrandLogo],
  templateUrl: './auth-card.html',
  styleUrl: './auth-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCard {
  readonly eyebrow = input('Kết nối cộng đồng, san sẻ mỗi ngày');
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
