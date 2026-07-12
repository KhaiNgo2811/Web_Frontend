import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  BoostDuration,
  BoostPostInput,
  ClaimWalletEarningInput,
  ProviderPlan,
  PurchaseProviderPlanInput,
  PurchaseTokenPackageInput,
  WalletEarningActivity,
  WalletRewardClaim,
  WalletSummary,
  WalletTransaction,
  WalletTransactionType,
} from '../models';
import type { MockDatabaseData } from '../mock';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { MockDb } from './mock-db';
import { WalletRepository } from './repositories';

const AD_DAILY_LIMIT = 3;
const BOOST_COSTS: Record<BoostDuration, number> = { 1: 50, 3: 120, 7: 200 };

const PROVIDER_PLANS: ProviderPlan[] = [
  {
    id: 'basic',
    name: 'Cơ bản',
    description: 'Khởi đầu hồ sơ cung cấp dịch vụ chuyên nghiệp.',
    priceTokens: 500,
    features: ['Huy hiệu nhà cung cấp', 'Ưu tiên hỗ trợ'],
  },
  {
    id: 'professional',
    name: 'Chuyên nghiệp',
    description: 'Tăng khả năng tiếp cận khách hàng trong khu vực.',
    priceTokens: 1200,
    features: ['Tất cả quyền lợi Cơ bản', 'Ưu tiên trong tìm kiếm', 'Thống kê hiệu quả'],
  },
  {
    id: 'featured',
    name: 'Nổi bật',
    description: 'Vị trí hiển thị cao nhất cho nhà cung cấp tích cực.',
    priceTokens: 2000,
    features: ['Tất cả quyền lợi Chuyên nghiệp', 'Nhãn nổi bật', 'Quảng bá định kỳ'],
  },
];

const ONE_TIME_ACTIVITIES = [
  {
    id: 'task-complete-profile',
    kind: 'task' as const,
    title: 'Hoàn thiện hồ sơ',
    description: 'Bổ sung thông tin để cộng đồng dễ nhận biết bạn.',
    actionLabel: 'Nhận 20 Ant Xu',
    reward: 20,
  },
  {
    id: 'task-create-post',
    kind: 'task' as const,
    title: 'Đăng nhu cầu đầu tiên',
    description: 'Chia sẻ một nhu cầu hoặc dịch vụ với cộng đồng.',
    actionLabel: 'Nhận 25 Ant Xu',
    reward: 25,
  },
  {
    id: 'task-first-application',
    kind: 'task' as const,
    title: 'Gửi đề nghị đầu tiên',
    description: 'Kết nối với một nhu cầu phù hợp trên AntGo.',
    actionLabel: 'Nhận 30 Ant Xu',
    reward: 30,
  },
  {
    id: 'referral-first',
    kind: 'referral' as const,
    title: 'Mời bạn bè tham gia',
    description: 'Nhận thưởng cho lượt giới thiệu dùng thử đầu tiên.',
    actionLabel: 'Nhận 50 Ant Xu',
    reward: 50,
  },
];

@Injectable()
export class LocalWalletRepository extends WalletRepository {
  private readonly db = inject(MockDb);

  getSummary(userId: string): Observable<WalletSummary> {
    return asObservable(() => this.buildSummary(this.db.snapshot(), userId));
  }

  claimEarning(input: ClaimWalletEarningInput): Observable<WalletSummary> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const now = new Date();
        if (input.activityId === 'daily-check-in') {
          this.claimCheckIn(data, input.userId, now);
        } else if (input.activityId === 'video-reward') {
          this.claimVideoReward(data, input.userId, now);
        } else {
          this.claimOneTimeReward(data, input.userId, input.activityId, now);
        }
        return this.buildSummary(data, input.userId, now);
      }),
    );
  }

  purchasePackage(input: PurchaseTokenPackageInput): Observable<WalletSummary> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const user = this.requireUser(data, input.userId);
        const tokenPackage = requireValue(
          data.businessConfig.tokenPackages.find(
            (candidate) => candidate.id === input.packageId && candidate.active,
          ),
          'Gói Ant Xu không còn khả dụng.',
        );
        const amount =
          tokenPackage.tokens + Math.round((tokenPackage.tokens * tokenPackage.bonusPct) / 100);
        user.tokenBalance += amount;
        this.addTransaction(
          data,
          input.userId,
          'earned',
          'token_purchase',
          amount,
          `Mua ${tokenPackage.name}`,
        );
        return this.buildSummary(data, input.userId);
      }),
    );
  }

  boostPost(input: BoostPostInput): Observable<WalletSummary> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const now = new Date();
        const user = this.requireUser(data, input.userId);
        const post = requireValue(
          data.posts.find((candidate) => candidate.id === input.postId),
          'Không tìm thấy bài đăng.',
        );
        if (post.authorId !== input.userId || post.status !== 'open' || post.hidden) {
          throw new RepositoryError('Chỉ có thể đẩy tin đang hoạt động của bạn.');
        }
        if (
          data.walletBoosts.some(
            (boost) => boost.postId === post.id && Date.parse(boost.endsAt) > now.getTime(),
          )
        ) {
          throw new RepositoryError('Bài đăng này đang được đẩy tin.');
        }
        const cost = BOOST_COSTS[input.durationDays];
        if (!cost) throw new RepositoryError('Thời hạn đẩy tin không hợp lệ.');
        this.spend(user, cost);
        const startsAt = now.toISOString();
        const endsAt = new Date(now.getTime() + input.durationDays * 86_400_000).toISOString();
        data.walletBoosts.push({
          id: createEntityId('boost'),
          userId: input.userId,
          postId: post.id,
          durationDays: input.durationDays,
          cost,
          startsAt,
          endsAt,
        });
        post.isPriority = true;
        post.priorityUntil = endsAt;
        post.updatedAt = startsAt;
        this.addTransaction(
          data,
          input.userId,
          'spent',
          'post_boost',
          cost,
          `Đẩy tin: ${post.title}`,
        );
        return this.buildSummary(data, input.userId, now);
      }),
    );
  }

  purchaseProviderPlan(input: PurchaseProviderPlanInput): Observable<WalletSummary> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const user = this.requireUser(data, input.userId);
        const plan = requireValue(
          PROVIDER_PLANS.find((candidate) => candidate.id === input.planId),
          'Gói nhà cung cấp không hợp lệ.',
        );
        this.spend(user, plan.priceTokens);
        const startedAt = nowIso();
        for (const subscription of data.walletSubscriptions) {
          if (subscription.userId === input.userId && !subscription.replacedAt) {
            subscription.replacedAt = startedAt;
          }
        }
        data.walletSubscriptions.push({
          id: createEntityId('subscription'),
          userId: input.userId,
          planId: plan.id,
          priceTokens: plan.priceTokens,
          startedAt,
        });
        this.addTransaction(
          data,
          input.userId,
          'spent',
          'provider_plan',
          plan.priceTokens,
          `Gói nhà cung cấp ${plan.name}`,
        );
        return this.buildSummary(data, input.userId);
      }),
    );
  }

  private claimCheckIn(data: MockDatabaseData, userId: string, now: Date): void {
    this.requireUser(data, userId);
    const claims = data.walletRewardClaims
      .filter((claim) => claim.userId === userId && claim.kind === 'check_in')
      .sort((left, right) => Date.parse(right.claimedAt) - Date.parse(left.claimedAt));
    if (claims.some((claim) => this.localDateKey(claim.claimedAt) === this.localDateKey(now))) {
      throw new RepositoryError('Bạn đã điểm danh hôm nay.');
    }
    const previous = claims[0];
    const consecutive =
      previous &&
      this.localDateKey(previous.claimedAt) === this.localDateKey(this.addDays(now, -1));
    const streak = consecutive ? ((previous.streak ?? 0) % 7) + 1 : 1;
    const reward = streak === 7 ? 20 : 10;
    this.creditReward(
      data,
      userId,
      'daily-check-in',
      'check_in',
      reward,
      'Điểm danh hằng ngày',
      now,
      streak,
    );
  }

  private claimVideoReward(data: MockDatabaseData, userId: string, now: Date): void {
    this.requireUser(data, userId);
    const viewsToday = data.walletRewardClaims.filter(
      (claim) =>
        claim.userId === userId &&
        claim.kind === 'video' &&
        this.localDateKey(claim.claimedAt) === this.localDateKey(now),
    ).length;
    if (viewsToday >= AD_DAILY_LIMIT) {
      throw new RepositoryError('Bạn đã xem đủ video nhận thưởng hôm nay.');
    }
    this.creditReward(data, userId, 'video-reward', 'video', 5, 'Xem video nhận thưởng', now);
  }

  private claimOneTimeReward(
    data: MockDatabaseData,
    userId: string,
    activityId: string,
    now: Date,
  ): void {
    this.requireUser(data, userId);
    const activity = requireValue(
      ONE_TIME_ACTIVITIES.find((candidate) => candidate.id === activityId),
      'Nhiệm vụ không hợp lệ.',
    );
    if (
      data.walletRewardClaims.some(
        (claim) => claim.userId === userId && claim.activityId === activityId,
      )
    ) {
      throw new RepositoryError('Phần thưởng này đã được nhận.');
    }
    this.creditReward(
      data,
      userId,
      activity.id,
      activity.kind,
      activity.reward,
      activity.title,
      now,
    );
  }

  private creditReward(
    data: MockDatabaseData,
    userId: string,
    activityId: string,
    kind: WalletRewardClaim['kind'],
    reward: number,
    description: string,
    now: Date,
    streak?: number,
  ): void {
    const user = this.requireUser(data, userId);
    const claimedAt = now.toISOString();
    user.tokenBalance += reward;
    data.walletRewardClaims.push({
      id: createEntityId('reward'),
      userId,
      activityId,
      kind,
      reward,
      claimedAt,
      ...(streak ? { streak } : {}),
    });
    const type: WalletTransactionType =
      kind === 'check_in'
        ? 'check_in'
        : kind === 'video'
          ? 'video_reward'
          : kind === 'referral'
            ? 'referral_reward'
            : 'task_reward';
    this.addTransaction(data, userId, 'earned', type, reward, description, claimedAt);
  }

  private buildSummary(data: MockDatabaseData, userId: string, now = new Date()): WalletSummary {
    const user = this.requireUser(data, userId);
    const dateKey = this.localDateKey(now);
    const transactions = data.walletTransactions
      .filter((transaction) => transaction.userId === userId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const claims = data.walletRewardClaims.filter((claim) => claim.userId === userId);
    const checkInClaims = claims
      .filter((claim) => claim.kind === 'check_in')
      .sort((left, right) => Date.parse(right.claimedAt) - Date.parse(left.claimedAt));
    const checkedInToday = checkInClaims.some(
      (claim) => this.localDateKey(claim.claimedAt) === dateKey,
    );
    const adsWatchedToday = claims.filter(
      (claim) => claim.kind === 'video' && this.localDateKey(claim.claimedAt) === dateKey,
    ).length;
    const nextStreak = checkedInToday
      ? (checkInClaims[0]?.streak ?? 0)
      : checkInClaims[0] &&
          this.localDateKey(checkInClaims[0].claimedAt) === this.localDateKey(this.addDays(now, -1))
        ? ((checkInClaims[0].streak ?? 0) % 7) + 1
        : 1;
    const earningActivities: WalletEarningActivity[] = [
      {
        id: 'daily-check-in',
        kind: 'check_in',
        title: 'Điểm danh hằng ngày',
        description: 'Duy trì chuỗi bảy ngày để nhận thưởng gấp đôi.',
        actionLabel: checkedInToday ? 'Đã điểm danh' : `Nhận ${nextStreak === 7 ? 20 : 10} Ant Xu`,
        reward: nextStreak === 7 ? 20 : 10,
        claimed: checkedInToday,
        progress: checkedInToday ? (checkInClaims[0]?.streak ?? 0) : Math.max(nextStreak - 1, 0),
        target: 7,
      },
      {
        id: 'video-reward',
        kind: 'video',
        title: 'Xem video nhận thưởng',
        description: 'Xem video ngắn để nhận thêm Ant Xu.',
        actionLabel: adsWatchedToday >= AD_DAILY_LIMIT ? 'Đã đạt giới hạn' : 'Xem và nhận 5 Ant Xu',
        reward: 5,
        claimed: adsWatchedToday >= AD_DAILY_LIMIT,
        progress: adsWatchedToday,
        target: AD_DAILY_LIMIT,
        remainingToday: Math.max(AD_DAILY_LIMIT - adsWatchedToday, 0),
      },
      ...ONE_TIME_ACTIVITIES.map((activity) => ({
        ...activity,
        claimed: claims.some((claim) => claim.activityId === activity.id),
      })),
    ];
    return {
      balance: user.tokenBalance,
      todayEarnings: transactions
        .filter(
          (transaction) =>
            transaction.direction === 'earned' &&
            this.localDateKey(transaction.createdAt) === dateKey,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      checkInStreak: checkInClaims[0]?.streak ?? 0,
      adsWatchedToday,
      adDailyLimit: AD_DAILY_LIMIT,
      earningActivities,
      tokenPackages: data.businessConfig.tokenPackages.filter(
        (tokenPackage) => tokenPackage.active,
      ),
      ownedPosts: data.posts.filter(
        (post) => post.authorId === userId && post.status === 'open' && !post.hidden,
      ),
      activeBoosts: data.walletBoosts.filter(
        (boost) => boost.userId === userId && Date.parse(boost.endsAt) > now.getTime(),
      ),
      providerPlans: PROVIDER_PLANS,
      activeSubscription: data.walletSubscriptions.find(
        (subscription) => subscription.userId === userId && !subscription.replacedAt,
      ),
      transactions,
    };
  }

  private requireUser(data: MockDatabaseData, userId: string) {
    return requireValue(
      data.users.find((candidate) => candidate.id === userId && candidate.status === 'active'),
      'Không tìm thấy tài khoản đang hoạt động.',
    );
  }

  private spend(user: { tokenBalance: number }, amount: number): void {
    if (user.tokenBalance < amount) throw new RepositoryError('Số dư Ant Xu không đủ.');
    user.tokenBalance -= amount;
  }

  private addTransaction(
    data: MockDatabaseData,
    userId: string,
    direction: WalletTransaction['direction'],
    type: WalletTransactionType,
    amount: number,
    description: string,
    createdAt = nowIso(),
  ): void {
    data.walletTransactions.push({
      id: createEntityId('wallet-tx'),
      userId,
      direction,
      type,
      amount,
      description,
      createdAt,
    });
  }

  private localDateKey(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private addDays(value: Date, days: number): Date {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
