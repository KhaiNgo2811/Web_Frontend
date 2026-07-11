export type IsoDateString = string;

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ServiceCategory = 'food' | 'laundry' | 'goods' | 'repair' | 'support' | 'other';

export type SortDirection = 'asc' | 'desc';

export interface Entity {
  id: string;
}
