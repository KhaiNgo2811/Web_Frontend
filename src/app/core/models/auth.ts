import type { IsoDateString } from './common';
import type { User, UserLocation } from './user';

export interface Credentials {
  identifier: string;
  password: string;
}

export interface RegistrationDraft {
  displayName: string;
  phone: string;
  email?: string;
  password: string;
  location: UserLocation;
}

export interface Session {
  userId: string;
  user: User;
  authenticatedAt: IsoDateString;
}

export type AuthChallengeKind = 'registration' | 'password-reset';

export interface AuthChallenge {
  id: string;
  kind: AuthChallengeKind;
  maskedDestination: string;
  expiresAt: IsoDateString;
}

export interface PasswordResetInput {
  challengeId: string;
  newPassword: string;
}

export interface AuthAccount {
  id: string;
  userId: string;
  identifiers: string[];
  password: string;
  provider: 'password' | 'google';
}

export interface StoredAuthChallenge extends AuthChallenge {
  identifier?: string;
  userId?: string;
  registration?: RegistrationDraft;
}

