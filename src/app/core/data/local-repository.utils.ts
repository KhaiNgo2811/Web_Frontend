import { defer, Observable, of } from 'rxjs';

let idSequence = 0;

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export function asObservable<T>(factory: () => T): Observable<T> {
  return defer(() => of(factory()));
}

export function createEntityId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new RepositoryError(message);
  }

  return value;
}
