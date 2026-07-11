export type AdminOperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AdminOperationState {
  status: AdminOperationStatus;
  message?: string;
}

export interface AdminPaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export type AdminSortDirection = 'asc' | 'desc' | null;

export interface AdminSortState<T extends string = string> {
  key: T;
  direction: Exclude<AdminSortDirection, null>;
}

export interface AdminConfirmationRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

export interface AdminToastMessage {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export interface AdminStaffOption {
  id: string;
  displayName: string;
  roleLabel?: string;
  disabled?: boolean;
}

export interface AdminSegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}
