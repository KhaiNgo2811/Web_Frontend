import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { WalletRepository } from '../data';
import type { WalletSummary } from '../models';
import { SessionStore } from './session.store';
import { WalletStore } from './wallet.store';

const SUMMARY: WalletSummary = {
  balance: 100,
  todayEarnings: 10,
  checkInStreak: 1,
  adsWatchedToday: 0,
  adDailyLimit: 3,
  earningActivities: [],
  tokenPackages: [],
  ownedPosts: [],
  activeBoosts: [],
  providerPlans: [],
  transactions: [
    {
      id: 'tx-earned',
      userId: 'user-demo',
      direction: 'earned',
      type: 'check_in',
      amount: 10,
      description: 'Điểm danh',
      createdAt: '2026-07-12T08:00:00.000Z',
    },
    {
      id: 'tx-spent',
      userId: 'user-demo',
      direction: 'spent',
      type: 'post_boost',
      amount: 50,
      description: 'Đẩy tin',
      createdAt: '2026-07-12T07:00:00.000Z',
    },
  ],
};

describe('WalletStore', () => {
  it('loads a summary and filters its transaction signals', () => {
    const repository = repositoryStub();
    const store = configure(repository);

    store.load();
    expect(store.summary()?.balance).toBe(100);
    expect(store.loading()).toBe(false);
    expect(store.filteredTransactions()).toHaveLength(2);

    store.setTransactionFilter('spent');
    expect(store.filteredTransactions().map((transaction) => transaction.id)).toEqual(['tx-spent']);
  });

  it('keeps an operation pending until completion and reports success', () => {
    const claim = new Subject<WalletSummary>();
    const refreshUser = vi.fn();
    const repository = { ...repositoryStub(), claimEarning: () => claim };
    const store = configure(repository, refreshUser);

    store.claimEarning('daily-check-in');
    expect(store.pendingAction()).toBe('earning:daily-check-in');
    claim.next({ ...SUMMARY, balance: 110 });
    expect(store.summary()?.balance).toBe(110);
    expect(store.feedback()).toBeNull();
    claim.complete();

    expect(store.pendingAction()).toBeNull();
    expect(store.feedback()?.type).toBe('success');
    expect(refreshUser).toHaveBeenCalledOnce();
  });

  it('exposes repository failures and validates a missing boost selection', () => {
    const repository = {
      ...repositoryStub(),
      purchasePackage: () => throwError(() => new Error('Số dư Ant Xu không đủ.')),
    };
    const store = configure(repository);

    store.purchasePackage('token-pro');
    expect(store.error()).toContain('không đủ');
    expect(store.feedback()?.type).toBe('error');

    store.clearFeedback();
    store.boostSelectedPost();
    expect(store.feedback()?.message).toContain('chọn bài đăng');
  });
});

function configure(repository: object, refreshUser = vi.fn()): WalletStore {
  TestBed.configureTestingModule({
    providers: [
      WalletStore,
      { provide: WalletRepository, useValue: repository },
      {
        provide: SessionStore,
        useValue: { currentUser: () => ({ id: 'user-demo' }), refreshUser },
      },
    ],
  });
  return TestBed.inject(WalletStore);
}

function repositoryStub() {
  return {
    getSummary: () => of(SUMMARY),
    claimEarning: () => of(SUMMARY),
    purchasePackage: () => of(SUMMARY),
    boostPost: () => of(SUMMARY),
    purchaseProviderPlan: () => of(SUMMARY),
  };
}
