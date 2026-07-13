import { TestBed } from '@angular/core/testing';

import { provideAntgoCore } from '../data';
import { AuthRepository } from '../data/repositories';
import { LocalAuthRepository } from '../data/local-auth-repository';
import { SessionStore } from './session.store';

/** LocalAuthRepository's Observables emit synchronously, so subscribing here resolves in the same tick. */
function resultOf<T>(source: { subscribe: (observer: { next?: (v: T) => void; error?: (e: unknown) => void }) => void }): boolean {
  let succeeded = false;
  source.subscribe({ next: () => (succeeded = true), error: () => (succeeded = false) });
  return succeeded;
}

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    // Exercises LocalAuthRepository (password/Google login) directly,
    // regardless of environment.useHttpApi (which picks Http* by default —
    // HttpAuthRepository is OTP-only and has no password/Google login).
    TestBed.configureTestingModule({
      providers: [provideAntgoCore(), { provide: AuthRepository, useClass: LocalAuthRepository }],
    });
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('logs in with seeded credentials and persists only when remembered', () => {
    expect(resultOf(store.login('0901234567', 'wrong'))).toBe(false);
    expect(store.isAuthenticated()).toBe(false);

    expect(resultOf(store.login('0901234567', 'AntGo123!', true))).toBe(true);
    expect(store.currentUser()?.id).toBe('user-demo');
    expect(localStorage.getItem('antgo.session')).not.toBeNull();

    store.logout();
    expect(localStorage.getItem('antgo.session')).toBeNull();
  });

  it('logs in with the seeded admin account', () => {
    expect(resultOf(store.login('admin@antgo.vn', 'AntGoAdmin123!', true))).toBe(true);
    expect(store.currentUser()?.role).toBe('super_admin');
  });

  it('registers through the deterministic demo OTP', () => {
    resultOf(
      store.register({
        displayName: 'Người dùng mới',
        phone: '0911111111',
        email: 'new@antgo.vn',
        password: 'AntGo123!',
      }),
    );

    expect(resultOf(store.verifyOtp('123456'))).toBe(false);
    expect(resultOf(store.verifyOtp('000000'))).toBe(true);
    expect(store.currentUser()?.phone).toBe('0911111111');
  });
});
