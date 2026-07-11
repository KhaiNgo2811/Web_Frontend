import type { IsoDateString } from './common';

export type ApplicationStatus = 'pending' | 'selected' | 'withdrawn' | 'rejected';
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type EscrowState = 'none' | 'held' | 'released' | 'disputed';
export type OrderAction = 'start' | 'report_done' | 'confirm_complete' | 'cancel';

export interface Application {
  id: string;
  postId: string;
  applicantId: string;
  message: string;
  proposedPrice?: number;
  status: ApplicationStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateApplicationInput {
  postId: string;
  message: string;
  proposedPrice?: number;
}

export interface StatusEntry {
  status: OrderStatus;
  at: IsoDateString;
  byUserId: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  postId: string;
  applicationId: string;
  customerId: string;
  providerId: string;
  status: OrderStatus;
  statusHistory: StatusEntry[];
  cancelReason?: string;
  providerReportedDoneAt?: IsoDateString;
  customerConfirmedAt?: IsoDateString;
  autoCompleteDeadline?: IsoDateString;
  escrowState: EscrowState;
  escrowFeePct?: number;
  heldAmount?: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface OrderTransitionInput {
  orderId: string;
  actorId: string;
  action: OrderAction;
  reason?: string;
}

export interface Review {
  id: string;
  orderId: string;
  raterId: string;
  rateeId: string;
  stars: number;
  comment?: string;
  hidden: boolean;
  createdAt: IsoDateString;
}

export interface CreateReviewInput {
  orderId: string;
  actorId: string;
  stars: number;
  comment?: string;
}

export interface ApplicationSelection {
  application: Application;
  order: Order;
}
