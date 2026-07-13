import type {
  AdminActivityTrendPoint,
  AdminCategoryMixItem,
  AdminComplaintPipelineItem,
  AdminDashboardRange,
  AdminKpi,
  AdminMarketplaceHealth,
  AdminModerationPipelineItem,
  AdminOwnershipSummary,
  AdminRegionalMixItem,
  AdminServiceCategoryMixItem,
  AdminSlaSummary,
  Complaint,
  ModerationReport,
  Order,
  Post,
  Region,
  ServiceCategory,
  User,
} from '../models';

const HOUR = 60 * 60 * 1000;

export const DASHBOARD_RANGES: AdminDashboardRange[] = [7, 30, 90];

export const COMPLAINT_STAGES: Complaint['stage'][] = [
  'received',
  'verifying',
  'collecting_evidence',
  'evaluating',
  'resolving',
  'notified',
  'resolved',
];

export const MODERATION_STATUSES: ModerationReport['status'][] = ['pending', 'hidden', 'dismissed'];

export const MODERATION_TARGET_TYPES: ModerationReport['targetType'][] = [
  'post',
  'review',
  'message',
];

export function dashboardWindow(
  rangeDays: AdminDashboardRange,
  now: Date,
): {
  start: Date;
  comparisonStart: Date;
} {
  const end = now.getTime();
  const duration = rangeDays * 24 * HOUR;
  return { start: new Date(end - duration), comparisonStart: new Date(end - duration * 2) };
}

export function buildKpi(
  key: AdminKpi['key'],
  label: string,
  value: number,
  current: number,
  previous: number,
  trend: number[],
): AdminKpi {
  const changePct =
    previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
  return {
    key,
    label,
    value,
    periodValue: current,
    previousPeriodValue: previous,
    changePct: Number.isFinite(changePct) ? changePct : 0,
    direction: current === previous ? 'flat' : current > previous ? 'up' : 'down',
    trend,
  };
}

export function buildActivityTrend(
  rangeDays: AdminDashboardRange,
  now: Date,
  users: User[],
  posts: Post[],
  orders: Order[],
): AdminActivityTrendPoint[] {
  const { start } = dashboardWindow(rangeDays, now);
  const bucketDays = rangeDays === 90 ? 7 : 1;
  const buckets = Math.ceil(rangeDays / bucketDays);
  return Array.from({ length: buckets }, (_, index) => {
    const bucketStart = new Date(start.getTime() + index * bucketDays * 24 * HOUR);
    const bucketEnd = new Date(bucketStart.getTime() + bucketDays * 24 * HOUR);
    return {
      date: bucketStart.toISOString().slice(0, 10),
      accounts: countInRange(
        users.map((user) => user.createdAt),
        bucketStart,
        bucketEnd,
      ),
      posts: countInRange(
        posts.map((post) => post.createdAt),
        bucketStart,
        bucketEnd,
      ),
      completedOrders: countInRange(
        orders.flatMap((order) =>
          order.statusHistory
            .filter((entry) => entry.status === 'completed')
            .map((entry) => entry.at),
        ),
        bucketStart,
        bucketEnd,
      ),
    };
  });
}

export function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function stageProgress(stage: Complaint['stage']): number {
  const index = COMPLAINT_STAGES.indexOf(stage);
  if (index < 0) return 0;
  return percentage(index + 1, COMPLAINT_STAGES.length);
}

export function moderationProgress(report: ModerationReport): number {
  if (report.status === 'dismissed') return 100;
  if (report.status === 'hidden') return 75;
  const restored = report.history?.some((entry) => entry.action === 'restore') ?? false;
  if (restored || report.assignedAdminId || report.handoffNote) return 50;
  return 25;
}

export function classifySla(
  dueAt: string | undefined,
  now: Date,
): 'withinSla' | 'dueSoon' | 'overdue' {
  if (!dueAt) return 'withinSla';
  const remaining = Date.parse(dueAt) - now.getTime();
  if (remaining < 0) return 'overdue';
  return remaining <= 24 * HOUR ? 'dueSoon' : 'withinSla';
}

export function buildComplaintPipeline(
  complaints: Complaint[],
  now: Date,
): AdminComplaintPipelineItem[] {
  const total = complaints.length;
  return COMPLAINT_STAGES.map((stage) => {
    const stageComplaints = complaints.filter((complaint) => complaint.stage === stage);
    const summary = stageComplaints.reduce(
      (state, complaint) => {
        state[classifySla(complaintDueAt(complaint), now)] += 1;
        return state;
      },
      { withinSla: 0, dueSoon: 0, overdue: 0 } satisfies AdminSlaSummary,
    );
    return {
      stage,
      total: stageComplaints.length,
      percent: percentage(stageComplaints.length, total),
      progress: stageProgress(stage),
      ...summary,
    };
  });
}

export function buildModerationPipeline(
  reports: ModerationReport[],
): AdminModerationPipelineItem[] {
  const total = reports.length;
  return MODERATION_STATUSES.map((status) => {
    const statusReports = reports.filter((report) => report.status === status);
    return {
      status,
      total: statusReports.length,
      percent: percentage(statusReports.length, total),
      highPriorityPending: statusReports.filter(
        (report) => report.status === 'pending' && report.priority === 'high',
      ).length,
      targets: MODERATION_TARGET_TYPES.map((targetType) => ({
        targetType,
        count: statusReports.filter((report) => report.targetType === targetType).length,
      })),
    };
  });
}

export function summarizeMarketplaceHealth(
  posts: Post[],
  orders: Order[],
  start: Date,
  end: Date,
): AdminMarketplaceHealth {
  return {
    openPosts: posts.filter((post) => post.status === 'open' && !post.hidden).length,
    hiddenPosts: posts.filter((post) => post.hidden).length,
    activeOrders: orders.filter((order) => ['pending', 'in_progress'].includes(order.status))
      .length,
    completedOrdersInRange: countInRange(
      orders.flatMap((order) =>
        order.statusHistory
          .filter((entry) => entry.status === 'completed')
          .map((entry) => entry.at),
      ),
      start,
      end,
    ),
    escrowRiskOrders: orders.filter((order) => order.escrowState === 'disputed').length,
  };
}

export function summarizeOwnership(
  complaints: Complaint[],
  reports: ModerationReport[],
  actorId: string,
): AdminOwnershipSummary {
  const openComplaints = complaints.filter((complaint) => complaint.stage !== 'resolved');
  const openReports = reports.filter((report) => report.status === 'pending');
  return {
    assignedComplaints: openComplaints.filter((complaint) => !!complaint.assignedAdminId).length,
    unassignedComplaints: openComplaints.filter((complaint) => !complaint.assignedAdminId).length,
    assignedReports: openReports.filter((report) => !!report.assignedAdminId).length,
    unassignedReports: openReports.filter((report) => !report.assignedAdminId).length,
    mineComplaints: openComplaints.filter((complaint) => complaint.assignedAdminId === actorId)
      .length,
    mineReports: openReports.filter((report) => report.assignedAdminId === actorId).length,
  };
}

export function summarizeRegionMix(
  regions: Region[],
  complaints: Complaint[],
  reports: ModerationReport[],
  posts: Post[],
): AdminRegionalMixItem[] {
  return regions
    .filter((region) => region.id !== 'all')
    .map((region) => {
      const openComplaints = complaints.filter(
        (complaint) => complaint.regionId === region.id && complaint.stage !== 'resolved',
      ).length;
      const openReports = reports.filter(
        (report) => report.regionId === region.id && report.status === 'pending',
      ).length;
      const openPosts = posts.filter(
        (post) => post.regionId === region.id && post.status === 'open' && !post.hidden,
      ).length;
      return {
        regionId: region.id,
        name: region.name,
        city: region.city,
        status: region.status,
        activeRecords: openComplaints + openReports + openPosts,
        reports: openReports,
        complaints: openComplaints,
        openPosts,
      };
    })
    .sort(
      (left, right) =>
        right.activeRecords - left.activeRecords || left.name.localeCompare(right.name, 'vi'),
    );
}

export function summarizeCategoryMix(complaints: Complaint[]): AdminCategoryMixItem[] {
  const openComplaints = complaints.filter((complaint) => complaint.stage !== 'resolved');
  const total = openComplaints.length;
  const categories: AdminCategoryMixItem['category'][] = [
    'quality',
    'payment',
    'schedule',
    'conduct',
    'other',
  ];
  return categories
    .map((category) => {
      const count = openComplaints.filter(
        (complaint) => (complaint.category ?? 'other') === category,
      ).length;
      return { category, total: count, percent: percentage(count, total) };
    })
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total || left.category.localeCompare(right.category));
}

export function summarizeServiceCategoryMix(posts: Post[]): AdminServiceCategoryMixItem[] {
  const openPosts = posts.filter((post) => post.status === 'open' && !post.hidden);
  const total = openPosts.length;
  const categories: ServiceCategory[] = ['food', 'laundry', 'repair', 'goods', 'support', 'other'];
  return categories
    .map((category) => {
      const count = openPosts.filter((post) => post.category === category).length;
      return { category, total: count, percent: percentage(count, total) };
    })
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total);
}

export function complaintDueAt(complaint: Complaint): string | undefined {
  return (
    complaint.sla?.responseDueAt ||
    complaint.sla?.remedyDueAt ||
    complaint.sla?.assessmentDueAt ||
    complaint.sla?.adminProcessingDueAt ||
    complaint.sla?.userEvidenceDueAt ||
    complaint.sla?.verificationDueAt
  );
}

export function prioritySort(
  now: Date,
): (left: Complaint | ModerationReport, right: Complaint | ModerationReport) => number {
  const score = (item: Complaint | ModerationReport): number => {
    if ('stage' in item) {
      const sla = classifySla(complaintDueAt(item), now);
      return (
        (item.stage === 'resolved' ? 0 : 10) +
        (item.priority === 'high' ? 4 : 0) +
        (sla === 'overdue' ? 3 : sla === 'dueSoon' ? 2 : 0)
      );
    }
    return (
      (item.status === 'pending' ? 10 : 0) +
      (Date.parse(item.createdAt) < now.getTime() - 24 * HOUR ? 2 : 0)
    );
  };
  return (left, right) =>
    score(right) - score(left) || Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

export function countInRange(values: string[], start: Date, end: Date): number {
  return values.filter((value) => {
    const time = Date.parse(value);
    return time >= start.getTime() && time < end.getTime();
  }).length;
}
