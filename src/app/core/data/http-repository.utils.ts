import { HttpErrorResponse } from '@angular/common/http';
import { Observable, OperatorFunction, catchError, of, throwError } from 'rxjs';

import { RepositoryError } from './local-repository.utils';

interface BackendErrorBody {
  error?: { code?: string; message?: string };
}

/** Unwraps antgo-backend's `{ error: { code, message } }` envelope into the same RepositoryError SessionStore/stores already know how to display. */
export function mapHttpError<T>(): OperatorFunction<T, T> {
  return catchError((err: unknown) => {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as BackendErrorBody | undefined;
      return throwError(() => new RepositoryError(body?.error?.message ?? 'Đã có lỗi xảy ra ở máy chủ.'));
    }
    return throwError(() => err);
  });
}

/** For getById-style lookups: a 404 becomes `undefined`, anything else still maps through mapHttpError. */
export function mapNotFoundToUndefined<T>(): OperatorFunction<T, T | undefined> {
  return catchError((err: unknown) => {
    if (err instanceof HttpErrorResponse && err.status === 404) return of(undefined);
    return mapHttpError<T | undefined>()(throwError(() => err));
  });
}

/** For repository methods antgo-backend genuinely has no endpoint for yet. */
export function notSupported<T>(message: string): Observable<T> {
  return throwError(() => new RepositoryError(message));
}
