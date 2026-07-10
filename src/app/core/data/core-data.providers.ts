import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { LocalApplicationRepository } from './local-application-repository';
import { LocalAuthRepository } from './local-auth-repository';
import { LocalConversationRepository } from './local-conversation-repository';
import { LocalNotificationRepository } from './local-notification-repository';
import { LocalOrderRepository } from './local-order-repository';
import { LocalPostRepository } from './local-post-repository';
import { LocalUserRepository } from './local-user-repository';
import {
  ApplicationRepository,
  AuthRepository,
  ConversationRepository,
  NotificationRepository,
  OrderRepository,
  PostRepository,
  UserRepository,
} from './repositories';

export function provideAntgoCore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AuthRepository, useClass: LocalAuthRepository },
    { provide: UserRepository, useClass: LocalUserRepository },
    { provide: PostRepository, useClass: LocalPostRepository },
    { provide: ApplicationRepository, useClass: LocalApplicationRepository },
    { provide: OrderRepository, useClass: LocalOrderRepository },
    { provide: ConversationRepository, useClass: LocalConversationRepository },
    { provide: NotificationRepository, useClass: LocalNotificationRepository },
  ]);
}

