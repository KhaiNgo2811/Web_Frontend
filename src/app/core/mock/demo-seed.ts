import type {
  Application,
  AdminAccountActivity,
  AuditEvent,
  AuthAccount,
  BusinessConfig,
  Complaint,
  Conversation,
  ExportJob,
  Message,
  ModerationReport,
  Notification,
  Order,
  Post,
  PostBoostTier,
  ProviderPromotionPlan,
  Region,
  Review,
  ServiceCategoryConfig,
  StoredAuthChallenge,
  User,
  WalletBoost,
  WalletRewardClaim,
  WalletSubscription,
  WalletTransaction,
} from '../models';
import {
  DEMO_ADMIN_ACCOUNT_ACTIVITIES,
  DEMO_AUDIT_EVENTS,
  DEMO_BUSINESS_CONFIG,
  DEMO_COMPLAINTS,
  DEMO_EXPORT_JOBS,
  DEMO_MODERATION_REPORTS,
  DEMO_POST_BOOST_TIERS,
  DEMO_PROVIDER_PROMOTION_PLANS,
  DEMO_REGIONS,
} from './demo-admin';
import { DEMO_CONVERSATIONS, DEMO_MESSAGES, DEMO_NOTIFICATIONS } from './demo-communications';
import { DEMO_APPLICATIONS, DEMO_ORDERS, DEMO_REVIEWS } from './demo-orders';
import { DEMO_POSTS } from './demo-posts';
import { DEMO_SERVICE_CATEGORIES } from './demo-service-categories';
import { DEMO_AUTH_ACCOUNTS, DEMO_USERS } from './demo-users';
import {
  DEMO_WALLET_BOOSTS,
  DEMO_WALLET_REWARD_CLAIMS,
  DEMO_WALLET_SUBSCRIPTIONS,
  DEMO_WALLET_TRANSACTIONS,
} from './demo-wallet';

export interface MockDatabaseData {
  users: User[];
  authAccounts: AuthAccount[];
  authChallenges: StoredAuthChallenge[];
  posts: Post[];
  applications: Application[];
  orders: Order[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  regions: Region[];
  serviceCategories: ServiceCategoryConfig[];
  businessConfig: BusinessConfig;
  moderationReports: ModerationReport[];
  complaints: Complaint[];
  adminAccountActivities: AdminAccountActivity[];
  auditEvents: AuditEvent[];
  exportJobs: ExportJob[];
  walletTransactions: WalletTransaction[];
  walletRewardClaims: WalletRewardClaim[];
  walletBoosts: WalletBoost[];
  walletSubscriptions: WalletSubscription[];
  postBoostTiers: PostBoostTier[];
  providerPromotionPlans: ProviderPromotionPlan[];
}

export const DEMO_DATABASE: MockDatabaseData = {
  users: DEMO_USERS,
  authAccounts: DEMO_AUTH_ACCOUNTS,
  authChallenges: [],
  posts: DEMO_POSTS,
  applications: DEMO_APPLICATIONS,
  orders: DEMO_ORDERS,
  reviews: DEMO_REVIEWS,
  conversations: DEMO_CONVERSATIONS,
  messages: DEMO_MESSAGES,
  notifications: DEMO_NOTIFICATIONS,
  regions: DEMO_REGIONS,
  serviceCategories: DEMO_SERVICE_CATEGORIES,
  businessConfig: DEMO_BUSINESS_CONFIG,
  moderationReports: DEMO_MODERATION_REPORTS,
  complaints: DEMO_COMPLAINTS,
  adminAccountActivities: DEMO_ADMIN_ACCOUNT_ACTIVITIES,
  auditEvents: DEMO_AUDIT_EVENTS,
  exportJobs: DEMO_EXPORT_JOBS,
  walletTransactions: DEMO_WALLET_TRANSACTIONS,
  walletRewardClaims: DEMO_WALLET_REWARD_CLAIMS,
  walletBoosts: DEMO_WALLET_BOOSTS,
  walletSubscriptions: DEMO_WALLET_SUBSCRIPTIONS,
  postBoostTiers: DEMO_POST_BOOST_TIERS,
  providerPromotionPlans: DEMO_PROVIDER_PROMOTION_PLANS,
};
