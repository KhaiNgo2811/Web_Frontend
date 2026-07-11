import type { Complaint } from './complaint-policy';
import type { IsoDateString } from './common';
import type { AdminAccountActivity, ModerationReport, Region } from './admin';

export type AdminDashboardRange = 7 | 30 | 90;

export interface AdminKpi {
  key: 'accounts' | 'activeOrders' | 'pendingModeration' | 'openComplaints';
  label: string;
  value: number;
  periodValue: number;
  previousPeriodValue: number;
  changePct: number;
  direction: 'up' | 'down' | 'flat';
  trend: number[];
}

export interface AdminActivityTrendPoint {
  date: string;
  accounts: number;
  posts: number;
  completedOrders: number;
}

export interface AdminSlaSummary {
  withinSla: number;
  dueSoon: number;
  overdue: number;
}

export interface AdminOperationalActivity {
  id: string;
  kind: 'account' | 'moderation' | 'complaint';
  label: string;
  actor?: string;
  target: string;
  createdAt: IsoDateString;
  route?: string;
  queryParam?: string;
  queryValue?: string;
}

export interface AdminMarketplaceHealth {
  openPosts: number;
  hiddenPosts: number;
  activeOrders: number;
  completedOrdersInRange: number;
  escrowRiskOrders: number;
}

export interface AdminComplaintPipelineItem extends AdminSlaSummary {
  stage: Complaint['stage'];
  total: number;
  percent: number;
  progress: number;
}

export interface AdminModerationPipelineItem {
  status: ModerationReport['status'];
  total: number;
  percent: number;
  highPriorityPending: number;
  targets: {
    targetType: ModerationReport['targetType'];
    count: number;
  }[];
}

export interface AdminOwnershipSummary {
  assignedComplaints: number;
  unassignedComplaints: number;
  assignedReports: number;
  unassignedReports: number;
  mineComplaints: number;
  mineReports: number;
}

export interface AdminRegionalMixItem {
  regionId: string;
  name: string;
  city: string;
  status: Region['status'];
  activeRecords: number;
  reports: number;
  complaints: number;
  openPosts: number;
}

export interface AdminCategoryMixItem {
  category: NonNullable<Complaint['category']> | 'other';
  total: number;
  percent: number;
}

export interface AdminDashboardSummary {
  rangeDays: AdminDashboardRange;
  totals: {
    users: number;
    lockedUsers: number;
    openPosts: number;
    activeOrders: number;
    pendingReports: number;
    openComplaints: number;
  };
  kpis: AdminKpi[];
  activityTrend: AdminActivityTrendPoint[];
  complaintStages: ({ stage: Complaint['stage']; total: number } & AdminSlaSummary)[];
  complaintPipeline: AdminComplaintPipelineItem[];
  complaintSla: AdminSlaSummary;
  moderationWorkload: {
    targetType: ModerationReport['targetType'];
    status: ModerationReport['status'];
    count: number;
  }[];
  moderationPipeline: AdminModerationPipelineItem[];
  marketplaceHealth: AdminMarketplaceHealth;
  ownership: AdminOwnershipSummary;
  regionalMix: AdminRegionalMixItem[];
  categoryMix: AdminCategoryMixItem[];
  recentActivity: AdminOperationalActivity[];
  priorityComplaints: Complaint[];
  priorityReports: ModerationReport[];
  recentComplaints: Complaint[];
  recentReports: ModerationReport[];
  accountActivity: AdminAccountActivity[];
}
