import { describe, expect, it } from 'vitest';

import type { Complaint, ModerationReport, Order, Post, User } from '../models';
import {
  buildActivityTrend,
  buildComplaintPipeline,
  buildKpi,
  buildModerationPipeline,
  classifySla,
  complaintDueAt,
  countInRange,
  dashboardWindow,
  moderationProgress,
  percentage,
  prioritySort,
  stageProgress,
  summarizeCategoryMix,
  summarizeMarketplaceHealth,
  summarizeOwnership,
  summarizeRegionMix,
} from './admin-dashboard.utils';

describe('admin dashboard utilities', () => {
  it('uses adjacent equal comparison windows', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const window = dashboardWindow(7, now);

    expect(window.start.toISOString()).toBe('2026-07-04T00:00:00.000Z');
    expect(window.comparisonStart.toISOString()).toBe('2026-06-27T00:00:00.000Z');
  });

  it('classifies exact and overdue SLA deadlines without invalid values', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');

    expect(classifySla('2026-07-10T23:59:59.000Z', now)).toBe('overdue');
    expect(classifySla('2026-07-11T00:00:00.000Z', now)).toBe('dueSoon');
    expect(classifySla('2026-07-12T00:00:00.000Z', now)).toBe('dueSoon');
    expect(classifySla('2026-07-11T23:00:00.000Z', now)).toBe('dueSoon');
    expect(classifySla('2026-07-13T00:00:00.000Z', now)).toBe('withinSla');
    expect(classifySla(undefined, now)).toBe('withinSla');
  });

  it('returns flat, finite KPI and activity data for empty datasets', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const kpi = buildKpi('accounts', 'Tài khoản', 0, 0, 0, []);
    const trend = buildActivityTrend(7, now, [], [], []);

    expect(kpi.changePct).toBe(0);
    expect(kpi.direction).toBe('flat');
    expect(trend).toHaveLength(7);
    expect(
      trend.every(
        (point) => point.accounts === 0 && point.posts === 0 && point.completedOrders === 0,
      ),
    ).toBe(true);
  });

  it('keeps percentage and workflow progress finite', () => {
    expect(percentage(0, 0)).toBe(0);
    expect(percentage(1, 4)).toBe(25);
    expect(stageProgress('received')).toBe(14);
    expect(stageProgress('resolved')).toBe(100);
    expect(
      moderationProgress(reportFixture('report-a', '2026-07-10T00:00:00.000Z', 'pending')),
    ).toBe(25);
    expect(
      moderationProgress({
        ...reportFixture('report-b', '2026-07-10T00:00:00.000Z', 'pending'),
        assignedAdminId: 'admin-a',
      }),
    ).toBe(50);
    expect(
      moderationProgress(reportFixture('report-c', '2026-07-10T00:00:00.000Z', 'hidden')),
    ).toBe(75);
    expect(
      moderationProgress(reportFixture('report-d', '2026-07-10T00:00:00.000Z', 'dismissed')),
    ).toBe(100);
  });

  it('counts range boundaries as inclusive start and exclusive end', () => {
    const start = new Date('2026-07-01T00:00:00.000Z');
    const end = new Date('2026-07-08T00:00:00.000Z');

    expect(
      countInRange(
        [
          '2026-06-30T23:59:59.999Z',
          '2026-07-01T00:00:00.000Z',
          '2026-07-07T23:59:59.999Z',
          '2026-07-08T00:00:00.000Z',
        ],
        start,
        end,
      ),
    ).toBe(2);
  });

  it('uses weekly buckets for 90-day activity trends', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const users: User[] = [userFixture('user-a', '2026-04-12T00:00:00.000Z')];
    const posts: Post[] = [postFixture('post-a', '2026-04-18T00:00:00.000Z')];
    const orders: Order[] = [orderFixture('order-a', '2026-04-19T00:00:00.000Z')];
    const trend = buildActivityTrend(90, now, users, posts, orders);

    expect(trend).toHaveLength(13);
    expect(trend[0]).toMatchObject({ date: '2026-04-12', accounts: 1, posts: 1 });
    expect(trend[1]).toMatchObject({ date: '2026-04-19', completedOrders: 1 });
  });

  it('prefers the active complaint deadline field in display order', () => {
    expect(
      complaintDueAt(
        complaintFixture('complaint-a', {
          verificationDueAt: '2026-07-11T01:00:00.000Z',
          userEvidenceDueAt: '2026-07-11T02:00:00.000Z',
          adminProcessingDueAt: '2026-07-11T03:00:00.000Z',
          assessmentDueAt: '2026-07-11T04:00:00.000Z',
          remedyDueAt: '2026-07-11T05:00:00.000Z',
          responseDueAt: '2026-07-11T06:00:00.000Z',
        }),
      ),
    ).toBe('2026-07-11T06:00:00.000Z');
  });

  it('orders priority queues by open status, priority, SLA, and age', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const lowPriority = complaintFixture('complaint-low', {
      responseDueAt: '2026-07-13T00:00:00.000Z',
    });
    const highOverdue = complaintFixture(
      'complaint-high',
      { responseDueAt: '2026-07-10T23:00:00.000Z' },
      'high',
    );
    const resolved = complaintFixture(
      'complaint-resolved',
      { responseDueAt: '2026-07-10T23:00:00.000Z' },
      'high',
      'resolved',
    );

    expect(
      [lowPriority, resolved, highOverdue].sort(prioritySort(now)).map((item) => item.id),
    ).toEqual(['complaint-high', 'complaint-low', 'complaint-resolved']);

    const reports: ModerationReport[] = [
      reportFixture('report-new', '2026-07-10T12:00:00.000Z', 'pending'),
      reportFixture('report-old', '2026-07-09T12:00:00.000Z', 'pending'),
      reportFixture('report-hidden', '2026-07-08T12:00:00.000Z', 'hidden'),
    ];

    expect(reports.sort(prioritySort(now)).map((item) => item.id)).toEqual([
      'report-old',
      'report-new',
      'report-hidden',
    ]);
  });

  it('summarizes dashboard cockpit data from current mock contracts', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const complaints: Complaint[] = [
      complaintFixture(
        'complaint-a',
        { responseDueAt: '2026-07-10T23:00:00.000Z' },
        'high',
        'evaluating',
        'quality',
      ),
      {
        ...complaintFixture('complaint-b', undefined, 'normal', 'resolved', 'payment'),
        assignedAdminId: 'admin-a',
      },
    ];
    const reports: ModerationReport[] = [
      { ...reportFixture('report-a', '2026-07-10T00:00:00.000Z', 'pending'), priority: 'high' },
      {
        ...reportFixture('report-b', '2026-07-10T00:00:00.000Z', 'pending'),
        assignedAdminId: 'admin-a',
      },
    ];
    const posts = [
      postFixture('post-a', '2026-07-10T00:00:00.000Z'),
      { ...postFixture('post-b', '2026-07-10T00:00:00.000Z'), hidden: true },
    ];
    const orders = [orderFixture('order-a', '2026-07-10T00:00:00.000Z')];

    expect(
      buildComplaintPipeline(complaints, now).find((item) => item.stage === 'evaluating'),
    ).toMatchObject({ total: 1, overdue: 1 });
    expect(
      buildModerationPipeline(reports).find((item) => item.status === 'pending'),
    ).toMatchObject({ total: 2, highPriorityPending: 1 });
    expect(summarizeOwnership(complaints, reports, 'admin-a')).toMatchObject({
      unassignedComplaints: 1,
      mineReports: 1,
    });
    expect(
      summarizeRegionMix(
        [{ id: 'hcm-east', name: 'HCM East', city: 'TP. Hồ Chí Minh', status: 'active' }],
        complaints,
        reports,
        posts,
      )[0],
    ).toMatchObject({ activeRecords: 4 });
    expect(summarizeCategoryMix(complaints)).toEqual([
      { category: 'quality', total: 1, percent: 100 },
    ]);
    expect(
      summarizeMarketplaceHealth(
        posts,
        orders,
        new Date('2026-07-09T00:00:00.000Z'),
        new Date('2026-07-11T00:00:00.000Z'),
      ),
    ).toMatchObject({ openPosts: 1, hiddenPosts: 1, completedOrdersInRange: 1 });
  });
});

function userFixture(id: string, createdAt: string): User {
  return {
    id,
    phone: '0900000000',
    displayName: id,
    location: { building: 'A', regionId: 'hcm-east' },
    role: 'user',
    status: 'active',
    isVerified: true,
    reputationScore: null,
    completedCount: 0,
    completionRate: 0,
    reviewParticipationRate: 0,
    tokenBalance: 0,
    createdAt,
  };
}

function postFixture(id: string, createdAt: string): Post {
  return {
    id,
    type: 'service',
    authorId: 'user-a',
    title: id,
    description: id,
    category: 'other',
    price: 0,
    images: [],
    status: 'open',
    urgency: 'normal',
    likedBy: [],
    isPriority: false,
    hidden: false,
    regionId: 'hcm-east',
    expiresAt: '2026-07-12T00:00:00.000Z',
    createdAt,
    updatedAt: createdAt,
  };
}

function orderFixture(id: string, completedAt: string): Order {
  return {
    id,
    code: id,
    postId: 'post-a',
    applicationId: 'application-a',
    customerId: 'user-a',
    providerId: 'user-b',
    status: 'completed',
    statusHistory: [{ status: 'completed', at: completedAt, byUserId: 'user-a' }],
    escrowState: 'released',
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: completedAt,
  };
}

function complaintFixture(
  id: string,
  sla: Complaint['sla'],
  priority: Complaint['priority'] = 'normal',
  stage: Complaint['stage'] = 'notified',
  category?: Complaint['category'],
): Complaint {
  return {
    id,
    code: id,
    regionId: 'hcm-east',
    complainantId: 'user-a',
    respondentId: 'user-b',
    subject: id,
    description: id,
    stage,
    priority,
    category,
    sla,
    evidence: [],
    timeline: [],
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };
}

function reportFixture(
  id: string,
  createdAt: string,
  status: ModerationReport['status'],
): ModerationReport {
  return {
    id,
    targetType: 'post',
    targetId: 'post-a',
    reporterId: 'user-a',
    reason: id,
    status,
    regionId: 'hcm-east',
    createdAt,
  };
}
