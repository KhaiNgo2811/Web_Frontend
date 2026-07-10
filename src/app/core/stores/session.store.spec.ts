import { TestBed } from '@angular/core/testing';

import { provideAntgoCore } from '../data';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideAntgoCore()] });
    store = TestBed.inject(SessionStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('logs in with seeded credentials and persists only when remembered', () => {
    expect(store.login('0901234567', 'wrong')).toBe(false);
    expect(store.isAuthenticated()).toBe(false);

    expect(store.login('0901234567', 'AntGo123!', true)).toBe(true);
    expect(store.currentUser()?.id).toBe('user-demo');
    expect(localStorage.getItem('antgo.session')).not.toBeNull();

    store.logout();
    expect(localStorage.getItem('antgo.session')).toBeNull();
  });

  it('registers through the deterministic demo OTP', () => {
    store.register({
      displayName: 'Người dùng mới',
      phone: '0911111111',
      email: 'new@antgo.vn',
      password: 'AntGo123!',
    });

    expect(store.verifyOtp('123456')).toBe(false);
    expect(store.verifyOtp('000000')).toBe(true);
    expect(store.currentUser()?.phone).toBe('0911111111');
  });
});

