import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { environment } from '../../../environments/environment';
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
import { HttpApplicationRepository } from './http-application-repository';
import { HttpAuthRepository } from './http-auth-repository';
import { HttpConversationRepository } from './http-conversation-repository';
import { HttpNotificationRepository } from './http-notification-repository';
import { HttpOrderRepository } from './http-order-repository';
import { HttpPostRepository } from './http-post-repository';
import { HttpUserRepository } from './http-user-repository';
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
  const useHttpApi = environment.useHttpApi;

  return makeEnvironmentProviders([
    { provide: AuthRepository, useClass: useHttpApi ? HttpAuthRepository : LocalAuthRepository },
    { provide: UserRepository, useClass: useHttpApi ? HttpUserRepository : LocalUserRepository },
    { provide: PostRepository, useClass: useHttpApi ? HttpPostRepository : LocalPostRepository },
    {
      provide: ApplicationRepository,
      useClass: useHttpApi ? HttpApplicationRepository : LocalApplicationRepository,
    },
    { provide: OrderRepository, useClass: useHttpApi ? HttpOrderRepository : LocalOrderRepository },
    {
      provide: ConversationRepository,
      useClass: useHttpApi ? HttpConversationRepository : LocalConversationRepository,
    },
    {
      provide: NotificationRepository,
      useClass: useHttpApi ? HttpNotificationRepository : LocalNotificationRepository,
    },
    // Admin/wallet/config/moderation/complaint/audit/inbox stay on Local*
    // unconditionally — antgo-backend has no endpoints for them.
    { provide: AdminUserRepository, useClass: LocalAdminUserRepository },
    { provide: ModerationRepository, useClass: LocalModerationRepository },
    { provide: ComplaintRepository, useClass: LocalComplaintRepository },
    { provide: ConfigRepository, useClass: LocalConfigRepository },
    { provide: AuditRepository, useClass: LocalAuditRepository },
    { provide: InboxRepository, useClass: LocalInboxRepository },
    { provide: WalletRepository, useClass: LocalWalletRepository },
  ]);
}
