import type { IsoDateString, ServiceCategory } from './common';
import type { AdminRole } from './admin-authorization';
import type { Message } from './messaging';
import type { Review } from './order';
import type { Post } from './post';
import type { User, UserRole, UserStatus } from './user';
export * from './complaint-policy';
export * from './admin-dashboard';
export * from './admin-inbox';

export interface Region {
  id: string;
  name: string;
  city: string;
  status: 'active' | 'paused';
  userCount?: number;
  providerCount?: number;
}

export interface RegionInput {
  name: string;
  city: string;
  status: 'active' | 'paused';
}

export interface ServiceCategoryConfig {
  id: string;
  key: ServiceCategory;
  name: string;
  attributesCount: number;
  postCount: number;
  active: boolean;
}

export interface ServiceCategoryInput {
  key: ServiceCategory;
  name: string;
  attributesCount: number;
  active: boolean;
}

export interface AdminAccountInput {
  displayName: string;
  email: string;
  role: AdminRole;
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonusPct: number;
  active: boolean;
}

export interface PostBoostTier {
  id: string;
  durationDays: number;
  tokenCost: number;
  vndValue: number;
}

export interface PostBoostTierInput {
  durationDays: number;
  tokenCost: number;
  vndValue: number;
}

export type ProviderPromotionPlanStatus = 'selling' | 'stopped';

export interface ProviderPromotionPlan {
  id: string;
  name: string;
  pricePerMonth: number;
  status: ProviderPromotionPlanStatus;
  activeSubscriberCount?: number;
}

export interface ProviderPromotionPlanInput {
  name: string;
  pricePerMonth: number;
  status: ProviderPromotionPlanStatus;
}

export interface TokenConversionConfig {
  xuPer1000Vnd: number;
  maxAdViewsPerDay: number;
  tokensPerAdView: number;
}

export interface BusinessConfig {
  minRatingThreshold: number;
  minComplaintsThreshold: number;
  tokenPackages: TokenPackage[];
  tokenConversion: TokenConversionConfig;
  updatedAt: IsoDateString;
  updatedBy: string;
}

export interface BusinessConfigInput {
  minRatingThreshold: number;
  minComplaintsThreshold: number;
  tokenPackages: TokenPackage[];
  tokenConversion: TokenConversionConfig;
}

export type BusinessConfigValidationErrors = Partial<Record<keyof BusinessConfigInput, string>>;

export type AdminUserSort = 'newest' | 'name' | 'tokens' | 'completed';

export interface AdminUserFilter {
  search?: string;
  status?: UserStatus | 'all';
  role?: UserRole | 'all';
  regionId?: string;
  sort?: AdminUserSort;
}

export interface AdminAccountStatusInput {
  adminId: string;
  userId: string;
  status: UserStatus;
  reason?: string;
}

export interface AdminAccountActivity {
  id: string;
  userId: string;
  adminId: string;
  action: 'locked' | 'unlocked';
  reason?: string;
  createdAt: IsoDateString;
}

export interface AdminActivityFilter {
  userId?: string;
  limit?: number;
}

export interface AdminUserDetail extends User {
  postsCount: number;
  ordersCount: number;
  reviewsCount: number;
  lastActivityAt?: IsoDateString;
  activity: AdminAccountActivity[];
}

export type ModerationTargetType = 'post' | 'review' | 'message';
export type ModerationStatus = 'pending' | 'hidden' | 'dismissed';
export type ModerationAction = 'hide' | 'restore' | 'dismiss';

export interface ModerationReport {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: ModerationStatus;
  priority?: 'normal' | 'high';
  assignedAdminId?: string;
  handoffNote?: string;
  internalNotes?: string[];
  evidenceUrl?: string;
  regionId: string;
  createdAt: IsoDateString;
  resolvedAt?: IsoDateString;
  resolvedBy?: string;
  resolutionNote?: string;
  history?: {
    id: string;
    action: ModerationAction;
    adminId: string;
    note?: string;
    createdAt: IsoDateString;
    status: ModerationStatus;
  }[];
  target?: Post | Review | Message;
  reporter?: User;
  targetAuthor?: User;
  contextLabel?: string;
}

export interface ModerationFilter {
  status?: ModerationStatus | 'all';
  targetType?: ModerationTargetType | 'all';
  regionId?: string;
  search?: string;
}

export interface ModerationActionInput {
  adminId: string;
  reportId: string;
  action: ModerationAction;
  note?: string;
}

export type AdminReviewStatus = 'visible' | 'hidden' | 'reported';

export interface AdminReviewSummary extends Review {
  rater?: User;
  ratee?: User;
  status: AdminReviewStatus;
  watched: boolean;
  serviceCategory?: string;
  lowReputationRatee: boolean;
}

export interface FlaggedAccount {
  user: User;
  complaintCount: number;
}
