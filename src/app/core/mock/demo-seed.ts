import type {
  Application,
  AdminAccountActivity,
  AuditEvent,
  AuthAccount,
  BusinessConfig,
  Complaint,
  Conversation,
  Message,
  ModerationReport,
  Notification,
  Order,
  Post,
  Region,
  ExportJob,
  Review,
  StoredAuthChallenge,
  User,
} from '../models';
import {
  DEMO_BUSINESS_CONFIG,
  DEMO_ADMIN_ACCOUNT_ACTIVITIES,
  DEMO_COMPLAINTS,
  DEMO_MODERATION_REPORTS,
  DEMO_REGIONS,
} from './demo-admin';
import { DEMO_CONVERSATIONS, DEMO_MESSAGES, DEMO_NOTIFICATIONS } from './demo-communications';
import { DEMO_APPLICATIONS, DEMO_ORDERS, DEMO_REVIEWS } from './demo-orders';
import { DEMO_POSTS } from './demo-posts';
import { DEMO_AUTH_ACCOUNTS, DEMO_USERS } from './demo-users';

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
  businessConfig: BusinessConfig;
  moderationReports: ModerationReport[];
  complaints: Complaint[];
  adminAccountActivities: AdminAccountActivity[];
  auditEvents: AuditEvent[];
  exportJobs: ExportJob[];
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
  businessConfig: DEMO_BUSINESS_CONFIG,
  moderationReports: DEMO_MODERATION_REPORTS,
  complaints: DEMO_COMPLAINTS,
  adminAccountActivities: DEMO_ADMIN_ACCOUNT_ACTIVITIES,
  auditEvents: [],
  exportJobs: [],
};
