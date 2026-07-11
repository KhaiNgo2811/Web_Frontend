import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { InboxAssignmentInput, InboxFilter, InboxItem } from '../models';
import { appendAuditEvent, auditTarget } from './audit.utils';
import { requireAdminPermission, requireAssignableAdmin } from './admin-authorization.utils';
import { asObservable, nowIso, requireValue } from './local-repository.utils';
import { MockDb } from './mock-db';
import { InboxRepository } from './repositories';

@Injectable()
export class LocalInboxRepository extends InboxRepository {
  private readonly db = inject(MockDb);

  list(actorId: string, filter: InboxFilter = {}): Observable<InboxItem[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      requireAdminPermission(data.users, actorId, 'admin.access');
      return this.items(data)
        .filter((item) => this.matches(item, actorId, filter))
        .sort(urgencySort);
    });
  }

  assign(input: InboxAssignmentInput): Observable<InboxItem[]> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const now = nowIso();
        for (const item of input.items) {
          if (item.source === 'moderation') {
            requireAdminPermission(data.users, input.actorId, 'moderation.assign');
            if (input.assigneeId)
              requireAssignableAdmin(data.users, input.assigneeId, 'moderation.assign');
            const report = requireValue(
              data.moderationReports.find((entry) => entry.id === item.sourceId),
              'Không tìm thấy báo cáo.',
            );
            report.assignedAdminId = input.assigneeId;
            report.handoffNote = input.handoffNote?.trim();
          } else {
            requireAdminPermission(data.users, input.actorId, 'complaints.assign');
            if (input.assigneeId)
              requireAssignableAdmin(data.users, input.assigneeId, 'complaints.assign');
            const complaint = requireValue(
              data.complaints.find((entry) => entry.id === item.sourceId),
              'Không tìm thấy khiếu nại.',
            );
            complaint.assignedAdminId = input.assigneeId;
            complaint.updatedAt = now;
          }
          appendAuditEvent(
            data.auditEvents,
            auditTarget(
              input.actorId,
              'inbox.assign',
              item.source === 'moderation' ? 'moderation_report' : 'complaint',
              item.sourceId,
              now,
              input.handoffNote?.trim(),
            ),
          );
        }
        return this.items(data).filter((item) =>
          input.items.some(
            (entry) => entry.source === item.source && entry.sourceId === item.sourceId,
          ),
        );
      }),
    );
  }

  private items(data: ReturnType<MockDb['snapshot']>): InboxItem[] {
    const reports = data.moderationReports
      .filter((report) => report.status === 'pending')
      .map((report) => ({
        id: `moderation:${report.id}`,
        source: 'moderation' as const,
        sourceId: report.id,
        title: report.reason,
        status: report.status,
        priority: report.priority ?? 'normal',
        assignedAdminId: report.assignedAdminId,
        handoffNote: report.handoffNote,
        createdAt: report.createdAt,
      }));
    const complaints = data.complaints
      .filter((complaint) => complaint.stage !== 'resolved')
      .map((complaint) => ({
        id: `complaint:${complaint.id}`,
        source: 'complaint' as const,
        sourceId: complaint.id,
        title: `${complaint.code} · ${complaint.subject}`,
        status: complaint.stage,
        priority: complaint.priority,
        assignedAdminId: complaint.assignedAdminId,
        dueAt:
          complaint.sla?.adminProcessingDueAt ??
          complaint.sla?.verificationDueAt ??
          complaint.sla?.responseDueAt,
        createdAt: complaint.createdAt,
      }));
    return [...reports, ...complaints];
  }

  private matches(item: InboxItem, actorId: string, filter: InboxFilter): boolean {
    const assignment =
      filter.savedView === 'unassigned' ? 'unassigned' : (filter.assignment ?? 'all');
    const sla = filter.savedView === 'breach_risk' ? 'due_soon' : (filter.sla ?? 'all');
    if (assignment === 'mine' && item.assignedAdminId !== actorId) return false;
    if (assignment === 'unassigned' && item.assignedAdminId) return false;
    const risk = slaState(item.dueAt);
    return sla === 'all' || risk === sla;
  }
}

function slaState(dueAt?: string): 'due_soon' | 'overdue' | 'within' {
  if (!dueAt) return 'within';
  const remaining = Date.parse(dueAt) - Date.now();
  if (remaining < 0) return 'overdue';
  return remaining <= 24 * 60 * 60 * 1000 ? 'due_soon' : 'within';
}

function urgencySort(left: InboxItem, right: InboxItem): number {
  const risk = { overdue: 0, due_soon: 1, within: 2 };
  return (
    risk[slaState(left.dueAt)] - risk[slaState(right.dueAt)] ||
    Number(right.priority === 'high') - Number(left.priority === 'high') ||
    Date.parse(left.createdAt) - Date.parse(right.createdAt)
  );
}
