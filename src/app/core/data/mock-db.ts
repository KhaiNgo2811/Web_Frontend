import { Injectable, signal } from '@angular/core';

import type { Session } from '../models';
import { DEMO_DATABASE, type MockDatabaseData } from '../mock';

interface StoredDatabase {
  schemaVersion: number;
  data: MockDatabaseData;
}

const DATABASE_KEY = 'antgo.mock-db';
const SESSION_KEY = 'antgo.session';
const SCHEMA_VERSION = 6;
const COLLECTION_KEYS: (keyof MockDatabaseData)[] = [
  'users',
  'authAccounts',
  'authChallenges',
  'posts',
  'applications',
  'orders',
  'reviews',
  'conversations',
  'messages',
  'notifications',
  'regions',
  'serviceCategories',
  'moderationReports',
  'complaints',
  'adminAccountActivities',
  'auditEvents',
  'exportJobs',
  'walletTransactions',
  'walletRewardClaims',
  'walletBoosts',
  'walletSubscriptions',
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredDatabase(value: unknown): value is StoredDatabase {
  if (!isRecord(value) || value['schemaVersion'] !== SCHEMA_VERSION || !isRecord(value['data'])) {
    return false;
  }
  const data = value['data'];
  return (
    COLLECTION_KEYS.every((key) => Array.isArray(data[key])) && isRecord(data['businessConfig'])
  );
}

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value['userId'] === 'string' &&
    typeof value['authenticatedAt'] === 'string' &&
    isRecord(value['user']) &&
    value['user']['id'] === value['userId']
  );
}

@Injectable({ providedIn: 'root' })
export class MockDb {
  private memory = this.freshDatabase();
  private readonly revisionState = signal(0);

  readonly revision = this.revisionState.asReadonly();

  snapshot(): MockDatabaseData {
    return clone(this.load().data);
  }

  transaction<T>(mutator: (data: MockDatabaseData) => T): T {
    const database = this.load();
    const draft = clone(database.data);
    const result = mutator(draft);

    this.persist({ schemaVersion: SCHEMA_VERSION, data: draft });
    this.revisionState.update((revision) => revision + 1);
    return clone(result);
  }

  reset(): void {
    this.persist(this.freshDatabase());
    this.clearSession();
    this.revisionState.update((revision) => revision + 1);
  }

  readSession(): Session | null {
    const raw = this.readStorage(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isSession(parsed) ? clone(parsed) : null;
    } catch {
      this.removeStorage(SESSION_KEY);
      return null;
    }
  }

  writeSession(session: Session): void {
    this.writeStorage(SESSION_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    this.removeStorage(SESSION_KEY);
  }

  private load(): StoredDatabase {
    const raw = this.readStorage(DATABASE_KEY);
    if (!raw) {
      this.persist(this.memory);
      return clone(this.memory);
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredDatabase(parsed)) {
        this.memory = clone(parsed);
        return clone(parsed);
      }
    } catch {
      // Malformed demo storage is replaced by a clean deterministic seed.
    }

    const fresh = this.freshDatabase();
    this.persist(fresh);
    return clone(fresh);
  }

  private freshDatabase(): StoredDatabase {
    return { schemaVersion: SCHEMA_VERSION, data: clone(DEMO_DATABASE) };
  }

  private persist(database: StoredDatabase): void {
    this.memory = clone(database);
    this.writeStorage(DATABASE_KEY, JSON.stringify(database));
  }

  private readStorage(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return key === DATABASE_KEY ? JSON.stringify(this.memory) : null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // The in-memory database remains usable when storage is unavailable.
    }
  }

  private removeStorage(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Ignore unavailable storage; there is no persisted session to clear.
    }
  }
}
