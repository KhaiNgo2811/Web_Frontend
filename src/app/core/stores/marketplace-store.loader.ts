import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import type {
  Application,
  Conversation,
  Message,
  Notification,
  Order,
  Post,
  PostFilter,
  Review,
  User,
} from '../models';
import type {
  ApplicationRepository,
  ConversationRepository,
  NotificationRepository,
  OrderRepository,
  PostRepository,
  UserRepository,
} from '../data';

export interface MarketplaceRepositories {
  users: UserRepository;
  posts: PostRepository;
  applications: ApplicationRepository;
  orders: OrderRepository;
  conversations: ConversationRepository;
  notifications: NotificationRepository;
}

export interface MarketplaceData {
  users: User[];
  posts: Post[];
  applications: Application[];
  orders: Order[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
}

const PRIVATE_EMPTY = {
  applications: [] as Application[],
  orders: [] as Order[],
  reviews: [] as Review[],
  conversations: [] as Conversation[],
  messages: [] as Message[],
  notifications: [] as Notification[],
};

export function loadMarketplaceData(
  repositories: MarketplaceRepositories,
  viewerId: string | null,
  filter: PostFilter,
): Observable<MarketplaceData> {
  const publicData$ = forkJoin({
    users: repositories.users.list(),
    posts: repositories.posts.list(filter),
  });
  if (!viewerId) {
    return publicData$.pipe(map((data) => ({ ...data, ...PRIVATE_EMPTY })));
  }

  return forkJoin({
    users: repositories.users.list(),
    posts: repositories.posts.list(filter),
    applications: repositories.applications.listForUser(viewerId),
    orders: repositories.orders.listForUser(viewerId),
    reviews: repositories.orders.listReviews(viewerId),
    conversations: repositories.conversations.listForUser(viewerId),
    notifications: repositories.notifications.listForUser(viewerId),
  }).pipe(
    switchMap((data) => {
      const messages$ = data.conversations.length
        ? forkJoin(
            data.conversations.map((conversation) =>
              repositories.conversations.listMessages(conversation.id, viewerId),
            ),
          ).pipe(map((groups) => groups.flat()))
        : of([] as Message[]);
      return messages$.pipe(map((messages) => ({ ...data, messages })));
    }),
  );
}
