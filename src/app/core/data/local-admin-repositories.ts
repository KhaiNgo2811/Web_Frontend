import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AdminAccountActivity,
  AdminAccountInput,
  AdminAccountStatusInput,
  AdminActivityFilter,
  AdminDashboardSummary,
  AdminUserDetail,
  AdminUserFilter,
  BusinessConfig,
  BusinessConfigInput,
  BusinessConfigValidationErrors,
  Complaint,
  ComplaintAppealInput,
  ComplaintAssignInput,
  ComplaintAssessmentInput,
  ComplaintEvidenceRequestInput,
  ComplaintFilter,
  ComplaintNotifyInput,
  ComplaintPartyResponseInput,
  ComplaintResolutionInput,
  ComplaintStage,
  ComplaintVerificationInput,
  ModerationActionInput,
  ModerationFilter,
  ModerationReport,
  Region,
  RegionInput,
  ServiceCategoryConfig,
  ServiceCategoryInput,
  User,
  UserStatus,
} from '../models';
import type { MockDatabaseData } from '../mock';
import { DEMO_BUSINESS_CONFIG } from '../mock/demo-admin';
import {
  AdminUserRepository,
  ComplaintRepository,
  ConfigRepository,
  ModerationRepository,
} from './repositories';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { MockDb } from './mock-db';
import { appendAuditEvent, auditTarget } from './audit.utils';
import { requireAdminPermission, requireAssignableAdmin } from './admin-authorization.utils';
import {
  buildActivityTrend,
  buildComplaintPipeline,
  buildKpi,
  buildModerationPipeline,
  classifySla,
  COMPLAINT_STAGES,
  complaintDueAt,
  countInRange,
  dashboardWindow,
  prioritySort,
  summarizeCategoryMix,
  summarizeMarketplaceHealth,
  summarizeOwnership,
  summarizeRegionMix,
  summarizeServiceCategoryMix,
} from './admin-dashboard.utils';

@Injectable()
export class LocalAdminUserRepository extends AdminUserRepository {
  private readonly db = inject(MockDb);

  list(actorId: string, filter: AdminUserFilter = {}): Observable<User[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'users.read');
      const query = filter.search?.trim().toLocaleLowerCase('vi');
      const users = data.users.filter((user) => {
        const matchesSearch =
          !query ||
          user.displayName.toLocaleLowerCase('vi').includes(query) ||
          user.phone.includes(query) ||
          user.email?.toLocaleLowerCase('vi').includes(query);
        return (
          matchesSearch &&
          (!filter.status || filter.status === 'all' || user.status === filter.status) &&
          (!filter.role || filter.role === 'all' || user.role === filter.role) &&
          (!filter.regionId ||
            filter.regionId === 'all' ||
            user.location.regionId === filter.regionId)
        );
      });

      return users.sort((left, right) => this.compare(left, right, filter.sort));
    });
  }

  getById(actorId: string, id: string): Observable<AdminUserDetail | undefined> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'users.read');
      const user = data.users.find((candidate) => candidate.id === id);
      if (!user) return undefined;
      const userOrders = data.orders.filter((order) =>
        [order.customerId, order.providerId].includes(user.id),
      );
      const activities = data.adminAccountActivities
        .filter((activity) => activity.userId === user.id)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      return {
        ...user,
        postsCount: data.posts.filter((post) => post.authorId === user.id).length,
        ordersCount: userOrders.length,
        reviewsCount: data.reviews.filter(
          (review) => review.raterId === user.id || review.rateeId === user.id,
        ).length,
        lastActivityAt: [
          ...data.posts.filter((post) => post.authorId === user.id).map((post) => post.updatedAt),
          ...userOrders.map((order) => order.updatedAt),
        ].sort((left, right) => Date.parse(right) - Date.parse(left))[0],
        activity: activities,
      };
    });
  }

  setStatus(input: AdminAccountStatusInput): Observable<User> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, input.adminId, 'users.restrict');
        if (input.adminId === input.userId && input.status === 'locked') {
          throw new RepositoryError('Không thể khóa chính tài khoản quản trị đang đăng nhập.');
        }
        const user = requireValue(
          data.users.find((candidate) => candidate.id === input.userId),
          'Không tìm thấy tài khoản.',
        );
        const previousStatus = user.status;
        user.status = input.status;
        const now = nowIso();
        data.adminAccountActivities.unshift({
          id: createEntityId('admin-activity'),
          userId: user.id,
          adminId: input.adminId,
          action: input.status === 'locked' ? 'locked' : 'unlocked',
          reason: input.reason?.trim(),
          createdAt: now,
        });
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(
            input.adminId,
            `user.${input.status}`,
            'user',
            user.id,
            now,
            input.reason?.trim(),
          ),
          before: { status: previousStatus },
          after: { status: user.status },
        });
        return user;
      }),
    );
  }

  listActivity(
    actorId: string,
    filter: AdminActivityFilter = {},
  ): Observable<AdminAccountActivity[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'users.read');
      const activities = data.adminAccountActivities
        .filter((activity) => !filter.userId || activity.userId === filter.userId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      return filter.limit ? activities.slice(0, filter.limit) : activities;
    });
  }

  getDashboardSummary(
    actorId: string,
    rangeDays: 7 | 30 | 90 = 30,
  ): Observable<AdminDashboardSummary> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'admin.access');
      const now = new Date();
      const { start, comparisonStart } = dashboardWindow(rangeDays, now);
      const users = data.users;
      const posts = data.posts;
      const orders = data.orders;
      const reports = data.moderationReports;
      const complaints = data.complaints;
      const activityTrend = buildActivityTrend(rangeDays, now, users, posts, orders);
      const accountDates = users.map((user) => user.createdAt);
      const activeOrderDates = orders.flatMap((order) =>
        order.statusHistory
          .filter((entry) => entry.status === 'pending' || entry.status === 'in_progress')
          .map((entry) => entry.at),
      );
      const reportDates = reports.map((report) => report.createdAt);
      const complaintDates = complaints.flatMap((complaint) =>
        complaint.timeline.map((entry) => entry.createdAt),
      );
      const currentCount = (dates: string[]) => countInRange(dates, start, now);
      const previousCount = (dates: string[]) => countInRange(dates, comparisonStart, start);
      const complaintStages = buildComplaintPipeline(complaints, now);
      const complaintSla = complaintStages.reduce(
        (summary, stage) => ({
          withinSla: summary.withinSla + stage.withinSla,
          dueSoon: summary.dueSoon + stage.dueSoon,
          overdue: summary.overdue + stage.overdue,
        }),
        { withinSla: 0, dueSoon: 0, overdue: 0 },
      );
      const moderationWorkload = ['post', 'review', 'message'].flatMap((targetType) =>
        ['pending', 'hidden', 'dismissed'].map((status) => ({
          targetType: targetType as ModerationReport['targetType'],
          status: status as ModerationReport['status'],
          count: reports.filter(
            (report) => report.targetType === targetType && report.status === status,
          ).length,
        })),
      );
      const recentActivity = [
        ...data.adminAccountActivities.map((activity) => ({
          id: activity.id,
          kind: 'account' as const,
          label: activity.action === 'locked' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
          actor: data.users.find((user) => user.id === activity.adminId)?.displayName,
          target:
            data.users.find((user) => user.id === activity.userId)?.displayName || activity.userId,
          createdAt: activity.createdAt,
          route: '/admin/users',
        })),
        ...reports.flatMap((report) =>
          (report.history ?? []).map((entry) => ({
            id: entry.id,
            kind: 'moderation' as const,
            label: `Đã ${entry.action} báo cáo`,
            actor: data.users.find((user) => user.id === entry.adminId)?.displayName,
            target: report.reason,
            createdAt: entry.createdAt,
            route: '/admin/moderation',
            queryParam: 'report',
            queryValue: report.id,
          })),
        ),
        ...complaints.flatMap((complaint) =>
          complaint.timeline.map((entry) => ({
            id: entry.id,
            kind: 'complaint' as const,
            label: entry.action || `Cập nhật ${entry.stage}`,
            actor: data.users.find((user) => user.id === entry.createdBy)?.displayName,
            target: complaint.code,
            createdAt: entry.createdAt,
            route: '/admin/complaints',
            queryParam: 'complaint',
            queryValue: complaint.id,
          })),
        ),
      ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      return {
        rangeDays,
        totals: {
          users: users.length,
          lockedUsers: users.filter((user) => user.status === 'locked').length,
          openPosts: posts.filter((post) => post.status === 'open' && !post.hidden).length,
          activeOrders: orders.filter((order) => ['pending', 'in_progress'].includes(order.status))
            .length,
          pendingReports: reports.filter((report) => report.status === 'pending').length,
          openComplaints: complaints.filter((complaint) => complaint.stage !== 'resolved').length,
        },
        kpis: [
          buildKpi(
            'accounts',
            'Tài khoản',
            users.length,
            currentCount(accountDates),
            previousCount(accountDates),
            activityTrend.map((point) => point.accounts),
          ),
          buildKpi(
            'activeOrders',
            'Đơn đang xử lý',
            orders.filter((order) => ['pending', 'in_progress'].includes(order.status)).length,
            currentCount(activeOrderDates),
            previousCount(activeOrderDates),
            activityTrend.map((point) => point.completedOrders),
          ),
          buildKpi(
            'pendingModeration',
            'Báo cáo chờ',
            reports.filter((report) => report.status === 'pending').length,
            currentCount(reportDates),
            previousCount(reportDates),
            activityTrend.map((point) => point.posts),
          ),
          buildKpi(
            'openComplaints',
            'Khiếu nại mở',
            complaints.filter((complaint) => complaint.stage !== 'resolved').length,
            currentCount(complaintDates),
            previousCount(complaintDates),
            activityTrend.map((point) => point.accounts + point.posts),
          ),
        ],
        activityTrend,
        complaintStages,
        complaintPipeline: buildComplaintPipeline(complaints, now),
        complaintSla,
        moderationWorkload,
        moderationPipeline: buildModerationPipeline(reports),
        marketplaceHealth: summarizeMarketplaceHealth(posts, orders, start, now),
        ownership: summarizeOwnership(complaints, reports, actorId),
        regionalMix: summarizeRegionMix(data.regions, complaints, reports, posts),
        categoryMix: summarizeCategoryMix(complaints),
        serviceCategoryMix: summarizeServiceCategoryMix(posts),
        recentActivity: recentActivity.slice(0, 8),
        priorityComplaints: complaints
          .filter((complaint) => complaint.stage !== 'resolved')
          .sort(prioritySort(now))
          .slice(0, 5)
          .map((complaint) => enrichComplaint(complaint, data.users)),
        priorityReports: reports
          .filter((report) => report.status === 'pending')
          .sort(prioritySort(now))
          .slice(0, 5)
          .map((report) => enrichReport(report, data)),
        recentComplaints: complaints
          .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
          .slice(0, 4)
          .map((complaint) => enrichComplaint(complaint, data.users)),
        recentReports: reports
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
          .slice(0, 4)
          .map((report) => enrichReport(report, data)),
        accountActivity: data.adminAccountActivities.slice(0, 5),
      };
    });
  }

  private compare(left: User, right: User, sort: AdminUserFilter['sort']): number {
    if (sort === 'name') return left.displayName.localeCompare(right.displayName, 'vi');
    if (sort === 'tokens') return right.tokenBalance - left.tokenBalance;
    if (sort === 'completed') return right.completedCount - left.completedCount;
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  }
}

@Injectable()
export class LocalModerationRepository extends ModerationRepository {
  private readonly db = inject(MockDb);

  list(actorId: string, filter: ModerationFilter = {}): Observable<ModerationReport[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'moderation.read');
      const query = filter.search?.trim().toLocaleLowerCase('vi');
      return data.moderationReports
        .filter((report) => {
          const matchesSearch =
            !query ||
            report.reason.toLocaleLowerCase('vi').includes(query) ||
            report.details?.toLocaleLowerCase('vi').includes(query);
          return (
            matchesSearch &&
            (!filter.status || filter.status === 'all' || report.status === filter.status) &&
            (!filter.targetType ||
              filter.targetType === 'all' ||
              report.targetType === filter.targetType) &&
            (!filter.regionId || filter.regionId === 'all' || report.regionId === filter.regionId)
          );
        })
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .map((report) => enrichReport(report, data));
    });
  }

  getById(actorId: string, id: string): Observable<ModerationReport | undefined> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'moderation.read');
      const report = data.moderationReports.find((candidate) => candidate.id === id);
      return report ? enrichReport(report, data) : undefined;
    });
  }

  act(input: ModerationActionInput): Observable<ModerationReport> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, input.adminId, 'moderation.act');
        const report = requireValue(
          data.moderationReports.find((candidate) => candidate.id === input.reportId),
          'Không tìm thấy báo cáo.',
        );
        const note = input.note?.trim();
        if ((input.action === 'hide' || input.action === 'dismiss') && !note) {
          throw new RepositoryError('Cần nhập ghi chú xử lý trước khi ẩn hoặc bỏ qua báo cáo.');
        }
        if (input.action === 'hide' || input.action === 'restore') {
          setTargetHidden(data, report, input.action === 'hide');
          report.status = input.action === 'hide' ? 'hidden' : 'pending';
        } else {
          report.status = 'dismissed';
        }
        const now = nowIso();
        report.resolvedAt = now;
        report.resolvedBy = input.adminId;
        report.resolutionNote = note;
        report.history = [
          ...(report.history ?? []),
          {
            id: createEntityId('moderation-history'),
            action: input.action,
            adminId: input.adminId,
            note,
            createdAt: now,
            status: report.status,
          },
        ];
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(
            input.adminId,
            `moderation.${input.action}`,
            'moderation_report',
            report.id,
            now,
            note,
          ),
          after: { status: report.status },
        });
        return enrichReport(report, data);
      }),
    );
  }
}

@Injectable()
export class LocalComplaintRepository extends ComplaintRepository {
  private readonly db = inject(MockDb);

  list(actorId: string, filter: ComplaintFilter = {}): Observable<Complaint[]> {
    return asObservable(() => {
      const query = filter.search?.trim().toLocaleLowerCase('vi');
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'complaints.read');
      return data.complaints
        .filter((complaint) => {
          const matchesSearch =
            !query ||
            complaint.code.toLocaleLowerCase('vi').includes(query) ||
            complaint.subject.toLocaleLowerCase('vi').includes(query) ||
            complaint.description.toLocaleLowerCase('vi').includes(query);
          return (
            matchesSearch &&
            (!filter.stage || filter.stage === 'all' || complaint.stage === filter.stage) &&
            (!filter.priority ||
              filter.priority === 'all' ||
              complaint.priority === filter.priority) &&
            (!filter.regionId ||
              filter.regionId === 'all' ||
              complaint.regionId === filter.regionId)
          );
        })
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .map((complaint) => enrichComplaint(complaint, data.users));
    });
  }

  getById(actorId: string, id: string): Observable<Complaint | undefined> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'complaints.read');
      const complaint = data.complaints.find((candidate) => candidate.id === id);
      return complaint ? enrichComplaint(complaint, data.users) : undefined;
    });
  }

  assign(input: ComplaintAssignInput): Observable<Complaint> {
    return this.advance(input, 'verifying', 'complaints.assign', (complaint, now, data) => {
      const assigneeId = input.assignedAdminId || input.adminId;
      requireAssignableAdmin(data.users, assigneeId, 'complaints.assign');
      complaint.assignedAdminId = assigneeId;
      complaint.sla = { ...complaint.sla, verificationDueAt: addHours(now, 24) };
    });
  }

  recordVerification(input: ComplaintVerificationInput): Observable<Complaint> {
    return this.advance(input, 'collecting_evidence', 'complaints.decide', (complaint, now) => {
      if (!input.summary.trim()) throw new RepositoryError('Cần nhập kết quả xác minh.');
      complaint.verification = {
        valid: input.valid,
        summary: input.summary.trim(),
        recordedAt: now,
        recordedBy: input.adminId,
      };
    });
  }

  requestEvidence(input: ComplaintEvidenceRequestInput): Observable<Complaint> {
    return this.advance(input, 'evaluating', 'complaints.decide', (complaint, now) => {
      if (!complaint.verification) {
        throw new RepositoryError('Cần ghi kết quả xác minh trước khi yêu cầu chứng cứ.');
      }
      complaint.sla = {
        ...complaint.sla,
        userEvidenceDueAt: addHours(now, 48),
        adminProcessingDueAt: addHours(now, 72),
      };
    });
  }

  recordAssessment(input: ComplaintAssessmentInput): Observable<Complaint> {
    return this.advance(input, 'resolving', 'complaints.decide', (complaint, now) => {
      if (!complaint.verification) {
        throw new RepositoryError('Cần có kết quả xác minh trước khi đánh giá trách nhiệm.');
      }
      if (!complaint.sla?.userEvidenceDueAt && complaint.evidence.length === 0) {
        throw new RepositoryError('Cần hoàn tất bước thu thập chứng cứ trước khi đánh giá.');
      }
      if (!input.rationale.trim()) throw new RepositoryError('Cần nhập nhận định trách nhiệm.');
      complaint.assessment = {
        finding: input.finding,
        rationale: input.rationale.trim(),
        severity: input.severity,
        reviewerId: input.adminId,
        reviewedAt: now,
      };
    });
  }

  decideResolution(input: ComplaintResolutionInput): Observable<Complaint> {
    return this.mutateComplaint(input, (complaint, now) => {
      if (complaint.stage !== 'resolving') {
        throw new RepositoryError('Chỉ có thể ghi quyết định ở bước xử lý.');
      }
      if (!complaint.assessment) {
        throw new RepositoryError('Cần có nhận định trách nhiệm trước khi ra quyết định.');
      }
      const conclusion = input.resolution?.trim();
      if (!conclusion) throw new RepositoryError('Cần nhập nội dung kết luận.');
      if (input.amount !== undefined && input.amount < 0) {
        throw new RepositoryError('Số tiền bồi hoàn không được âm.');
      }
      complaint.resolution = conclusion;
      complaint.remedy = {
        type: input.remedyType,
        conclusion,
        amount: input.amount,
        sanctionLevel: input.sanctionLevel,
        decidedBy: input.adminId,
        decidedAt: now,
      };
    });
  }

  notifyParties(input: ComplaintNotifyInput): Observable<Complaint> {
    return this.advance(input, 'notified', 'complaints.decide', (complaint, now) => {
      const channels = input.channels.map((channel) => channel.trim()).filter(Boolean);
      if (!channels.length) throw new RepositoryError('Cần chọn kênh thông báo.');
      if (!complaint.remedy)
        throw new RepositoryError('Cần có quyết định xử lý trước khi thông báo.');
      complaint.notification = {
        state: 'sent',
        channels,
        sentAt: now,
        sentBy: input.adminId,
        responseDueAt: addHours(now, 72),
      };
      complaint.sla = { ...complaint.sla, responseDueAt: addHours(now, 72) };
    });
  }

  recordPartyResponse(input: ComplaintPartyResponseInput): Observable<Complaint> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, input.adminId, 'complaints.decide');
        const complaint = requireValue(
          data.complaints.find((candidate) => candidate.id === input.complaintId),
          'Không tìm thấy khiếu nại.',
        );
        if (complaint.stage !== 'notified') {
          throw new RepositoryError('Chỉ ghi nhận phản hồi sau khi đã thông báo kết quả.');
        }
        if (input.party === 'complainant' && input.userId !== complaint.complainantId) {
          throw new RepositoryError('Người phản hồi không khớp bên khiếu nại.');
        }
        if (input.party === 'respondent' && input.userId !== complaint.respondentId) {
          throw new RepositoryError('Người phản hồi không khớp bên bị khiếu nại.');
        }
        const now = nowIso();
        complaint.partyResponses = {
          ...complaint.partyResponses,
          [input.party]: {
            accepted: input.accepted,
            note: input.note?.trim(),
            respondedAt: now,
            respondedBy: input.userId,
          },
        };
        complaint.updatedAt = now;
        appendAuditEvent(
          data.auditEvents,
          auditTarget(
            input.adminId,
            'complaint.party_response',
            'complaint',
            complaint.id,
            now,
            input.note?.trim(),
          ),
        );
        return enrichComplaint(complaint, data.users);
      }),
    );
  }

  appeal(input: ComplaintAppealInput): Observable<Complaint> {
    return this.advance(input, 'evaluating', 'complaints.decide', (complaint, now, data) => {
      if (!input.reason.trim()) throw new RepositoryError('Cần nhập lý do phúc khảo.');
      if (complaint.appeal?.used)
        throw new RepositoryError('Khiếu nại chỉ được phúc khảo một lần.');
      if (!complaint.notification?.responseDueAt) {
        throw new RepositoryError('Chỉ phúc khảo sau khi đã thông báo kết quả.');
      }
      if (Date.parse(now) > Date.parse(complaint.notification.responseDueAt)) {
        throw new RepositoryError('Đã quá hạn phúc khảo khiếu nại.');
      }
      requireAssignableAdmin(data.users, input.reviewerId, 'complaints.decide');
      if (input.reviewerId === complaint.remedy?.decidedBy) {
        throw new RepositoryError('Người phúc khảo phải khác người ra quyết định ban đầu.');
      }
      complaint.appeal = {
        requestedBy: input.requestedBy,
        reason: input.reason.trim(),
        requestedAt: now,
        reviewerId: input.reviewerId,
        originalReviewerId: complaint.remedy?.decidedBy,
        used: true,
      };
    });
  }

  close(input: ComplaintResolutionInput): Observable<Complaint> {
    return this.advance(input, 'resolved', 'complaints.decide', (complaint) => {
      const conclusion = input.resolution?.trim() || complaint.resolution?.trim();
      if (!conclusion)
        throw new RepositoryError('Cần nhập nội dung kết luận trước khi đóng khiếu nại.');
      if (!complaint.notification?.responseDueAt) {
        throw new RepositoryError('Cần thông báo kết quả trước khi đóng khiếu nại.');
      }
      const complainantAccepted = complaint.partyResponses?.complainant?.accepted === true;
      const respondentAccepted =
        !complaint.respondentId || complaint.partyResponses?.respondent?.accepted === true;
      const responseExpired =
        Date.parse(nowIso()) >= Date.parse(complaint.notification.responseDueAt);
      if ((!complainantAccepted || !respondentAccepted) && !responseExpired) {
        throw new RepositoryError(
          'Chỉ đóng khiếu nại sau khi các bên chấp nhận hoặc hết hạn phản hồi.',
        );
      }
      complaint.resolution = conclusion;
    });
  }

  private mutateComplaint(
    input: { adminId: string; complaintId: string; note?: string },
    apply: (complaint: Complaint, now: string) => void,
  ): Observable<Complaint> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, input.adminId, 'complaints.decide');
        const complaint = requireValue(
          data.complaints.find((candidate) => candidate.id === input.complaintId),
          'Không tìm thấy khiếu nại.',
        );
        if (complaint.appeal?.used && complaint.appeal.reviewerId !== input.adminId) {
          throw new RepositoryError(
            'Chỉ người thụ lý phúc khảo mới được tiếp tục quyết định hồ sơ này.',
          );
        }
        const now = nowIso();
        apply(complaint, now);
        complaint.updatedAt = now;
        complaint.timeline.push({
          id: createEntityId('complaint-timeline'),
          stage: complaint.stage,
          note: input.note?.trim(),
          createdAt: now,
          createdBy: input.adminId,
        });
        appendAuditEvent(
          data.auditEvents,
          auditTarget(
            input.adminId,
            'complaint.decision',
            'complaint',
            complaint.id,
            now,
            input.note?.trim(),
          ),
        );
        return enrichComplaint(complaint, data.users);
      }),
    );
  }

  private advance(
    input: { adminId: string; complaintId: string; note?: string },
    toStage: ComplaintStage,
    permission: 'complaints.assign' | 'complaints.decide',
    apply?: (complaint: Complaint, now: string, data: MockDatabaseData) => void,
  ): Observable<Complaint> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, input.adminId, permission);
        const complaint = requireValue(
          data.complaints.find((candidate) => candidate.id === input.complaintId),
          'Không tìm thấy khiếu nại.',
        );
        if (complaint.appeal?.used && complaint.appeal.reviewerId !== input.adminId) {
          throw new RepositoryError(
            'Chỉ người thụ lý phúc khảo mới được tiếp tục quyết định hồ sơ này.',
          );
        }
        const currentIndex = COMPLAINT_STAGES.indexOf(complaint.stage);
        const targetIndex = COMPLAINT_STAGES.indexOf(toStage);
        const isAppeal = complaint.stage === 'notified' && toStage === 'evaluating';
        const isNotifyRefresh = complaint.stage === 'notified' && toStage === 'notified';
        if (!isAppeal && !isNotifyRefresh && targetIndex !== currentIndex + 1) {
          throw new RepositoryError('Khiếu nại chỉ được chuyển sang bước kế tiếp.');
        }

        const now = nowIso();
        apply?.(complaint, now, data);
        complaint.stage = toStage;
        complaint.updatedAt = now;
        complaint.timeline.push({
          id: createEntityId('complaint-timeline'),
          stage: toStage,
          note: input.note?.trim(),
          createdAt: now,
          createdBy: input.adminId,
        });
        appendAuditEvent(
          data.auditEvents,
          auditTarget(
            input.adminId,
            `complaint.${toStage}`,
            'complaint',
            complaint.id,
            now,
            input.note?.trim(),
          ),
        );
        return enrichComplaint(complaint, data.users);
      }),
    );
  }
}

@Injectable()
export class LocalConfigRepository extends ConfigRepository {
  private readonly db = inject(MockDb);

  listRegions(actorId: string): Observable<Region[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'configuration.manage');
      return data.regions.map((region) => this.enrichRegion(region, data));
    });
  }

  createRegion(actorId: string, input: RegionInput): Observable<Region> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const now = nowIso();
        const region: Region = { id: createEntityId('region'), ...input };
        data.regions.push(region);
        appendAuditEvent(
          data.auditEvents,
          auditTarget(actorId, 'region.create', 'region', region.id, now),
        );
        return this.enrichRegion(region, data);
      }),
    );
  }

  updateRegion(actorId: string, id: string, input: RegionInput): Observable<Region> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const region = requireValue(
          data.regions.find((candidate) => candidate.id === id),
          'Không tìm thấy khu vực.',
        );
        const before = { name: region.name, city: region.city, status: region.status };
        Object.assign(region, input);
        const now = nowIso();
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(actorId, 'region.update', 'region', region.id, now),
          before,
          after: { name: region.name, city: region.city, status: region.status },
        });
        return this.enrichRegion(region, data);
      }),
    );
  }

  setRegionStatus(actorId: string, id: string, status: Region['status']): Observable<Region> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const region = requireValue(
          data.regions.find((candidate) => candidate.id === id),
          'Không tìm thấy khu vực.',
        );
        const before = region.status;
        region.status = status;
        const now = nowIso();
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(actorId, 'region.update', 'region', region.id, now),
          before: { status: before },
          after: { status: region.status },
        });
        return this.enrichRegion(region, data);
      }),
    );
  }

  listServiceCategories(actorId: string): Observable<ServiceCategoryConfig[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'configuration.manage');
      return data.serviceCategories.map((category) => this.enrichCategory(category, data));
    });
  }

  createServiceCategory(
    actorId: string,
    input: ServiceCategoryInput,
  ): Observable<ServiceCategoryConfig> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const now = nowIso();
        const category: ServiceCategoryConfig = {
          id: createEntityId('category'),
          postCount: 0,
          ...input,
        };
        data.serviceCategories.push(category);
        appendAuditEvent(
          data.auditEvents,
          auditTarget(actorId, 'service_category.create', 'service_category', category.id, now),
        );
        return this.enrichCategory(category, data);
      }),
    );
  }

  updateServiceCategory(
    actorId: string,
    id: string,
    input: ServiceCategoryInput,
  ): Observable<ServiceCategoryConfig> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const category = requireValue(
          data.serviceCategories.find((candidate) => candidate.id === id),
          'Không tìm thấy danh mục.',
        );
        const before = {
          name: category.name,
          attributesCount: category.attributesCount,
          active: category.active,
        };
        Object.assign(category, input);
        const now = nowIso();
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(actorId, 'service_category.update', 'service_category', category.id, now),
          before,
          after: {
            name: category.name,
            attributesCount: category.attributesCount,
            active: category.active,
          },
        });
        return this.enrichCategory(category, data);
      }),
    );
  }

  removeServiceCategory(actorId: string, id: string): Observable<void> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const index = data.serviceCategories.findIndex((candidate) => candidate.id === id);
        if (index === -1) throw new RepositoryError('Không tìm thấy danh mục.');
        const [removed] = data.serviceCategories.splice(index, 1);
        appendAuditEvent(
          data.auditEvents,
          auditTarget(actorId, 'service_category.remove', 'service_category', removed.id, nowIso()),
        );
      }),
    );
  }

  listAdminAccounts(actorId: string): Observable<User[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'configuration.manage');
      return data.users.filter((user) => user.role !== 'user');
    });
  }

  createAdminAccount(actorId: string, input: AdminAccountInput): Observable<User> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const now = nowIso();
        const account: User = {
          id: createEntityId('admin'),
          phone: '',
          email: input.email,
          displayName: input.displayName,
          location: { building: 'Văn phòng AntGo', regionId: 'all' },
          role: input.role,
          status: 'active',
          isVerified: true,
          reputationScore: null,
          completedCount: 0,
          completionRate: 0,
          reviewParticipationRate: 0,
          tokenBalance: 0,
          createdAt: now,
        };
        data.users.push(account);
        appendAuditEvent(
          data.auditEvents,
          auditTarget(actorId, 'admin_account.create', 'admin_account', account.id, now),
        );
        return account;
      }),
    );
  }

  updateAdminAccountRole(
    actorId: string,
    userId: string,
    role: AdminAccountInput['role'],
  ): Observable<User> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        const account = requireValue(
          data.users.find((candidate) => candidate.id === userId && candidate.role !== 'user'),
          'Không tìm thấy tài khoản quản trị.',
        );
        const before = account.role;
        account.role = role;
        const now = nowIso();
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(actorId, 'admin_account.update', 'admin_account', account.id, now),
          before: { role: before },
          after: { role: account.role },
        });
        return account;
      }),
    );
  }

  setAdminAccountStatus(actorId: string, userId: string, status: UserStatus): Observable<User> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'configuration.manage');
        if (actorId === userId) {
          throw new RepositoryError('Không thể khóa chính tài khoản quản trị đang đăng nhập.');
        }
        const account = requireValue(
          data.users.find((candidate) => candidate.id === userId && candidate.role !== 'user'),
          'Không tìm thấy tài khoản quản trị.',
        );
        const before = account.status;
        account.status = status;
        const now = nowIso();
        appendAuditEvent(data.auditEvents, {
          ...auditTarget(actorId, 'admin_account.update', 'admin_account', account.id, now),
          before: { status: before },
          after: { status: account.status },
        });
        return account;
      }),
    );
  }

  private enrichRegion(region: Region, data: MockDatabaseData): Region {
    return {
      ...region,
      userCount: data.users.filter((user) => user.location.regionId === region.id).length,
      providerCount: data.users.filter(
        (user) => user.location.regionId === region.id && user.completedCount > 0,
      ).length,
    };
  }

  private enrichCategory(
    category: ServiceCategoryConfig,
    data: MockDatabaseData,
  ): ServiceCategoryConfig {
    return {
      ...category,
      postCount: data.posts.filter((post) => post.category === category.key).length,
    };
  }

  getBusinessConfig(actorId: string): Observable<BusinessConfig> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'configuration.manage');
      return data.businessConfig;
    });
  }

  saveBusinessConfig(adminId: string, input: BusinessConfigInput): Observable<BusinessConfig> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, adminId, 'configuration.manage');
        const errors = this.validateBusinessConfig(input);
        if (Object.keys(errors).length) {
          throw new RepositoryError('Thông số cấu hình chưa hợp lệ.');
        }
        const now = nowIso();
        data.businessConfig = {
          ...input,
          tokenPackages: input.tokenPackages.map((item) => ({ ...item })),
          updatedAt: now,
          updatedBy: adminId,
        };
        appendAuditEvent(
          data.auditEvents,
          auditTarget(adminId, 'configuration.save', 'configuration', 'business', now),
        );
        return data.businessConfig;
      }),
    );
  }

  restoreDefaults(adminId: string): Observable<BusinessConfig> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, adminId, 'configuration.manage');
        const now = nowIso();
        data.businessConfig = { ...DEMO_BUSINESS_CONFIG, updatedAt: now, updatedBy: adminId };
        appendAuditEvent(
          data.auditEvents,
          auditTarget(adminId, 'configuration.restore', 'configuration', 'business', now),
        );
        return data.businessConfig;
      }),
    );
  }

  validateBusinessConfig(input: BusinessConfigInput): BusinessConfigValidationErrors {
    const errors: BusinessConfigValidationErrors = {};
    if (input.platformFeePct < 0 || input.platformFeePct > 30) {
      errors.platformFeePct = 'Phí nền tảng phải từ 0% đến 30%.';
    }
    if (input.escrowFeePct < 0 || input.escrowFeePct > 10) {
      errors.escrowFeePct = 'Phí đảm bảo phải từ 0% đến 10%.';
    }
    if (input.postDurationHours < 1)
      errors.postDurationHours = 'Thời hạn bài đăng tối thiểu 1 giờ.';
    if (input.priorityDurationHours < 1) {
      errors.priorityDurationHours = 'Thời hạn ưu tiên tối thiểu 1 giờ.';
    }
    if (input.autoCompleteHours < 1) errors.autoCompleteHours = 'Tự hoàn tất tối thiểu 1 giờ.';
    if (input.minWithdrawalAmount < 0)
      errors.minWithdrawalAmount = 'Số tiền rút tối thiểu không âm.';
    if (input.minRatingThreshold < 0 || input.minRatingThreshold > 5) {
      errors.minRatingThreshold = 'Điểm đánh giá tối thiểu phải từ 0 đến 5.';
    }
    if (input.minComplaintsThreshold < 0) {
      errors.minComplaintsThreshold = 'Số khiếu nại tối thiểu không âm.';
    }
    if (
      !input.tokenPackages.length ||
      input.tokenPackages.some((pack) => !pack.name.trim() || pack.tokens <= 0 || pack.price < 0)
    ) {
      errors.tokenPackages = 'Mỗi gói token cần tên, số token dương và giá không âm.';
    }
    return errors;
  }
}

function enrichComplaint(complaint: Complaint, users: User[]): Complaint {
  return {
    ...complaint,
    complainant: users.find((user) => user.id === complaint.complainantId),
    respondent: users.find((user) => user.id === complaint.respondentId),
    assignedAdmin: users.find((user) => user.id === complaint.assignedAdminId),
  };
}

function addHours(baseIso: string, hours: number): string {
  return new Date(Date.parse(baseIso) + hours * 60 * 60 * 1000).toISOString();
}

function enrichReport(
  report: ModerationReport,
  data: { users: User[]; posts: unknown[]; reviews: unknown[]; messages: unknown[] },
): ModerationReport {
  const target =
    report.targetType === 'post'
      ? data.posts.find((item) => isTarget(item, report.targetId))
      : report.targetType === 'review'
        ? data.reviews.find((item) => isTarget(item, report.targetId))
        : data.messages.find((item) => isTarget(item, report.targetId));
  const targetAuthorId = isRecord(target)
    ? stringProperty(target, 'authorId') ||
      stringProperty(target, 'raterId') ||
      stringProperty(target, 'senderId')
    : undefined;
  const contextLabel = isRecord(target)
    ? stringProperty(target, 'orderId')
      ? `Đơn hàng ${stringProperty(target, 'orderId')}`
      : stringProperty(target, 'conversationId')
        ? `Hội thoại ${stringProperty(target, 'conversationId')}`
        : undefined
    : undefined;
  return {
    ...report,
    target: target as ModerationReport['target'],
    reporter: data.users.find((user) => user.id === report.reporterId),
    targetAuthor: data.users.find((user) => user.id === targetAuthorId),
    contextLabel,
  };
}

function setTargetHidden(
  data: {
    posts: { id: string; hidden: boolean }[];
    reviews: { id: string; hidden: boolean }[];
    messages: { id: string; hidden: boolean }[];
  },
  report: ModerationReport,
  hidden: boolean,
): void {
  const collection =
    report.targetType === 'post'
      ? data.posts
      : report.targetType === 'review'
        ? data.reviews
        : data.messages;
  const target = requireValue(
    collection.find((item) => item.id === report.targetId),
    'Không tìm thấy nội dung bị báo cáo.',
  );
  target.hidden = hidden;
}

function isTarget(value: unknown, id: string): value is { id: string } {
  return typeof value === 'object' && value !== null && 'id' in value && value.id === id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringProperty(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] : undefined;
}
