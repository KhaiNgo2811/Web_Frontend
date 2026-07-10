import { MockDb } from './mock-db';

describe('MockDb', () => {
  beforeEach(() => localStorage.clear());

  it('seeds deterministic demo data and persists transactions', () => {
    const first = new MockDb();
    expect(first.snapshot().users[0]?.id).toBe('user-demo');

    first.transaction((data) => {
      const user = data.users.find((candidate) => candidate.id === 'user-demo');
      if (user) user.tokenBalance = 999;
    });

    expect(new MockDb().snapshot().users[0]?.tokenBalance).toBe(999);
  });

  it('recovers malformed and version-mismatched storage', () => {
    localStorage.setItem('antgo.mock-db', '{broken');
    expect(new MockDb().snapshot().posts.length).toBeGreaterThan(0);

    localStorage.setItem('antgo.mock-db', JSON.stringify({ schemaVersion: 99, data: {} }));
    expect(new MockDb().snapshot().users[0]?.id).toBe('user-demo');
  });
});

