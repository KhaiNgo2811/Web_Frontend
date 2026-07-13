import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { hasAdminPermission, isAdminRole, type AdminPermission } from '../models';
import { SessionStore } from '../stores/session.store';

export const adminGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const user = session.currentUser();

  if (!user) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const permission = route.data?.['permission'] as AdminPermission | undefined;
  if (!isAdminRole(user.role) || (permission && !hasAdminPermission(user.role, permission))) {
    return router.createUrlTree(['/feed']);
  }

  return true;
};
