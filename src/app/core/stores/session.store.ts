import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, switchMap, tap, throwError } from 'rxjs';

import type { AuthChallenge, RegistrationDraft, Session, User, UserLocation } from '../models';
import { AuthRepository, MockDb } from '../data';

export type RegisterInput = Omit<RegistrationDraft, 'location'> & {
  location?: UserLocation;
};

const DEFAULT_LOCATION: UserLocation = {
  building: 'Vinhomes Grand Park',
  regionId: 'hcm-east',
  label: 'TP. Hồ Chí Minh',
};

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AuthRepository);
  private readonly db = inject(MockDb);
  private readonly currentUserState = signal<User | null>(null);
  private readonly pendingChallengeState = signal<AuthChallenge | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly pendingChallenge = this.pendingChallengeState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserState() !== null);

  constructor() {
    const restored = this.db.readSession();
    this.currentUserState.set(restored?.user ?? null);
  }

  login(identifier: string, password: string, remember = false): Observable<Session> {
    return this.run(this.auth.login({ identifier, password }), (session) => {
      this.acceptSession(session, remember);
    });
  }

  googleLogin(): Observable<Session> {
    return this.run(this.auth.loginWithGoogle(), (session) => this.acceptSession(session, true));
  }

  register(input: RegisterInput): Observable<AuthChallenge> {
    const draft: RegistrationDraft = {
      ...input,
      location: input.location ?? DEFAULT_LOCATION,
    };
    return this.run(this.auth.beginRegistration(draft), (challenge) => {
      this.pendingChallengeState.set(challenge);
    });
  }

  verifyOtp(code: string): Observable<Session> {
    const challenge = this.pendingChallengeState();
    if (!challenge) {
      this.errorState.set('Không có yêu cầu xác thực đang chờ.');
      return throwError(() => new Error('Không có yêu cầu xác thực đang chờ.'));
    }

    return this.run(this.auth.verifyRegistration(challenge.id, code), (session) => {
      this.pendingChallengeState.set(null);
      this.acceptSession(session, true);
    });
  }

  resetPassword(identifier: string, password: string): Observable<void> {
    return this.run(this.auth.requestPasswordReset(identifier), () => undefined).pipe(
      switchMap((challenge) =>
        this.run(
          this.auth.resetPassword({ challengeId: challenge.id, newPassword: password }),
          () => undefined,
        ),
      ),
    );
  }

  refreshUser(): void {
    const userId = this.currentUserState()?.id;
    if (!userId) return;
    this.run(this.auth.getUser(userId), (user) => {
      if (user) this.currentUserState.set(user);
    }).subscribe({ error: () => undefined });
  }

  logout(): void {
    this.currentUserState.set(null);
    this.pendingChallengeState.set(null);
    this.errorState.set(null);
    this.db.clearSession();
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private acceptSession(session: Session, remember: boolean): void {
    this.currentUserState.set(session.user);
    if (remember) this.db.writeSession(session);
    else this.db.clearSession();
  }

  private run<T>(source: Observable<T>, next: (value: T) => void): Observable<T> {
    this.loadingState.set(true);
    this.errorState.set(null);
    return source.pipe(
      tap((value) => next(value)),
      catchError((error: unknown) => {
        this.errorState.set(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
        return throwError(() => error);
      }),
      finalize(() => this.loadingState.set(false)),
    );
  }
}
