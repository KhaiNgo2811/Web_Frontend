import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

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

  login(identifier: string, password: string, remember = false): boolean {
    return this.run(this.auth.login({ identifier, password }), (session) => {
      this.acceptSession(session, remember);
    });
  }

  googleLogin(): void {
    this.run(this.auth.loginWithGoogle(), (session) => this.acceptSession(session, true));
  }

  register(input: RegisterInput): void {
    const draft: RegistrationDraft = {
      ...input,
      location: input.location ?? DEFAULT_LOCATION,
    };
    this.run(this.auth.beginRegistration(draft), (challenge) => {
      this.pendingChallengeState.set(challenge);
    });
  }

  verifyOtp(code: string): boolean {
    const challenge = this.pendingChallengeState();
    if (!challenge) {
      this.errorState.set('Không có yêu cầu xác thực đang chờ.');
      return false;
    }

    return this.run(this.auth.verifyRegistration(challenge.id, code), (session) => {
      this.pendingChallengeState.set(null);
      this.acceptSession(session, true);
    });
  }

  resetPassword(identifier: string, password: string): void {
    this.run(this.auth.requestPasswordReset(identifier), (challenge) => {
      this.run(
        this.auth.resetPassword({ challengeId: challenge.id, newPassword: password }),
        () => undefined,
      );
    });
  }

  refreshUser(): void {
    const userId = this.currentUserState()?.id;
    if (!userId) return;
    this.run(this.auth.getUser(userId), (user) => {
      if (user) this.currentUserState.set(user);
    });
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

  private run<T>(source: Observable<T>, next: (value: T) => void): boolean {
    let succeeded = false;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next: (value) => {
        next(value);
        succeeded = true;
      },
      error: (error: unknown) => {
        this.errorState.set(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
        this.loadingState.set(false);
      },
      complete: () => this.loadingState.set(false),
    });
    return succeeded;
  }
}

