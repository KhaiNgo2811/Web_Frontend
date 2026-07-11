import type { IsoDateString } from './common';

export type AuditTargetType =
  'user' | 'moderation_report' | 'complaint' | 'configuration' | 'export';

export interface AuditEvent {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetType: AuditTargetType;
  readonly targetId: string;
  readonly createdAt: IsoDateString;
  readonly reason?: string;
  readonly before?: Readonly<Record<string, string | number | boolean | null>>;
  readonly after?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface AuditFilter {
  search?: string;
  actorId?: string;
  action?: string;
  targetType?: AuditTargetType | 'all';
}

export interface ExportJob {
  id: string;
  requestedBy: string;
  createdAt: IsoDateString;
  status: 'queued' | 'ready' | 'failed';
  format: 'csv';
  redaction: 'default';
  retentionUntil: IsoDateString;
}
