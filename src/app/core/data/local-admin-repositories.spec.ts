import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  AdminUserRepository,
  ComplaintRepository,
  ConversationRepository,
  ModerationRepository,
  OrderRepository,
  PostRepository,
} from './repositories';
import { provideAntgoCore } from './core-data.providers';
import { MockDb } from './mock-db';

describe('local admin repositories', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideAntgoCore()] });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('seeds an admin login and prevents self-locking', async () => {
    const users = TestBed.inject(AdminUserRepository);
    const admins = await firstValueFrom(users.list('admin-seed', { role: 'super_admin' }));
    expect(admins[0]?.email).toBe('admin@antgo.vn');

    await expect(
      firstValueFrom(
        users.setStatus({
          adminId: 'admin-seed',
          userId: 'admin-seed',
          status: 'locked',
          reason: 'self test',
        }),
      ),
    ).rejects.toThrow('Không thể khóa chính tài khoản quản trị đang đăng nhập.');
  });

  it('hides and restores moderated content from public queries', async () => {
    const moderation = TestBed.inject(ModerationRepository);
    const posts = TestBed.inject(PostRepository);
    const orders = TestBed.inject(OrderRepository);
    const conversations = TestBed.inject(ConversationRepository);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-post-delivery',
        action: 'hide',
        note: 'Ẩn nội dung spam.',
      }),
    );

    const visiblePosts = await firstValueFrom(posts.list({ search: 'giao đồ nhanh' }));
    expect(visiblePosts.some((post) => post.id === 'post-delivery')).toBe(false);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-post-delivery',
        action: 'restore',
      }),
    );
    const restoredPosts = await firstValueFrom(posts.list({ search: 'giao đồ nhanh' }));
    expect(restoredPosts.some((post) => post.id === 'post-delivery')).toBe(true);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-review-tutor',
        action: 'hide',
        note: 'Ẩn đánh giá trong lúc kiểm tra.',
      }),
    );
    const hiddenReviews = await firstValueFrom(orders.listReviews('user-demo'));
    expect(hiddenReviews.some((review) => review.id === 'review-tutor-lan')).toBe(false);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-review-tutor',
        action: 'restore',
      }),
    );
    const restoredReviews = await firstValueFrom(orders.listReviews('user-demo'));
    expect(restoredReviews.some((review) => review.id === 'review-tutor-lan')).toBe(true);

    const hiddenMessages = await firstValueFrom(
      conversations.listMessages('conversation-plants', 'user-demo'),
    );
    expect(hiddenMessages.some((message) => message.id === 'message-plants-2')).toBe(false);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-message-plants',
        action: 'restore',
      }),
    );
    const restoredMessages = await firstValueFrom(
      conversations.listMessages('conversation-plants', 'user-demo'),
    );
    expect(restoredMessages.some((message) => message.id === 'message-plants-2')).toBe(true);

    await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-message-plants',
        action: 'hide',
        note: 'Ẩn lại sau khi đối chiếu.',
      }),
    );
    const rehiddenMessages = await firstValueFrom(
      conversations.listMessages('conversation-plants', 'user-demo'),
    );
    expect(rehiddenMessages.some((message) => message.id === 'message-plants-2')).toBe(false);
  });

  it('requires moderation notes before hiding or dismissing reports', async () => {
    const moderation = TestBed.inject(ModerationRepository);

    await expect(
      firstValueFrom(
        moderation.act({ adminId: 'admin-seed', reportId: 'report-post-delivery', action: 'hide' }),
      ),
    ).rejects.toThrow('Cần nhập ghi chú xử lý trước khi ẩn hoặc bỏ qua báo cáo.');

    const hidden = await firstValueFrom(
      moderation.act({
        adminId: 'admin-seed',
        reportId: 'report-post-delivery',
        action: 'hide',
        note: 'Nội dung trùng lặp.',
      }),
    );
    expect(hidden).toMatchObject({ status: 'hidden', resolutionNote: 'Nội dung trùng lặp.' });
    expect(hidden.history?.at(-1)).toMatchObject({
      action: 'hide',
      adminId: 'admin-seed',
      note: 'Nội dung trùng lặp.',
      status: 'hidden',
    });
  });

  it('rejects skipped complaint stages and early close', async () => {
    const complaints = TestBed.inject(ComplaintRepository);
    const db = TestBed.inject(MockDb);

    await expect(
      firstValueFrom(
        complaints.recordAssessment({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          finding: 'none',
          rationale: 'skip',
          severity: 'none',
        }),
      ),
    ).rejects.toThrow('Khiếu nại chỉ được chuyển sang bước kế tiếp.');

    db.transaction((data) => {
      const complaint = data.complaints.find((candidate) => candidate.id === 'complaint-tutor');
      if (!complaint) throw new Error('Missing seeded complaint.');
      complaint.notification = undefined;
      complaint.partyResponses = undefined;
    });

    await expect(
      firstValueFrom(
        complaints.close({
          adminId: 'admin-seed',
          complaintId: 'complaint-tutor',
          remedyType: 'none',
        }),
      ),
    ).rejects.toThrow('Cần thông báo kết quả trước khi đóng khiếu nại.');
  });

  it('enforces required complaint action outputs across the policy workflow', async () => {
    const complaints = TestBed.inject(ComplaintRepository);
    const db = TestBed.inject(MockDb);

    db.transaction((data) => {
      const complaint = data.complaints.find((candidate) => candidate.id === 'complaint-plants');
      if (!complaint) throw new Error('Missing seeded complaint.');
      complaint.stage = 'received';
      complaint.assignedAdminId = undefined;
      complaint.sla = undefined;
      complaint.verification = undefined;
      complaint.assessment = undefined;
      complaint.remedy = undefined;
      complaint.notification = undefined;
      complaint.partyResponses = undefined;
      complaint.appeal = undefined;
      complaint.resolution = undefined;
      complaint.timeline = [];
    });

    const assigned = await firstValueFrom(
      complaints.assign({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        assignedAdminId: 'admin-reviewer',
      }),
    );
    expect(assigned).toMatchObject({
      stage: 'verifying',
      assignedAdminId: 'admin-reviewer',
    });
    expect(assigned.sla?.verificationDueAt).toBeTruthy();

    await expect(
      firstValueFrom(
        complaints.recordVerification({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          valid: true,
          summary: '   ',
        }),
      ),
    ).rejects.toThrow('Cần nhập kết quả xác minh.');

    await firstValueFrom(
      complaints.recordVerification({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        valid: true,
        summary: 'Đủ điều kiện xử lý.',
      }),
    );
    await firstValueFrom(
      complaints.requestEvidence({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
      }),
    );

    await expect(
      firstValueFrom(
        complaints.recordAssessment({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          finding: 'shared',
          rationale: '   ',
          severity: 'medium',
        }),
      ),
    ).rejects.toThrow('Cần nhập nhận định trách nhiệm.');

    await firstValueFrom(
      complaints.recordAssessment({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        finding: 'shared',
        rationale: 'Hai bên cùng cần bổ sung bằng chứng.',
        severity: 'medium',
      }),
    );

    await expect(
      firstValueFrom(
        complaints.decideResolution({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          remedyType: 'compensation',
          resolution: 'Bồi hoàn một phần.',
          amount: -1,
        }),
      ),
    ).rejects.toThrow('Số tiền bồi hoàn không được âm.');

    await firstValueFrom(
      complaints.decideResolution({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        remedyType: 'compensation',
        resolution: 'Bồi hoàn một phần.',
        amount: 50000,
      }),
    );

    await expect(
      firstValueFrom(
        complaints.notifyParties({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          channels: ['   '],
        }),
      ),
    ).rejects.toThrow('Cần chọn kênh thông báo.');

    await firstValueFrom(
      complaints.notifyParties({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        channels: ['in_app'],
      }),
    );

    const appealed = await firstValueFrom(
      complaints.appeal({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        requestedBy: 'user-demo',
        reason: 'Cần rà soát độc lập.',
        reviewerId: 'admin-reviewer',
      }),
    );
    expect(appealed).toMatchObject({
      stage: 'evaluating',
      appeal: { used: true, reviewerId: 'admin-reviewer' },
    });
  });

  it('blocks duplicate appeals and non-reviewer follow-up decisions', async () => {
    const complaints = TestBed.inject(ComplaintRepository);
    const db = TestBed.inject(MockDb);

    await expect(
      firstValueFrom(
        complaints.recordAssessment({
          adminId: 'admin-seed',
          complaintId: 'complaint-appealed',
          finding: 'shared',
          rationale: 'Người ra quyết định đầu không được tiếp tục phúc khảo.',
          severity: 'medium',
        }),
      ),
    ).rejects.toThrow('Chỉ người thụ lý phúc khảo mới được tiếp tục quyết định hồ sơ này.');

    db.transaction((data) => {
      const complaint = data.complaints.find((candidate) => candidate.id === 'complaint-appealed');
      if (!complaint) throw new Error('Missing seeded complaint.');
      complaint.stage = 'notified';
    });

    await expect(
      firstValueFrom(
        complaints.appeal({
          adminId: 'admin-reviewer',
          complaintId: 'complaint-appealed',
          requestedBy: 'user-demo',
          reason: 'Phúc khảo lần hai.',
          reviewerId: 'admin-reviewer',
        }),
      ),
    ).rejects.toThrow('Khiếu nại chỉ được phúc khảo một lần.');
  });

  it('resolves complaints only after decision, notification, and party acceptance', async () => {
    const complaints = TestBed.inject(ComplaintRepository);

    await firstValueFrom(
      complaints.requestEvidence({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        note: 'Đã yêu cầu bổ sung chứng cứ.',
      }),
    );
    await firstValueFrom(
      complaints.recordAssessment({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        finding: 'shared',
        rationale: 'Hai bên cùng cần xác nhận lịch.',
        severity: 'low',
      }),
    );
    const decided = await firstValueFrom(
      complaints.decideResolution({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        remedyType: 'none',
        resolution: 'Hai bên thống nhất lịch chăm cây mới.',
      }),
    );
    expect(decided).toMatchObject({ stage: 'resolving' });

    await expect(
      firstValueFrom(
        complaints.recordPartyResponse({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          party: 'respondent',
          userId: 'user-demo',
          accepted: true,
        }),
      ),
    ).rejects.toThrow('Chỉ ghi nhận phản hồi sau khi đã thông báo kết quả.');

    const notified = await firstValueFrom(
      complaints.notifyParties({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        channels: ['in_app'],
      }),
    );
    expect(notified.notification?.state).toBe('sent');

    await expect(
      firstValueFrom(
        complaints.close({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          remedyType: 'none',
        }),
      ),
    ).rejects.toThrow('Chỉ đóng khiếu nại sau khi các bên chấp nhận hoặc hết hạn phản hồi.');

    await expect(
      firstValueFrom(
        complaints.recordPartyResponse({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          party: 'respondent',
          userId: 'user-demo',
          accepted: true,
        }),
      ),
    ).rejects.toThrow('Người phản hồi không khớp bên bị khiếu nại.');

    await firstValueFrom(
      complaints.recordPartyResponse({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        party: 'complainant',
        userId: 'user-demo',
        accepted: true,
      }),
    );
    await firstValueFrom(
      complaints.recordPartyResponse({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        party: 'respondent',
        userId: 'user-minh',
        accepted: true,
      }),
    );

    await expect(
      firstValueFrom(
        complaints.close({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          remedyType: 'none',
        }),
      ),
    ).resolves.toMatchObject({ stage: 'resolved' });
  });

  it('allows timely appeal only with an independent reviewer', async () => {
    const complaints = TestBed.inject(ComplaintRepository);

    await firstValueFrom(
      complaints.requestEvidence({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
      }),
    );
    await firstValueFrom(
      complaints.recordAssessment({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        finding: 'shared',
        rationale: 'Cần xem lại trách nhiệm của hai bên.',
        severity: 'medium',
      }),
    );
    await firstValueFrom(
      complaints.decideResolution({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        remedyType: 'warning',
        resolution: 'Cảnh báo và yêu cầu xác nhận lại lịch.',
        sanctionLevel: 1,
      }),
    );
    await firstValueFrom(
      complaints.notifyParties({
        adminId: 'admin-seed',
        complaintId: 'complaint-plants',
        channels: ['in_app'],
      }),
    );

    await expect(
      firstValueFrom(
        complaints.appeal({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          requestedBy: 'user-demo',
          reason: 'Cần kiểm tra lại ảnh chứng cứ.',
          reviewerId: 'admin-seed',
        }),
      ),
    ).rejects.toThrow('Người phúc khảo phải khác người ra quyết định ban đầu.');

    await expect(
      firstValueFrom(
        complaints.appeal({
          adminId: 'admin-seed',
          complaintId: 'complaint-plants',
          requestedBy: 'user-demo',
          reason: 'Cần kiểm tra lại ảnh chứng cứ.',
          reviewerId: 'admin-reviewer',
        }),
      ),
    ).resolves.toMatchObject({
      stage: 'evaluating',
      appeal: { used: true, reviewerId: 'admin-reviewer', originalReviewerId: 'admin-seed' },
    });
  });

  it('rejects appeals after the response window', async () => {
    const complaints = TestBed.inject(ComplaintRepository);
    const db = TestBed.inject(MockDb);

    db.transaction((data) => {
      const complaint = data.complaints.find((candidate) => candidate.id === 'complaint-tutor');
      if (!complaint) throw new Error('Missing seeded complaint.');
      complaint.remedy = {
        type: 'none',
        conclusion: 'Dịch vụ đã hoàn tất.',
        decidedBy: 'admin-seed',
        decidedAt: '2026-07-09T00:30:00.000Z',
      };
      complaint.notification = {
        state: 'sent',
        channels: ['in_app'],
        sentAt: '2026-07-09T01:00:00.000Z',
        sentBy: 'admin-seed',
        responseDueAt: '2026-07-09T02:00:00.000Z',
      };
    });

    await expect(
      firstValueFrom(
        complaints.appeal({
          adminId: 'admin-seed',
          complaintId: 'complaint-tutor',
          requestedBy: 'user-lan',
          reason: 'Phúc khảo sau hạn.',
          reviewerId: 'admin-reviewer',
        }),
      ),
    ).rejects.toThrow('Đã quá hạn phúc khảo khiếu nại.');
  });
});
