import type { IsoDateString, ServiceCategory } from './common';

export type PostType = 'request' | 'service';
export type PostStatus = 'open' | 'connected' | 'closed' | 'expired';
export type PostUrgency = 'normal' | 'urgent';
export type PostSort = 'newest' | 'price-asc' | 'price-desc' | 'popular';

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  expectedTime?: string;
  images: string[];
  status: PostStatus;
  urgency: PostUrgency;
  likedBy: string[];
  isPriority: boolean;
  priorityUntil?: IsoDateString;
  regionId: string;
  expiresAt: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreatePostInput {
  type: PostType;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  expectedTime?: string;
  images?: string[];
  urgency?: PostUrgency;
}

export type UpdatePostInput = Partial<Omit<CreatePostInput, 'type'>>;

export interface PostFilter {
  search?: string;
  type?: PostType;
  category?: ServiceCategory;
  urgency?: PostUrgency;
  regionId?: string;
  status?: PostStatus;
  sort?: PostSort;
}

