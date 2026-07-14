import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  AuthChallenge,
  Credentials,
  PasswordResetInput,
  RegistrationDraft,
  Session,
  User,
} from '../models';
import { maskDestination } from './auth-identifier.utils';
import { ApiTokenStore } from './api-token-store';
import { toUser } from './http-mappers';
import { mapHttpError, mapNotFoundToUndefined, notSupported } from './http-repository.utils';
import { createEntityId, nowIso } from './local-repository.utils';
import { AuthRepository } from './repositories';

const CHALLENGE_DURATION_MS = 5 * 60 * 1000; // matches antgo-backend's OTP_TTL_MS

/**
 * antgo-backend supports phone+OTP (beginRegistration/verifyRegistration,
 * mapped onto POST /api/auth/otp/request + /otp/verify) and phone+password
 * (login, mapped onto POST /api/auth/login) — see CLAUDE.md "Backend".
 * There is still no Google login or password-reset endpoint.
 */
@Injectable()
export class HttpAuthRepository extends AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly tokenStore = inject(ApiTokenStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly pendingDrafts = new Map<string, RegistrationDraft>();

  login(credentials: Credentials): Observable<Session> {
    return this.http
      .post<{ token: string; user: Record<string, unknown> }>(`${this.baseUrl}/login`, {
        identifier: credentials.identifier,
        password: credentials.password,
      })
      .pipe(
        map(({ token, user }) => {
          this.tokenStore.set(token);
          const mapped = toUser(user);
          return { userId: mapped.id, user: mapped, authenticatedAt: nowIso() } satisfies Session;
        }),
        mapHttpError(),
      );
  }

  loginWithGoogle(): Observable<Session> {
    return notSupported('Đăng nhập Google chưa được antgo-backend hỗ trợ.');
  }

  beginRegistration(draft: RegistrationDraft): Observable<AuthChallenge> {
    return this.http.post<{ sent: boolean }>(`${this.baseUrl}/otp/request`, { phone: draft.phone }).pipe(
      map(() => {
        const challenge: AuthChallenge = {
          id: createEntityId('challenge'),
          kind: 'registration',
          maskedDestination: maskDestination(draft.phone),
          expiresAt: new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString(),
        };
        this.pendingDrafts.set(challenge.id, draft);
        return challenge;
      }),
      mapHttpError(),
    );
  }

  verifyRegistration(challengeId: string, otp: string): Observable<Session> {
    const draft = this.pendingDrafts.get(challengeId);
    if (!draft) {
      return notSupported('Mã xác thực không còn hiệu lực.');
    }
    return this.http
      .post<{ token: string; user: Record<string, unknown> }>(`${this.baseUrl}/otp/verify`, {
        phone: draft.phone,
        code: otp,
        displayName: draft.displayName,
        building: draft.location.building,
        regionId: draft.location.regionId,
      })
      .pipe(
        map(({ token, user }) => {
          this.tokenStore.set(token);
          this.pendingDrafts.delete(challengeId);
          const mapped = toUser(user);
          return { userId: mapped.id, user: mapped, authenticatedAt: nowIso() } satisfies Session;
        }),
        mapHttpError(),
      );
  }

  requestPasswordReset(_identifier: string): Observable<AuthChallenge> {
    return notSupported('Đặt lại mật khẩu chưa được antgo-backend hỗ trợ.');
  }

  resetPassword(_input: PasswordResetInput): Observable<void> {
    return notSupported('Đặt lại mật khẩu chưa được antgo-backend hỗ trợ.');
  }

  getUser(userId: string): Observable<User | undefined> {
    return this.http.get<Record<string, unknown>>(`${environment.apiBaseUrl}/users/${userId}`).pipe(
      map((raw) => toUser(raw)),
      mapNotFoundToUndefined(),
    );
  }
}
