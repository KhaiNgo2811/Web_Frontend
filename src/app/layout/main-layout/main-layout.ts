import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MarketplaceStore } from '../../core/stores/marketplace.store';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';

type MenuName = 'location' | 'notifications' | 'account' | null;

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogo],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly marketplace = inject(MarketplaceStore);
  protected readonly openMenu = signal<MenuName>(null);
  protected readonly location = signal('KTX Khu B');

  constructor() {
    this.marketplace.load();
  }

  protected toggle(menu: Exclude<MenuName, null>): void {
    this.openMenu.update((current) => (current === menu ? null : menu));
  }

  protected chooseLocation(location: string): void {
    this.location.set(location);
    this.openMenu.set(null);
  }
}
