import { Injectable } from '@angular/core';

const STORAGE_KEY = 'antgo.api-token';

/**
 * Holds the JWT issued by antgo-backend, independent of MockDb's own session
 * storage (`antgo.session`, used by LocalAuthRepository/SessionStore) — the
 * two coexist because SessionStore keeps tracking `currentUser` the same way
 * regardless of which repository family is active.
 */
@Injectable({ providedIn: 'root' })
export class ApiTokenStore {
  get(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  set(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
