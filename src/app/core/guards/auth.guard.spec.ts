import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import { SessionStore } from '../stores/session.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const authenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SessionStore, useValue: { isAuthenticated: authenticated } }],
    });
    authenticated.set(false);
  });

  it('preserves the protected return URL for guests', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/orders' } as RouterStateSnapshot),
    );
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: '/orders' },
    }));
  });

  it('allows an authenticated session', () => {
    authenticated.set(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/orders' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });
});
