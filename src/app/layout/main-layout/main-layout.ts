import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MarketplaceStore } from '../../core/stores/marketplace.store';
import { SessionStore } from '../../core/stores/session.store';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';

type MenuName = 'location' | 'notifications' | 'account' | null;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogo],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly marketplace = inject(MarketplaceStore);
  protected readonly session = inject(SessionStore);
  protected readonly openMenu = signal<MenuName>(null);
  protected readonly location = signal('KTX Khu B');
  protected readonly isAuthenticated = computed(() => this.session.isAuthenticated());
  protected readonly currentUser = this.session.currentUser;
  protected readonly userInitials = computed(() => {
    const user = this.currentUser();
    return user ? getInitials(user.displayName) : '';
  });
  protected readonly ownOpenPostsCount = computed(
    () =>
      this.marketplace
        .posts()
        .filter((post) => post.authorId === this.currentUser()?.id && post.status === 'open')
        .length,
  );

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

  protected logout(): void {
    this.session.logout();
    this.openMenu.set(null);
  }
}
