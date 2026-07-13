import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AuthChallenge,
  Credentials,
  PasswordResetInput,
  RegistrationDraft,
  Session,
  User,
} from '../models';
import { maskDestination, normalizeIdentifier } from './auth-identifier.utils';
import { AuthRepository } from './repositories';
import { MockDb } from './mock-db';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';

const CHALLENGE_DURATION_MS = 10 * 60 * 1000;

@Injectable()
export class LocalAuthRepository extends AuthRepository {
  private readonly db = inject(MockDb);

  login(credentials: Credentials): Observable<Session> {
    return asObservable(() => {
      const identifier = normalizeIdentifier(credentials.identifier);
      const data = this.db.snapshot();
      const account = data.authAccounts.find(
        (candidate) =>
          candidate.provider === 'password' &&
          candidate.identifiers.some((value) => normalizeIdentifier(value) === identifier) &&
          candidate.password === credentials.password,
      );
      if (!account) {
        throw new RepositoryError('Thông tin đăng nhập không chính xác.');
      }

      const user = requireValue(
        data.users.find((candidate) => candidate.id === account.userId),
        'Không tìm thấy tài khoản.',
      );
      if (user.status === 'locked') {
        throw new RepositoryError('Tài khoản đã bị khóa.');
      }

      return this.createSession(user);
    });
  }

  loginWithGoogle(): Observable<Session> {
    return asObservable(() => {
      const data = this.db.snapshot();
      const account = requireValue(
        data.authAccounts.find((candidate) => candidate.provider === 'google'),
        'Không có tài khoản Google mẫu.',
      );
      const user = requireValue(
        data.users.find((candidate) => candidate.id === account.userId),
        'Không tìm thấy tài khoản.',
      );
      return this.createSession(user);
    });
  }

  beginRegistration(draft: RegistrationDraft): Observable<AuthChallenge> {
    return asObservable(() => {
      const identifiers = [draft.phone, draft.email].filter((value): value is string =>
        Boolean(value),
      );
      const normalized = identifiers.map(normalizeIdentifier);
      const existing = this.db
        .snapshot()
        .authAccounts.some((account) =>
          account.identifiers.some((value) => normalized.includes(normalizeIdentifier(value))),
        );
      if (existing) {
        throw new RepositoryError('Số điện thoại hoặc email đã được sử dụng.');
      }

      const challenge: AuthChallenge = {
        id: createEntityId('challenge'),
        kind: 'registration',
        maskedDestination: maskDestination(draft.phone),
        expiresAt: new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString(),
      };
      this.db.transaction((data) => {
        data.authChallenges.push({ ...challenge, registration: draft });
      });
      return challenge;
    });
  }

  verifyRegistration(challengeId: string, otp: string): Observable<Session> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const challenge = requireValue(
          data.authChallenges.find((candidate) => candidate.id === challengeId),
          'Mã xác thực không còn hiệu lực.',
        );
        if (challenge.kind !== 'registration' || otp !== '123456') {
          throw new RepositoryError('Mã OTP không chính xác.');
        }
        if (Date.parse(challenge.expiresAt) < Date.now()) {
          throw new RepositoryError('Mã OTP đã hết hạn.');
        }

        const draft = requireValue(challenge.registration, 'Thiếu thông tin đăng ký.');
        const user: User = {
          id: createEntityId('user'),
          phone: draft.phone,
          email: draft.email,
          displayName: draft.displayName,
          location: draft.location,
          role: 'user',
          status: 'active',
          isVerified: false,
          reputationScore: null,
          completedCount: 0,
          completionRate: 1,
          reviewParticipationRate: 0,
          tokenBalance: 20,
          createdAt: nowIso(),
        };
        data.users.push(user);
        data.authAccounts.push({
          id: createEntityId('auth'),
          userId: user.id,
          identifiers: [draft.phone, draft.email].filter((value): value is string =>
            Boolean(value),
          ),
          password: draft.password,
          provider: 'password',
        });
        data.authChallenges = data.authChallenges.filter((item) => item.id !== challenge.id);
        return this.createSession(user);
      }),
    );
  }

  requestPasswordReset(identifier: string): Observable<AuthChallenge> {
    return asObservable(() => {
      const normalized = normalizeIdentifier(identifier);
      const account = requireValue(
        this.db
          .snapshot()
          .authAccounts.find(
            (item) =>
              item.provider === 'password' &&
              item.identifiers.some((value) => normalizeIdentifier(value) === normalized),
          ),
        'Không tìm thấy tài khoản.',
      );
      const challenge: AuthChallenge = {
        id: createEntityId('challenge'),
        kind: 'password-reset',
        maskedDestination: maskDestination(identifier),
        expiresAt: new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString(),
      };
      this.db.transaction((data) => {
        data.authChallenges.push({ ...challenge, identifier, userId: account.userId });
      });
      return challenge;
    });
  }

  resetPassword(input: PasswordResetInput): Observable<void> {
    return asObservable(() => {
      this.db.transaction((data) => {
        const challenge = requireValue(
          data.authChallenges.find((item) => item.id === input.challengeId),
          'Yêu cầu đặt lại mật khẩu không hợp lệ.',
        );
        const account = requireValue(
          data.authAccounts.find((item) => item.userId === challenge.userId),
          'Không tìm thấy tài khoản.',
        );
        account.password = input.newPassword;
        data.authChallenges = data.authChallenges.filter((item) => item.id !== challenge.id);
      });
    });
  }

  getUser(userId: string): Observable<User | undefined> {
    return asObservable(() => this.db.snapshot().users.find((user) => user.id === userId));
  }

  private createSession(user: User): Session {
    return { userId: user.id, user, authenticatedAt: nowIso() };
  }
}
