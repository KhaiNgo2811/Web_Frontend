import { Observable } from 'rxjs';

import type {
  Application,
  ApplicationSelection,
  AdminAccountActivity,
  AdminReviewSummary,
  AuditEvent,
  AuditFilter,
  AdminAccountStatusInput,
  AdminActivityFilter,
  AdminDashboardSummary,
  AdminUserDetail,
  AdminUserFilter,
  AuthChallenge,
  BusinessConfig,
  BusinessConfigInput,
  BusinessConfigValidationErrors,
  Complaint,
  ComplaintAppealInput,
  ComplaintAssignInput,
  ComplaintAssessmentInput,
  ComplaintCreateInput,
  ComplaintEvidenceRequestInput,
  ComplaintFilter,
  ComplaintNotifyInput,
  ComplaintPartyResponseInput,
  ComplaintResolutionInput,
  ComplaintVerificationInput,
  Conversation,
  CreateApplicationInput,
  CreatePostInput,
  CreateReviewInput,
  Credentials,
  FlaggedAccount,
  Message,
  ModerationActionInput,
  ModerationFilter,
  ModerationReport,
  Notification,
  Order,
  OrderTransitionInput,
  PasswordResetInput,
  Post,
  PostBoostTier,
  PostBoostTierInput,
  PostFilter,
  ProviderPromotionPlan,
  ProviderPromotionPlanInput,
  ProviderPromotionPlanStatus,
  RegistrationDraft,
  Review,
  SendMessageInput,
  Session,
  UpdatePostInput,
  UpdateUserInput,
  User,
  UserStatus,
  Region,
  RegionInput,
  ServiceCategoryConfig,
  ServiceCategoryInput,
  AdminAccountInput,
  ExportJob,
  InboxAssignmentInput,
  InboxFilter,
  InboxItem,
  BoostPostInput,
  ClaimWalletEarningInput,
  PurchaseProviderPlanInput,
  PurchaseTokenPackageInput,
  WalletSummary,
} from '../models';

export abstract class AuthRepository {
  abstract login(credentials: Credentials): Observable<Session>;
  abstract loginWithGoogle(): Observable<Session>;
  abstract beginRegistration(draft: RegistrationDraft): Observable<AuthChallenge>;
  abstract verifyRegistration(challengeId: string, otp: string): Observable<Session>;
  abstract requestPasswordReset(identifier: string): Observable<AuthChallenge>;
  abstract resetPassword(input: PasswordResetInput): Observable<void>;
  abstract getUser(userId: string): Observable<User | undefined>;
}

export abstract class UserRepository {
  abstract list(): Observable<User[]>;
  abstract getById(id: string): Observable<User | undefined>;
  abstract update(id: string, input: UpdateUserInput): Observable<User>;
}

export abstract class PostRepository {
  abstract list(filter?: PostFilter): Observable<Post[]>;
  abstract getById(id: string): Observable<Post | undefined>;
  abstract create(authorId: string, input: CreatePostInput): Observable<Post>;
  abstract update(actorId: string, id: string, input: UpdatePostInput): Observable<Post>;
  abstract extend(actorId: string, id: string): Observable<Post>;
  abstract remove(actorId: string, id: string): Observable<void>;
  abstract toggleLike(userId: string, id: string): Observable<Post>;
}

export abstract class ApplicationRepository {
  abstract listForUser(userId: string): Observable<Application[]>;
  abstract listForPost(postId: string): Observable<Application[]>;
  abstract apply(applicantId: string, input: CreateApplicationInput): Observable<Application>;
  abstract withdraw(applicantId: string, id: string): Observable<Application>;
  abstract select(postAuthorId: string, id: string): Observable<ApplicationSelection>;
}

export abstract class OrderRepository {
  abstract listForUser(userId: string): Observable<Order[]>;
  abstract getById(id: string): Observable<Order | undefined>;
  abstract transition(input: OrderTransitionInput): Observable<Order>;
  abstract createReview(input: CreateReviewInput): Observable<Review>;
  abstract listReviews(userId?: string): Observable<Review[]>;
}

export abstract class ConversationRepository {
  abstract listForUser(userId: string): Observable<Conversation[]>;
  abstract getById(id: string, userId: string): Observable<Conversation | undefined>;
  abstract listMessages(conversationId: string, userId: string): Observable<Message[]>;
  abstract sendMessage(input: SendMessageInput): Observable<Message>;
}

export abstract class NotificationRepository {
  abstract listForUser(userId: string): Observable<Notification[]>;
  abstract markRead(id: string, userId: string): Observable<Notification>;
  abstract markAllRead(userId: string): Observable<Notification[]>;
}

export abstract class AdminUserRepository {
  abstract list(actorId: string, filter?: AdminUserFilter): Observable<User[]>;
  abstract getById(actorId: string, id: string): Observable<AdminUserDetail | undefined>;
  abstract setStatus(input: AdminAccountStatusInput): Observable<User>;
  abstract listActivity(
    actorId: string,
    filter?: AdminActivityFilter,
  ): Observable<AdminAccountActivity[]>;
  abstract getDashboardSummary(
    actorId: string,
    rangeDays?: 7 | 30 | 90,
  ): Observable<AdminDashboardSummary>;
}

export abstract class ModerationRepository {
  abstract list(actorId: string, filter?: ModerationFilter): Observable<ModerationReport[]>;
  abstract getById(actorId: string, id: string): Observable<ModerationReport | undefined>;
  abstract act(input: ModerationActionInput): Observable<ModerationReport>;
  abstract listReviewsForAdmin(actorId: string): Observable<AdminReviewSummary[]>;
  abstract setReviewVisibility(
    actorId: string,
    id: string,
    hidden: boolean,
    note?: string,
  ): Observable<AdminReviewSummary>;
  abstract listLowReputationAccounts(actorId: string): Observable<FlaggedAccount[]>;
}

export abstract class ComplaintRepository {
  abstract list(actorId: string, filter?: ComplaintFilter): Observable<Complaint[]>;
  abstract getById(actorId: string, id: string): Observable<Complaint | undefined>;
  abstract create(input: ComplaintCreateInput): Observable<Complaint>;
  abstract assign(input: ComplaintAssignInput): Observable<Complaint>;
  abstract recordVerification(input: ComplaintVerificationInput): Observable<Complaint>;
  abstract requestEvidence(input: ComplaintEvidenceRequestInput): Observable<Complaint>;
  abstract recordAssessment(input: ComplaintAssessmentInput): Observable<Complaint>;
  abstract decideResolution(input: ComplaintResolutionInput): Observable<Complaint>;
  abstract notifyParties(input: ComplaintNotifyInput): Observable<Complaint>;
  abstract recordPartyResponse(input: ComplaintPartyResponseInput): Observable<Complaint>;
  abstract appeal(input: ComplaintAppealInput): Observable<Complaint>;
  abstract close(input: ComplaintResolutionInput): Observable<Complaint>;
}

export abstract class ConfigRepository {
  abstract listRegions(actorId: string): Observable<Region[]>;
  abstract createRegion(actorId: string, input: RegionInput): Observable<Region>;
  abstract updateRegion(actorId: string, id: string, input: RegionInput): Observable<Region>;
  abstract setRegionStatus(
    actorId: string,
    id: string,
    status: Region['status'],
  ): Observable<Region>;
  abstract listServiceCategories(actorId: string): Observable<ServiceCategoryConfig[]>;
  abstract createServiceCategory(
    actorId: string,
    input: ServiceCategoryInput,
  ): Observable<ServiceCategoryConfig>;
  abstract updateServiceCategory(
    actorId: string,
    id: string,
    input: ServiceCategoryInput,
  ): Observable<ServiceCategoryConfig>;
  abstract removeServiceCategory(actorId: string, id: string): Observable<void>;
  abstract listAdminAccounts(actorId: string): Observable<User[]>;
  abstract createAdminAccount(actorId: string, input: AdminAccountInput): Observable<User>;
  abstract updateAdminAccountRole(
    actorId: string,
    userId: string,
    role: AdminAccountInput['role'],
  ): Observable<User>;
  abstract setAdminAccountStatus(
    actorId: string,
    userId: string,
    status: UserStatus,
  ): Observable<User>;
  abstract getBusinessConfig(actorId: string): Observable<BusinessConfig>;
  abstract saveBusinessConfig(
    adminId: string,
    input: BusinessConfigInput,
  ): Observable<BusinessConfig>;
  abstract restoreDefaults(adminId: string): Observable<BusinessConfig>;
  abstract validateBusinessConfig(input: BusinessConfigInput): BusinessConfigValidationErrors;
  abstract listPostBoostTiers(actorId: string): Observable<PostBoostTier[]>;
  abstract createPostBoostTier(
    actorId: string,
    input: PostBoostTierInput,
  ): Observable<PostBoostTier>;
  abstract updatePostBoostTier(
    actorId: string,
    id: string,
    input: PostBoostTierInput,
  ): Observable<PostBoostTier>;
  abstract removePostBoostTier(actorId: string, id: string): Observable<void>;
  abstract listProviderPromotionPlans(actorId: string): Observable<ProviderPromotionPlan[]>;
  abstract createProviderPromotionPlan(
    actorId: string,
    input: ProviderPromotionPlanInput,
  ): Observable<ProviderPromotionPlan>;
  abstract updateProviderPromotionPlan(
    actorId: string,
    id: string,
    input: ProviderPromotionPlanInput,
  ): Observable<ProviderPromotionPlan>;
  abstract setProviderPromotionPlanStatus(
    actorId: string,
    id: string,
    status: ProviderPromotionPlanStatus,
  ): Observable<ProviderPromotionPlan>;
}

export abstract class AuditRepository {
  abstract list(actorId: string, filter?: AuditFilter): Observable<AuditEvent[]>;
  abstract requestExport(actorId: string, scope?: ExportJob['scope']): Observable<ExportJob>;
  abstract listExports(actorId: string): Observable<ExportJob[]>;
}

export abstract class InboxRepository {
  abstract list(actorId: string, filter?: InboxFilter): Observable<InboxItem[]>;
  abstract assign(input: InboxAssignmentInput): Observable<InboxItem[]>;
}

export abstract class WalletRepository {
  abstract getSummary(userId: string): Observable<WalletSummary>;
  abstract claimEarning(input: ClaimWalletEarningInput): Observable<WalletSummary>;
  abstract purchasePackage(input: PurchaseTokenPackageInput): Observable<WalletSummary>;
  abstract boostPost(input: BoostPostInput): Observable<WalletSummary>;
  abstract purchaseProviderPlan(input: PurchaseProviderPlanInput): Observable<WalletSummary>;
}
