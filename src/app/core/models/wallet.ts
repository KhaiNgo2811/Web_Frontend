import type { TokenPackage } from './admin';
import type { IsoDateString } from './common';
import type { Post } from './post';

export type WalletTransactionDirection = 'earned' | 'spent';
export type WalletTransactionType =
  | 'check_in'
  | 'video_reward'
  | 'task_reward'
  | 'referral_reward'
  | 'token_purchase'
  | 'post_boost'
  | 'provider_plan';
export type WalletTransactionFilter = 'all' | WalletTransactionDirection;
export type WalletEarningKind = 'check_in' | 'video' | 'task' | 'referral';
export type BoostDuration = 1 | 3 | 7;
export type ProviderPlanId = 'basic' | 'professional' | 'featured';

export interface WalletTransaction {
  id: string;
  userId: string;
  direction: WalletTransactionDirection;
  type: WalletTransactionType;
  amount: number;
  description: string;
  createdAt: IsoDateString;
}

export interface WalletRewardClaim {
  id: string;
  userId: string;
  activityId: string;
  kind: WalletEarningKind;
  reward: number;
  claimedAt: IsoDateString;
  streak?: number;
}

export interface WalletEarningActivity {
  id: string;
  kind: WalletEarningKind;
  title: string;
  description: string;
  actionLabel: string;
  reward: number;
  claimed: boolean;
  progress?: number;
  target?: number;
  remainingToday?: number;
}

export interface WalletBoost {
  id: string;
  userId: string;
  postId: string;
  durationDays: BoostDuration;
  cost: number;
  startsAt: IsoDateString;
  endsAt: IsoDateString;
}

export interface ProviderPlan {
  id: ProviderPlanId;
  name: string;
  description: string;
  priceTokens: number;
  features: string[];
}

export interface WalletSubscription {
  id: string;
  userId: string;
  planId: ProviderPlanId;
  priceTokens: number;
  startedAt: IsoDateString;
  replacedAt?: IsoDateString;
}

export interface WalletSummary {
  balance: number;
  todayEarnings: number;
  checkInStreak: number;
  adsWatchedToday: number;
  adDailyLimit: number;
  earningActivities: WalletEarningActivity[];
  tokenPackages: TokenPackage[];
  ownedPosts: Post[];
  activeBoosts: WalletBoost[];
  providerPlans: ProviderPlan[];
  activeSubscription?: WalletSubscription;
  transactions: WalletTransaction[];
}

export interface ClaimWalletEarningInput {
  userId: string;
  activityId: string;
}

export interface PurchaseTokenPackageInput {
  userId: string;
  packageId: string;
}

export interface BoostPostInput {
  userId: string;
  postId: string;
  durationDays: BoostDuration;
}

export interface PurchaseProviderPlanInput {
  userId: string;
  planId: ProviderPlanId;
}

export interface WalletFeedback {
  type: 'success' | 'error';
  message: string;
}
