import { DecimalPipe, SlicePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Order } from '../../../core/models';
import { OrderRepository, UserRepository } from '../../../core/data';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { WalletStore } from '../../../core/stores/wallet.store';

type AccountTab = 'profile' | 'activity' | 'settings' | 'help';

const TABS: readonly { id: AccountTab; label: string }[] = [
  { id: 'profile', label: 'Cá nhân' },
  { id: 'activity', label: 'Hoạt động' },
  { id: 'settings', label: 'Cài đặt' },
  { id: 'help', label: 'Trợ giúp' },
];

@Component({
  selector: 'app-account-page',
  imports: [DecimalPipe, SlicePipe, RouterLink],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  protected readonly session = inject(SessionStore);
  private readonly userRepository = inject(UserRepository);
  private readonly orderRepository = inject(OrderRepository);
  private readonly marketplace = inject(MarketplaceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly wallet = inject(WalletStore);

  protected readonly tabs = TABS;
  protected readonly activeTab = signal<AccountTab>(this.resolveInitialTab());
  protected readonly currentUser = this.session.currentUser;
  protected readonly editingProfile = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly editDisplayName = signal('');
  protected readonly editBuilding = signal('');
  protected readonly editRoom = signal('');
  protected readonly pushNotifications = signal(true);
  protected readonly emailNotifications = signal(false);
  protected readonly socialBusy = signal(false);

  private readonly orders = signal<Order[]>([]);

  protected readonly ownOpenPosts = computed(
    () =>
      this.marketplace
        .posts()
        .filter((post) => post.authorId === this.currentUser()?.id && post.status === 'open')
        .length,
  );
  protected readonly orderedCount = computed(
    () => this.orders().filter((order) => order.customerId === this.currentUser()?.id).length,
  );
  protected readonly providedCount = computed(
    () => this.orders().filter((order) => order.providerId === this.currentUser()?.id).length,
  );

  constructor() {
    if (this.session.currentUser()) this.wallet.load();
    const userId = this.currentUser()?.id;
    if (userId) {
      this.orderRepository.listForUser(userId).subscribe((orders) => this.orders.set(orders));
    }
  }

  protected selectTab(tab: AccountTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab } });
  }

  protected startEditProfile(): void {
    const user = this.currentUser();
    if (!user) return;
    this.editDisplayName.set(user.displayName);
    this.editBuilding.set(user.location.building);
    this.editRoom.set(user.location.room ?? '');
    this.editingProfile.set(true);
  }

  protected cancelEditProfile(): void {
    this.editingProfile.set(false);
  }

  protected saveProfile(): void {
    const user = this.currentUser();
    if (!user) return;
    this.savingProfile.set(true);
    this.userRepository
      .update(user.id, {
        displayName: this.editDisplayName().trim() || user.displayName,
        location: { ...user.location, building: this.editBuilding().trim(), room: this.editRoom().trim() },
      })
      .subscribe({
        next: () => {
          this.session.refreshUser();
          this.savingProfile.set(false);
          this.editingProfile.set(false);
        },
        error: () => this.savingProfile.set(false),
      });
  }

  protected unlinkFacebook(): void {
    const user = this.currentUser();
    if (!user) return;
    this.socialBusy.set(true);
    this.userRepository
      .update(user.id, { social: { ...user.social, facebook: undefined } })
      .subscribe({
        next: () => {
          this.session.refreshUser();
          this.socialBusy.set(false);
        },
        error: () => this.socialBusy.set(false),
      });
  }

  protected linkZalo(): void {
    const user = this.currentUser();
    if (!user) return;
    this.socialBusy.set(true);
    this.userRepository.update(user.id, { social: { ...user.social, zalo: user.displayName } }).subscribe({
      next: () => {
        this.session.refreshUser();
        this.socialBusy.set(false);
      },
      error: () => this.socialBusy.set(false),
    });
  }

  protected togglePush(): void {
    this.pushNotifications.update((value) => !value);
  }

  protected toggleEmail(): void {
    this.emailNotifications.update((value) => !value);
  }

  protected formatJoinDate(iso: string): string {
    const date = new Date(iso);
    return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  protected formatBirthDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN');
  }

  private resolveInitialTab(): AccountTab {
    const value = this.route.snapshot.queryParamMap.get('tab');
    return TABS.some((tab) => tab.id === value) ? (value as AccountTab) : 'profile';
  }
}
