import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApplicationRepository, OrderRepository } from './repositories';
import { provideAntgoCore } from './core-data.providers';

describe('local marketplace repositories', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideAntgoCore()] });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('selects an application and enforces the actor-specific order lifecycle', async () => {
    const applications = TestBed.inject(ApplicationRepository);
    const orders = TestBed.inject(OrderRepository);
    const application = await firstValueFrom(
      applications.apply('user-demo', {
        postId: 'post-laundry',
        message: 'Mình muốn đặt dịch vụ giặt sấy trong hôm nay.',
      }),
    );

    const selection = await firstValueFrom(applications.select('user-minh', application.id));
    expect(selection.order.customerId).toBe('user-demo');
    expect(selection.order.providerId).toBe('user-minh');

    await firstValueFrom(
      orders.transition({ orderId: selection.order.id, actorId: 'user-minh', action: 'start' }),
    );
    await firstValueFrom(
      orders.transition({
        orderId: selection.order.id,
        actorId: 'user-minh',
        action: 'report_done',
      }),
    );
    const completed = await firstValueFrom(
      orders.transition({
        orderId: selection.order.id,
        actorId: 'user-demo',
        action: 'confirm_complete',
      }),
    );
    expect(completed.status).toBe('completed');
  });
});

