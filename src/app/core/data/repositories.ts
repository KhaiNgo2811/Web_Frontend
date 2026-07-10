import { Observable } from 'rxjs';

import type {
  Application,
  ApplicationSelection,
  AuthChallenge,
  Conversation,
  CreateApplicationInput,
  CreatePostInput,
  CreateReviewInput,
  Credentials,
  Message,
  Notification,
  Order,
  OrderTransitionInput,
  PasswordResetInput,
  Post,
  PostFilter,
  RegistrationDraft,
  Review,
  SendMessageInput,
  Session,
  UpdatePostInput,
  UpdateUserInput,
  User,
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

