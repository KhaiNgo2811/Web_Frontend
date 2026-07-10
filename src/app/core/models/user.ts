import type { IsoDateString } from './common';

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'locked';

export interface UserLocation {
  building: string;
  room?: string;
  regionId: string;
  label?: string;
}

export interface UserSocialLinks {
  facebook?: string;
  zalo?: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  location: UserLocation;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  social?: UserSocialLinks;
  reputationScore: number | null;
  completedCount: number;
  completionRate: number;
  reviewParticipationRate: number;
  tokenBalance: number;
  createdAt: IsoDateString;
}

export type UpdateUserInput = Partial<
  Pick<User, 'displayName' | 'avatarUrl' | 'location' | 'social'>
>;

