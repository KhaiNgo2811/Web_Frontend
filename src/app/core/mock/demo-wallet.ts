import type {
  WalletBoost,
  WalletRewardClaim,
  WalletSubscription,
  WalletTransaction,
} from '../models';

export const DEMO_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'wallet-tx-demo-check-in',
    userId: 'user-demo',
    direction: 'earned',
    type: 'check_in',
    amount: 10,
    description: 'Điểm danh hằng ngày',
    createdAt: '2026-07-11T08:00:00.000Z',
  },
  {
    id: 'wallet-tx-demo-task',
    userId: 'user-demo',
    direction: 'earned',
    type: 'task_reward',
    amount: 20,
    description: 'Hoàn thiện hồ sơ',
    createdAt: '2026-07-10T09:15:00.000Z',
  },
  {
    id: 'wallet-tx-minh-boost',
    userId: 'user-minh',
    direction: 'spent',
    type: 'post_boost',
    amount: 120,
    description: 'Đẩy tin: Nhận giặt sấy và giao tận cửa trong ngày',
    createdAt: '2026-07-11T02:00:00.000Z',
  },
];

export const DEMO_WALLET_REWARD_CLAIMS: WalletRewardClaim[] = [
  {
    id: 'reward-demo-check-in',
    userId: 'user-demo',
    activityId: 'daily-check-in',
    kind: 'check_in',
    reward: 10,
    claimedAt: '2026-07-11T08:00:00.000Z',
    streak: 3,
  },
  {
    id: 'reward-demo-profile',
    userId: 'user-demo',
    activityId: 'task-complete-profile',
    kind: 'task',
    reward: 20,
    claimedAt: '2026-07-10T09:15:00.000Z',
  },
];

export const DEMO_WALLET_BOOSTS: WalletBoost[] = [
  {
    id: 'boost-minh-laundry',
    userId: 'user-minh',
    postId: 'post-laundry',
    durationDays: 3,
    cost: 120,
    startsAt: '2026-07-11T02:00:00.000Z',
    endsAt: '2026-07-14T02:00:00.000Z',
  },
];

export const DEMO_WALLET_SUBSCRIPTIONS: WalletSubscription[] = [
  {
    id: 'subscription-minh-basic',
    userId: 'user-minh',
    planId: 'basic',
    priceTokens: 500,
    startedAt: '2026-07-01T02:00:00.000Z',
  },
];
