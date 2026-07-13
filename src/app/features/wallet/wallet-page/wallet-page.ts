import { DecimalPipe } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type {
  BoostDuration,
  ProviderPlan,
  TokenPackage,
  WalletEarningActivity,
} from '../../../core/models';
import { SessionStore, WalletStore } from '../../../core/stores';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

type Confirmation =
  | { kind: 'package'; item: TokenPackage }
  | { kind: 'boost'; days: BoostDuration; cost: number }
  | { kind: 'plan'; item: ProviderPlan };
type WalletDialog =
  | Confirmation
  | { kind: 'video'; item: WalletEarningActivity }
  | { kind: 'referral'; item: WalletEarningActivity };

interface CheckInDay {
  day: number;
  reward: number;
  state: 'completed' | 'today' | 'upcoming';
}

const BOOST_OPTIONS: readonly { days: BoostDuration; cost: number; label: string }[] = [
  { days: 1, cost: 50, label: '1 ngày' },
  { days: 3, cost: 120, label: '3 ngày' },
  { days: 7, cost: 200, label: '7 ngày' },
];

@Component({
  selector: 'app-wallet-page',
  imports: [DecimalPipe, RouterLink, UiDialog],
  templateUrl: './wallet-page.html',
  styleUrl: './wallet-page.scss',
})
export class WalletPage {
  protected readonly wallet = inject(WalletStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private dialogInvoker: HTMLElement | null = null;

  protected readonly boostOptions = BOOST_OPTIONS;
  protected readonly confirmation = signal<WalletDialog | null>(null);
  protected readonly referralLink = 'https://antgo.vn/invite/an-nguyen';
  protected readonly checkInActivity = computed(() =>
    this.wallet.summary()?.earningActivities.find((activity) => activity.id === 'daily-check-in'),
  );
  protected readonly earningActions = computed(
    () =>
      this.wallet
        .summary()
        ?.earningActivities.filter((activity) => activity.id !== 'daily-check-in') ?? [],
  );
  protected readonly checkInDays = computed<CheckInDay[]>(() => {
    const activity = this.checkInActivity();
    const progress = activity?.progress ?? 0;
    const today = Math.min(activity?.claimed ? progress : progress + 1, 7);
    return Array.from({ length: 7 }, (_, index) => {
      const day = index + 1;
      return {
        day,
        reward: day === 7 ? 20 : 10,
        state:
          day < today || (activity?.claimed && day === today)
            ? 'completed'
            : day === today
              ? 'today'
              : 'upcoming',
      };
    });
  });
  protected readonly selectedBoost = computed(() =>
    BOOST_OPTIONS.find((option) => option.days === this.wallet.selectedBoostDays())!,
  );
  protected readonly currentPlanId = computed(
    () => this.wallet.summary()?.activeSubscription?.planId ?? null,
  );

  constructor() {
    if (this.session.currentUser()) this.wallet.load();
  }

  protected claim(activity: WalletEarningActivity): void {
    this.wallet.claimEarning(activity.id);
  }

  protected claimCheckIn(): void {
    const activity = this.checkInActivity();
    if (!activity || this.activityDisabled(activity)) return;
    this.wallet.claimEarning(activity.id);
  }

  protected openActivity(activity: WalletEarningActivity): void {
    if (activity.id === 'video-reward') {
      this.openConfirmation({ kind: 'video', item: activity });
      return;
    }
    if (activity.id === 'task-create-post') {
      void this.router.navigateByUrl('/posts/new/request');
      return;
    }
    if (activity.id === 'task-first-application') {
      void this.router.navigateByUrl('/feed');
      return;
    }
    if (activity.id === 'referral-first') {
      this.openConfirmation({ kind: 'referral', item: activity });
      return;
    }
    this.claim(activity);
  }

  protected claimVideo(activity: WalletEarningActivity): void {
    if (this.activityDisabled(activity)) return;
    this.wallet.claimEarning(activity.id);
    this.closeConfirmation();
  }

  protected claimReferral(activity: WalletEarningActivity): void {
    if (this.activityDisabled(activity)) return;
    this.wallet.claimEarning(activity.id);
    this.closeConfirmation();
  }

  protected copyReferralLink(): void {
    void navigator.clipboard?.writeText(this.referralLink);
    this.wallet.clearFeedback();
  }

  protected openPackage(item: TokenPackage): void {
    this.openConfirmation({ kind: 'package', item });
  }

  protected openBoost(): void {
    if (!this.wallet.selectedPostId()) return;
    const option = this.selectedBoost();
    this.openConfirmation({ kind: 'boost', days: option.days, cost: option.cost });
  }

  protected openPlan(item: ProviderPlan): void {
    this.openConfirmation({ kind: 'plan', item });
  }

  protected confirm(): void {
    const confirmation = this.confirmation();
    if (!confirmation) return;
    if (confirmation.kind === 'package') this.wallet.purchasePackage(confirmation.item.id);
    if (confirmation.kind === 'boost') this.wallet.boostSelectedPost();
    if (confirmation.kind === 'plan') this.wallet.purchaseProviderPlan(confirmation.item.id);
    this.closeConfirmation();
  }

  protected closeConfirmation(): void {
    this.confirmation.set(null);
    queueMicrotask(() => this.dialogInvoker?.focus());
  }

  @HostListener('document:keydown', ['$event'])
  protected trapDialogFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.confirmation()) return;
    const focusable = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        'app-ui-dialog button:not([disabled]), app-ui-dialog [href], app-ui-dialog input:not([disabled]), app-ui-dialog select:not([disabled]), app-ui-dialog [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private openConfirmation(confirmation: WalletDialog): void {
    this.dialogInvoker =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmation.set(confirmation);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLElement>('app-ui-dialog button')?.focus(),
    );
  }

  protected earningIcon(kind: WalletEarningActivity['kind']): string {
    return {
      check_in: 'bi-calendar2-check',
      video: 'bi-play-circle',
      task: 'bi-list-check',
      referral: 'bi-person-plus',
    }[kind];
  }

  protected activityDisabled(activity: WalletEarningActivity): boolean {
    return activity.claimed || activity.remainingToday === 0 || !!this.wallet.pendingAction();
  }

  protected activityAction(activity: WalletEarningActivity): string {
    if (activity.claimed) return 'Đã nhận';
    if (activity.remainingToday === 0) return 'Đã hết lượt';
    if (activity.id === 'video-reward') return 'Xem video';
    if (activity.id === 'task-create-post') return 'Thực hiện';
    if (activity.id === 'task-first-application') return 'Thực hiện';
    if (activity.id === 'referral-first') return 'Thực hiện';
    return 'Nhận';
  }

  protected confirmationTitle(): string {
    const item = this.confirmation();
    if (item?.kind === 'package') return 'Xác nhận nạp Ant Xu';
    if (item?.kind === 'boost') return 'Xác nhận đẩy bài';
    if (item?.kind === 'plan') return 'Xác nhận gói quảng bá';
    if (item?.kind === 'video') return 'Video nhận Xu';
    return 'Mời bạn bè';
  }
}
