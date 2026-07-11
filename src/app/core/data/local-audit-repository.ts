import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AuditEvent, AuditFilter, ExportJob } from '../models';
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
      return data.auditEvents.filter((event) => {
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
      });
    });
  }

  requestExport(actorId: string): Observable<ExportJob> {
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
