import type { IsoDateString } from './common';

export type TokenTransactionStatus = 'success' | 'pending' | 'failed';
export type TokenTransactionDisplayType =
  'nap_xu' | 'day_bai' | 'goi_ho_so' | 'hoan_xu' | 'check_in' | 'task_reward' | 'token_purchase';

export interface AdminTokenTransaction {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  type: TokenTransactionDisplayType;
  typeLabel: string;
  tokenAmount: number;
  direction: 'in' | 'out';
  moneyAmount: number | null;
  status: TokenTransactionStatus;
  statusLabel: string;
  createdAt: IsoDateString;
  timeLabel: string;
}

export interface AdminTokenTransactionFilter {
  search: string;
  type: TokenTransactionDisplayType | 'all';
  status: TokenTransactionStatus | 'all';
  timeRange: '7d' | '30d' | '90d' | 'all';
}

export type AdminTokenTransactionSort = 'newest' | 'oldest' | 'amount';
