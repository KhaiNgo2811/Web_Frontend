import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { provideAntgoCore } from './core-data.providers';
import { MockDb } from './mock-db';
import { WalletRepository } from './repositories';

describe('LocalWalletRepository', () => {
  let repository: WalletRepository;
  let db: MockDb;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideAntgoCore()] });
    repository = TestBed.inject(WalletRepository);
    db = TestBed.inject(MockDb);
  });

  it('loads active packages, owned posts, plans, and a deterministic ledger', async () => {
    const summary = await firstValueFrom(repository.getSummary('user-demo'));

    expect(summary.balance).toBe(120);
    expect(summary.tokenPackages.length).toBe(3);
    expect(summary.ownedPosts.every((post) => post.authorId === 'user-demo')).toBe(true);
    expect(summary.providerPlans.map((plan) => plan.id)).toEqual([
      'basic',
      'professional',
      'featured',
    ]);
    expect(summary.transactions.map((transaction) => transaction.id)).toEqual([
      'wallet-tx-demo-check-in',
      'wallet-tx-demo-task',
    ]);
  });

  it('enforces daily check-in and three-video limits while updating balance and ledger', async () => {
    const checkedIn = await firstValueFrom(
      repository.claimEarning({ userId: 'user-demo', activityId: 'daily-check-in' }),
    );
    expect(checkedIn.balance).toBe(130);
    expect(checkedIn.checkInStreak).toBeGreaterThanOrEqual(1);

    await expect(
      firstValueFrom(
        repository.claimEarning({ userId: 'user-demo', activityId: 'daily-check-in' }),
      ),
    ).rejects.toThrow('đã điểm danh');

    for (let count = 0; count < 3; count += 1) {
      await firstValueFrom(
        repository.claimEarning({ userId: 'user-demo', activityId: 'video-reward' }),
      );
    }
    await expect(
      firstValueFrom(repository.claimEarning({ userId: 'user-demo', activityId: 'video-reward' })),
    ).rejects.toThrow('đủ video');

    const summary = await firstValueFrom(repository.getSummary('user-demo'));
    expect(summary.balance).toBe(145);
    expect(summary.adsWatchedToday).toBe(3);
    expect(summary.todayEarnings).toBeGreaterThanOrEqual(25);
    expect(summary.transactions).toHaveLength(6);
  });

  it('allows each seeded task or referral reward only once', async () => {
    const rewarded = await firstValueFrom(
      repository.claimEarning({ userId: 'user-demo', activityId: 'task-create-post' }),
    );
    expect(rewarded.balance).toBe(145);
    expect(
      rewarded.earningActivities.find((activity) => activity.id === 'task-create-post')?.claimed,
    ).toBe(true);

    await expect(
      firstValueFrom(
        repository.claimEarning({ userId: 'user-demo', activityId: 'task-create-post' }),
      ),
    ).rejects.toThrow('đã được nhận');
  });

  it('applies a configured token-package bonus and persists the immutable transaction', async () => {
    const summary = await firstValueFrom(
      repository.purchasePackage({ userId: 'user-demo', packageId: 'token-plus' }),
    );

    expect(summary.balance).toBe(252);
    expect(summary.transactions[0]).toMatchObject({
      direction: 'earned',
      type: 'token_purchase',
      amount: 132,
    });
    expect(new MockDb().snapshot().walletTransactions).toHaveLength(4);
  });

  it('validates balance, post ownership, and duplicate active boosts', async () => {
    await expect(
      firstValueFrom(
        repository.boostPost({ userId: 'user-huy', postId: 'post-delivery', durationDays: 1 }),
      ),
    ).rejects.toThrow('không đủ');
    await expect(
      firstValueFrom(
        repository.boostPost({ userId: 'user-demo', postId: 'post-delivery', durationDays: 1 }),
      ),
    ).rejects.toThrow('của bạn');

    const boosted = await firstValueFrom(
      repository.boostPost({ userId: 'user-demo', postId: 'post-aircon', durationDays: 1 }),
    );
    expect(boosted.balance).toBe(70);
    expect(boosted.activeBoosts).toHaveLength(1);
    expect(db.snapshot().posts.find((post) => post.id === 'post-aircon')?.isPriority).toBe(true);

    await expect(
      firstValueFrom(
        repository.boostPost({ userId: 'user-demo', postId: 'post-aircon', durationDays: 1 }),
      ),
    ).rejects.toThrow('đang được đẩy tin');
  });

  it('replaces an active provider subscription and keeps newest transactions first', async () => {
    db.transaction((data) => {
      const user = data.users.find((candidate) => candidate.id === 'user-demo');
      if (user) user.tokenBalance = 5000;
    });
    await firstValueFrom(repository.purchaseProviderPlan({ userId: 'user-demo', planId: 'basic' }));
    const summary = await firstValueFrom(
      repository.purchaseProviderPlan({ userId: 'user-demo', planId: 'professional' }),
    );

    expect(summary.balance).toBe(3300);
    expect(summary.activeSubscription?.planId).toBe('professional');
    expect(
      db
        .snapshot()
        .walletSubscriptions.filter((item) => item.userId === 'user-demo' && !item.replacedAt),
    ).toHaveLength(1);
    expect(summary.transactions[0]?.description).toContain('Chuyên nghiệp');
  });
});
