import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApplicationRepository,
  ConversationRepository,
  MockDb,
  NotificationRepository,
  OrderRepository,
  PostRepository,
  UserRepository,
} from '../data';
import type {
  Application,
  Conversation,
  CreateApplicationInput,
  CreatePostInput,
  Message,
  MessageAttachment,
  MessageKind,
  Notification,
  Order,
  OrderAction,
  Post,
  PostFilter,
  Review,
  UpdatePostInput,
  User,
} from '../models';
import { loadMarketplaceData, type MarketplaceRepositories } from './marketplace-store.loader';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class MarketplaceStore {
  private readonly session = inject(SessionStore);
  private readonly db = inject(MockDb);
  private readonly repositories: MarketplaceRepositories = {
    users: inject(UserRepository),
    posts: inject(PostRepository),
    applications: inject(ApplicationRepository),
    orders: inject(OrderRepository),
    conversations: inject(ConversationRepository),
    notifications: inject(NotificationRepository),
  };
  private readonly usersState = signal<User[]>([]);
  private readonly postsState = signal<Post[]>([]);
  private readonly applicationsState = signal<Application[]>([]);
  private readonly ordersState = signal<Order[]>([]);
  private readonly reviewsState = signal<Review[]>([]);
  private readonly conversationsState = signal<Conversation[]>([]);
  private readonly messagesState = signal<Message[]>([]);
  private readonly notificationsState = signal<Notification[]>([]);
  private readonly filterState = signal<PostFilter>({ sort: 'newest' });
  private readonly activeConversationState = signal<string | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly users = this.usersState.asReadonly();
  readonly posts = this.postsState.asReadonly();
  readonly applications = this.applicationsState.asReadonly();
  readonly orders = this.ordersState.asReadonly();
  readonly reviews = this.reviewsState.asReadonly();
  readonly conversations = this.conversationsState.asReadonly();
  readonly messages = this.messagesState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly activeConversationId = this.activeConversationState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(viewerId = this.session.currentUser()?.id ?? null): void {
    this.loadingState.set(true);
    this.errorState.set(null);
    loadMarketplaceData(this.repositories, viewerId, this.filterState()).subscribe({
      next: (data) => {
        this.usersState.set(data.users);
        this.postsState.set(data.posts);
        this.applicationsState.set(data.applications);
        this.ordersState.set(data.orders);
        this.reviewsState.set(data.reviews);
        this.conversationsState.set(data.conversations);
        this.messagesState.set(data.messages);
        this.notificationsState.set(data.notifications);
      },
      error: (error: unknown) => this.fail(error),
      complete: () => this.loadingState.set(false),
    });
  }

  setFilter(filter: PostFilter): void {
    this.filterState.set(filter);
    this.load();
  }
  createPost(input: CreatePostInput): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.posts.create(userId, input));
  }
  updatePost(id: string, input: UpdatePostInput): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.posts.update(userId, id, input));
  }
  extendPost(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.posts.extend(userId, id));
  }
  deletePost(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.posts.remove(userId, id));
  }
  toggleLike(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.posts.toggleLike(userId, id));
  }
  apply(input: CreateApplicationInput): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.applications.apply(userId, input));
  }
  withdrawApplication(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.applications.withdraw(userId, id));
  }
  selectApplication(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.applications.select(userId, id));
  }

  transitionOrder(orderId: string, action: OrderAction, reason?: string): void {
    const actorId = this.requireViewer();
    if (actorId) this.mutate(this.repositories.orders.transition({ orderId, actorId, action, reason }));
  }

  reviewOrder(orderId: string, stars: number, comment?: string): void {
    const actorId = this.requireViewer();
    if (actorId) this.mutate(this.repositories.orders.createReview({ orderId, actorId, stars, comment }));
  }

  openConversation(id: string): void {
    this.activeConversationState.set(id);
  }

  sendMessage(
    conversationId: string,
    kind: MessageKind,
    content: string,
    attachment?: MessageAttachment,
  ): void {
    const senderId = this.requireViewer();
    if (senderId) {
      this.mutate(
        this.repositories.conversations.sendMessage({ conversationId, senderId, kind, content, attachment }),
      );
    }
  }

  markNotificationRead(id: string): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.notifications.markRead(id, userId));
  }

  markAllNotificationsRead(): void {
    const userId = this.requireViewer();
    if (userId) this.mutate(this.repositories.notifications.markAllRead(userId));
  }

  resetDemo(): void {
    this.db.reset();
    this.session.logout();
    this.load(null);
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private mutate(source: Observable<unknown>): void {
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.fail(error),
      complete: () => this.loadingState.set(false),
    });
  }

  private requireViewer(): string | null {
    const id = this.session.currentUser()?.id ?? null;
    if (!id) this.errorState.set('Vui lòng đăng nhập để tiếp tục.');
    return id;
  }

  private fail(error: unknown): void {
    this.errorState.set(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    this.loadingState.set(false);
  }
}
