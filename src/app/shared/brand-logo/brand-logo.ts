import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-logo',
  templateUrl: './brand-logo.html',
  styleUrl: './brand-logo.scss',
})
export class BrandLogo {
  readonly compact = input(false);
  readonly logoUrl = input('assets/images/logo-placeholder.png');
}
