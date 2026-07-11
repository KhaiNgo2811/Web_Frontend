import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { provideAntgoCore } from './core-data.providers';
import {
  AdminUserRepository,
  AuditRepository,
  ConfigRepository,
  InboxRepository,
  ModerationRepository,
} from './repositories';

describe('trust and support repositories', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideAntgoCore()] });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('denies a support agent a direct content-moderation action', async () => {
    const moderation = TestBed.inject(ModerationRepository);
    await expect(
      firstValueFrom(
        moderation.act({
          adminId: 'admin-support',
          reportId: 'report-post-delivery',
          action: 'hide',
          note: 'Không phù hợp.',
        }),
      ),
    ).rejects.toThrow('Bạn không có quyền thực hiện thao tác này.');
  });

  it('enforces staff permissions on direct sensitive reads', async () => {
    const users = TestBed.inject(AdminUserRepository);
    const config = TestBed.inject(ConfigRepository);
    await expect(firstValueFrom(users.list('user-demo'))).rejects.toThrow(
      'Bạn không có quyền thực hiện thao tác này.',
    );
    await expect(firstValueFrom(config.getBusinessConfig('admin-support'))).rejects.toThrow(
      'Bạn không có quyền thực hiện thao tác này.',
    );
  });

  it('appends an immutable audit event for account restrictions', async () => {
    const users = TestBed.inject(AdminUserRepository);
    const audit = TestBed.inject(AuditRepository);
    await firstValueFrom(
      users.setStatus({
        adminId: 'admin-seed',
        userId: 'user-huy',
        status: 'locked',
        reason: 'Xác minh an toàn.',
      }),
    );
    const events = await firstValueFrom(audit.list('admin-seed', { targetType: 'user' }));
    expect(events[0]).toMatchObject({
      actorId: 'admin-seed',
      action: 'user.locked',
      targetId: 'user-huy',
      reason: 'Xác minh an toàn.',
    });
  });

  it('orders the unified inbox and audits a bulk assignment', async () => {
    const inbox = TestBed.inject(InboxRepository);
    const audit = TestBed.inject(AuditRepository);
    const initial = await firstValueFrom(inbox.list('admin-seed', { savedView: 'all_open' }));
    expect(initial.map((item) => item.source)).toContain('moderation');
    expect(initial.map((item) => item.source)).toContain('complaint');

    await firstValueFrom(
      inbox.assign({
        actorId: 'admin-seed',
        items: initial.filter((item) => item.source === 'moderation').slice(0, 1),
        assigneeId: 'admin-moderator',
        handoffNote: 'Ưu tiên kiểm tra bằng chứng.',
      }),
    );
    const events = await firstValueFrom(audit.list('admin-seed', { action: 'inbox.assign' }));
    expect(events[0]?.reason).toBe('Ưu tiên kiểm tra bằng chứng.');
  });
});
