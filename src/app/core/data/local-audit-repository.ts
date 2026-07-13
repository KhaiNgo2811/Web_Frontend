import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AuditEvent, AuditEventTargetLink, AuditFilter, ExportJob } from '../models';
import type { MockDatabaseData } from '../mock';
import { requireAdminPermission } from './admin-authorization.utils';
import { appendAuditEvent, auditTarget } from './audit.utils';
import { asObservable, createEntityId, nowIso } from './local-repository.utils';
import { MockDb } from './mock-db';
import { AuditRepository } from './repositories';

@Injectable()
export class LocalAuditRepository extends AuditRepository {
  private readonly db = inject(MockDb);

  list(actorId: string, filter: AuditFilter = {}): Observable<AuditEvent[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'audit.read');
      const query = filter.search?.trim().toLocaleLowerCase('vi');
      return data.auditEvents
        .filter((event) => {
          const text = `${event.action} ${event.targetId} ${event.reason ?? ''}`.toLocaleLowerCase(
            'vi',
          );
          return (
            (!query || text.includes(query)) &&
            (!filter.actorId || event.actorId === filter.actorId) &&
            (!filter.action || event.action === filter.action) &&
            (!filter.targetType ||
              filter.targetType === 'all' ||
              event.targetType === filter.targetType)
          );
        })
        .map((event) => ({
          ...event,
          actorName: data.users.find((user) => user.id === event.actorId)?.displayName,
          ...resolveAuditTarget(event, data),
        }));
    });
  }

  requestExport(actorId: string, scope: ExportJob['scope'] = 'audit'): Observable<ExportJob> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireAdminPermission(data.users, actorId, 'audit.export');
        const createdAt = nowIso();
        const job: ExportJob = {
          id: createEntityId('export'),
          requestedBy: actorId,
          createdAt,
          status: 'queued',
          format: 'csv',
          redaction: 'default',
          retentionUntil: new Date(Date.parse(createdAt) + 7 * 24 * 60 * 60 * 1000).toISOString(),
          scope,
        };
        data.exportJobs.unshift(job);
        appendAuditEvent(
          data.auditEvents,
          auditTarget(
            actorId,
            'audit.export_requested',
            'export',
            job.id,
            createdAt,
            'default redaction',
          ),
        );
        return job;
      }),
    );
  }

  listExports(actorId: string): Observable<ExportJob[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'audit.export');
      return data.exportJobs;
    });
  }
}

function resolveAuditTarget(
  event: AuditEvent,
  data: MockDatabaseData,
): { targetLabel: string; moduleLabel: string; targetLink?: AuditEventTargetLink } {
  switch (event.targetType) {
    case 'user':
    case 'admin_account': {
      const user = data.users.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: user?.displayName ?? event.targetId,
        moduleLabel: 'Người dùng',
        targetLink: { route: ['/admin/users'], queryParams: { search: user?.displayName ?? '' } },
      };
    }
    case 'complaint': {
      const complaint = data.complaints.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: complaint ? `#${complaint.code}` : event.targetId,
        moduleLabel: 'Khiếu nại',
        targetLink: { route: ['/admin/complaints'], queryParams: { complaint: event.targetId } },
      };
    }
    case 'review': {
      const review = data.reviews.find((candidate) => candidate.id === event.targetId);
      const ratee = review && data.users.find((user) => user.id === review.rateeId);
      return {
        targetLabel: review?.comment
          ? `"${review.comment}"`
          : `Đánh giá ${ratee?.displayName ?? event.targetId}`,
        moduleLabel: 'Đánh giá',
        targetLink: { route: ['/admin/reviews'] },
      };
    }
    case 'moderation_report': {
      const report = data.moderationReports.find((candidate) => candidate.id === event.targetId);
      const link: AuditEventTargetLink = {
        route: ['/admin/moderation'],
        queryParams: { report: event.targetId },
      };
      if (!report) return { targetLabel: event.targetId, moduleLabel: 'Kiểm duyệt', targetLink: link };
      if (report.targetType === 'post') {
        const post = data.posts.find((candidate) => candidate.id === report.targetId);
        return {
          targetLabel: post ? `"${post.title}"` : report.reason,
          moduleLabel: 'Bài đăng',
          targetLink: link,
        };
      }
      if (report.targetType === 'review') {
        const review = data.reviews.find((candidate) => candidate.id === report.targetId);
        return {
          targetLabel: review?.comment ? `"${review.comment}"` : report.reason,
          moduleLabel: 'Đánh giá',
          targetLink: link,
        };
      }
      return { targetLabel: report.reason, moduleLabel: 'Tin nhắn', targetLink: link };
    }
    case 'region': {
      const region = data.regions.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: region?.name ?? event.targetId,
        moduleLabel: 'Khu vực',
        targetLink: { route: ['/admin/config'] },
      };
    }
    case 'service_category': {
      const category = data.serviceCategories.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: category?.name ?? event.targetId,
        moduleLabel: 'Danh mục dịch vụ',
        targetLink: { route: ['/admin/config'] },
      };
    }
    case 'post_boost_tier': {
      const tier = data.postBoostTiers.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: tier ? `Mức giá ${tier.durationDays} ngày` : event.targetId,
        moduleLabel: 'Giá đẩy bài',
        targetLink: { route: ['/admin/config'] },
      };
    }
    case 'provider_promotion_plan': {
      const plan = data.providerPromotionPlans.find((candidate) => candidate.id === event.targetId);
      return {
        targetLabel: plan?.name ?? event.targetId,
        moduleLabel: 'Gói quảng bá',
        targetLink: { route: ['/admin/config'] },
      };
    }
    case 'export':
      return { targetLabel: 'Yêu cầu xuất nhật ký', moduleLabel: 'Xuất dữ liệu' };
    case 'configuration':
    default:
      return { targetLabel: 'Cấu hình hệ thống', moduleLabel: 'Cấu hình', targetLink: { route: ['/admin/config'] } };
  }
}
