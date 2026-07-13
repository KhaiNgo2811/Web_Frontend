import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';

import type { User } from '../models';
import { SessionStore } from '../stores/session.store';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const currentUser = signal<User | null>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SessionStore, useValue: { currentUser } }],
    });
    currentUser.set(null);
  });

  it('sends guests to login with returnUrl', () => {
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin/users' } as RouterStateSnapshot),
    );
    expect(result).toEqual(
      TestBed.inject(Router).createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: '/admin/users' },
      }),
    );
  });

  it('sends non-admin users back to the feed', () => {
    currentUser.set({ id: 'user-demo', role: 'user', status: 'active' } as User);
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/feed']));
  });

  it('allows active admin sessions', () => {
    currentUser.set({ id: 'admin-seed', role: 'super_admin', status: 'active' } as User);
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });
});
