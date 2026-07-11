import type { AuditEvent, AuditTargetType } from '../models';

import { createEntityId } from './local-repository.utils';

export function appendAuditEvent(events: AuditEvent[], event: Omit<AuditEvent, 'id'>): void {
  events.unshift({ ...event, id: createEntityId('audit') });
}

export function auditTarget(
  actorId: string,
  action: string,
  targetType: AuditTargetType,
  targetId: string,
  createdAt: string,
  reason?: string,
): Omit<AuditEvent, 'id'> {
  return { actorId, action, targetType, targetId, createdAt, reason };
}
