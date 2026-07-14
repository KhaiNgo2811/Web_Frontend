import type { IsoDateString } from './common';
import type { User } from './user';

export interface Evidence {
  id: string;
  label: string;
  type?: 'image' | 'message' | 'document' | 'system';
  source?: string;
  strength?: 'weak' | 'medium' | 'strong';
  validity?: 'pending' | 'valid' | 'invalid';
  url?: string;
  preview?: string;
  note?: string;
  createdAt: IsoDateString;
  createdBy: string;
  submitter?: User;
}

export type ComplaintStage =
  | 'received'
  | 'verifying'
  | 'collecting_evidence'
  | 'evaluating'
  | 'resolving'
  | 'notified'
  | 'resolved';

export interface ComplaintTimelineEntry {
  id: string;
  stage: ComplaintStage;
  action?: string;
  note?: string;
  output?: string;
  createdAt: IsoDateString;
  createdBy: string;
  actor?: User;
}

export interface Complaint {
  id: string;
  code: string;
  regionId: string;
  orderId?: string;
  complainantId: string;
  respondentId?: string;
  subject: string;
  description: string;
  category?: 'quality' | 'payment' | 'schedule' | 'conduct' | 'other';
  stage: ComplaintStage;
  priority: 'normal' | 'high';
  assignedAdminId?: string;
  sla?: ComplaintSla;
  verification?: ComplaintVerification;
  evidence: Evidence[];
  assessment?: ComplaintAssessment;
  remedy?: ComplaintRemedy;
  notification?: ComplaintNotification;
  partyResponses?: ComplaintPartyResponses;
  appeal?: ComplaintAppeal;
  timeline: ComplaintTimelineEntry[];
  resolution?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  complainant?: User;
  respondent?: User;
  assignedAdmin?: User;
}

export interface ComplaintSla {
  verificationDueAt?: IsoDateString;
  userEvidenceDueAt?: IsoDateString;
  adminProcessingDueAt?: IsoDateString;
  assessmentDueAt?: IsoDateString;
  remedyDueAt?: IsoDateString;
  responseDueAt?: IsoDateString;
}

export interface ComplaintVerification {
  valid: boolean;
  summary: string;
  recordedAt: IsoDateString;
  recordedBy: string;
}

export interface ComplaintAssessment {
  finding: 'complainant' | 'respondent' | 'shared' | 'none';
  rationale: string;
  severity: 'none' | 'low' | 'medium' | 'high';
  reviewerId: string;
  reviewedAt: IsoDateString;
}

export interface ComplaintRemedy {
  type: 'none' | 'refund' | 'compensation' | 'redo' | 'warning';
  conclusion: string;
  amount?: number;
  sanctionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  decidedBy: string;
  decidedAt: IsoDateString;
}

export interface ComplaintNotification {
  state: 'pending' | 'sent';
  channels: string[];
  sentAt?: IsoDateString;
  sentBy?: string;
  responseDueAt?: IsoDateString;
}

export interface ComplaintPartyResponse {
  accepted: boolean;
  note?: string;
  respondedAt: IsoDateString;
  respondedBy: string;
}

export interface ComplaintPartyResponses {
  complainant?: ComplaintPartyResponse;
  respondent?: ComplaintPartyResponse;
}

export interface ComplaintAppeal {
  requestedBy: string;
  reason: string;
  requestedAt: IsoDateString;
  reviewerId: string;
  originalReviewerId?: string;
  used: boolean;
}

export interface ComplaintFilter {
  stage?: ComplaintStage | 'all';
  priority?: 'normal' | 'high' | 'all';
  regionId?: string;
  search?: string;
}

export interface ComplaintActionInput {
  adminId: string;
  complaintId: string;
  note?: string;
}

export interface ComplaintAssignInput extends ComplaintActionInput {
  assignedAdminId?: string;
}

export interface ComplaintVerificationInput extends ComplaintActionInput {
  valid: boolean;
  summary: string;
}

export interface ComplaintEvidenceRequestInput extends ComplaintActionInput {
  requestedFrom?: string;
}

export interface ComplaintAssessmentInput extends ComplaintActionInput {
  finding: ComplaintAssessment['finding'];
  rationale: string;
  severity: ComplaintAssessment['severity'];
}

export interface ComplaintResolutionInput extends ComplaintActionInput {
  remedyType: ComplaintRemedy['type'];
  resolution?: string;
  amount?: number;
  sanctionLevel?: ComplaintRemedy['sanctionLevel'];
}

export interface ComplaintNotifyInput extends ComplaintActionInput {
  channels: string[];
}

export interface ComplaintPartyResponseInput extends ComplaintActionInput {
  party: 'complainant' | 'respondent';
  userId: string;
  accepted: boolean;
}

export interface ComplaintAppealInput extends ComplaintActionInput {
  requestedBy: string;
  reason: string;
  reviewerId: string;
}

export interface ComplaintCreateInput {
  complainantId: string;
  orderId?: string;
  respondentId?: string;
  regionId?: string;
  subject: string;
  description: string;
  category?: Complaint['category'];
  evidence?: string[];
}
