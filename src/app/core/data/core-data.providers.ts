import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { LocalComplaintRepository, LocalModerationRepository } from './local-admin-repositories';
import { LocalAdminUserRepository } from './local-admin-user-repository';
import { LocalConfigRepository } from './local-config-repository';
import { LocalAuditRepository } from './local-audit-repository';
import { LocalInboxRepository } from './local-inbox-repository';
import { LocalApplicationRepository } from './local-application-repository';
import { LocalAuthRepository } from './local-auth-repository';
import { LocalConversationRepository } from './local-conversation-repository';
import { LocalNotificationRepository } from './local-notification-repository';
import { LocalOrderRepository } from './local-order-repository';
import { LocalPostRepository } from './local-post-repository';
import { LocalUserRepository } from './local-user-repository';
import { LocalWalletRepository } from './local-wallet-repository';
import {
  ApplicationRepository,
  AuthRepository,
  AuditRepository,
  InboxRepository,
  AdminUserRepository,
  ComplaintRepository,
  ConfigRepository,
  ConversationRepository,
  ModerationRepository,
  NotificationRepository,
  OrderRepository,
  PostRepository,
  UserRepository,
  WalletRepository,
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
    { provide: AdminUserRepository, useClass: LocalAdminUserRepository },
    { provide: ModerationRepository, useClass: LocalModerationRepository },
    { provide: ComplaintRepository, useClass: LocalComplaintRepository },
    { provide: ConfigRepository, useClass: LocalConfigRepository },
    { provide: AuditRepository, useClass: LocalAuditRepository },
    { provide: InboxRepository, useClass: LocalInboxRepository },
    { provide: WalletRepository, useClass: LocalWalletRepository },
  ]);
}
