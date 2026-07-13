import type { IsoDateString } from './common';

export type AuditTargetType =
  | 'user'
  | 'moderation_report'
  | 'complaint'
  | 'configuration'
  | 'export'
  | 'region'
  | 'service_category'
  | 'admin_account'
  | 'post_boost_tier'
  | 'provider_promotion_plan'
  | 'review';

export interface AuditEventTargetLink {
  readonly route: readonly string[];
  readonly queryParams?: Readonly<Record<string, string>>;
}

export interface AuditEvent {
  readonly id: string;
  readonly actorId: string;
  readonly actorName?: string;
  readonly action: string;
  readonly targetType: AuditTargetType;
  readonly targetId: string;
  readonly createdAt: IsoDateString;
  readonly reason?: string;
  readonly before?: Readonly<Record<string, string | number | boolean | null>>;
  readonly after?: Readonly<Record<string, string | number | boolean | null>>;
  readonly targetLabel?: string;
  readonly moduleLabel?: string;
  readonly targetLink?: AuditEventTargetLink;
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
  scope: 'audit' | 'dashboard_report';
}
