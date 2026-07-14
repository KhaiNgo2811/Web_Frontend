import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';

import { ApiTokenStore } from './api-token-store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(ApiTokenStore).get();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
