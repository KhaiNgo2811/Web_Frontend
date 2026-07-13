import type { IsoDateString } from './common';

export type InboxSource = 'moderation' | 'complaint';
export type InboxAssignment = 'all' | 'mine' | 'unassigned';
export type InboxSlaFilter = 'all' | 'due_soon' | 'overdue';

export interface InboxItem {
  id: string;
  source: InboxSource;
  sourceId: string;
  title: string;
  status: string;
  priority: 'normal' | 'high';
  assignedAdminId?: string;
  handoffNote?: string;
  dueAt?: IsoDateString;
  createdAt: IsoDateString;
}

export interface InboxFilter {
  assignment?: InboxAssignment;
  sla?: InboxSlaFilter;
  savedView?: 'all_open' | 'unassigned' | 'breach_risk';
}

export interface InboxAssignmentInput {
  actorId: string;
  items: Pick<InboxItem, 'source' | 'sourceId'>[];
  assigneeId?: string;
  handoffNote?: string;
}
