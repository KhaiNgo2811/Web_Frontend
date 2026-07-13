import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

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

/**
 * Fetches just the users referenced as post authors, instead of a bulk
 * `users.list()` — antgo-backend has no "list all users" endpoint (see
 * CLAUDE.md "Backend" known gaps), so HttpUserRepository.list() always
 * throws. Missing/failed lookups are dropped; PostCard already falls back to
 * a generic "AntGo" display when an author can't be resolved.
 */
function loadAuthors(users: MarketplaceRepositories['users'], posts: Post[]): Observable<User[]> {
  const authorIds = Array.from(new Set(posts.map((post) => post.authorId)));
  if (!authorIds.length) return of([] as User[]);
  return forkJoin(authorIds.map((id) => users.getById(id).pipe(catchError(() => of(undefined))))).pipe(
    map((found) => found.filter((user): user is User => user !== undefined)),
  );
}

export function loadMarketplaceData(
  repositories: MarketplaceRepositories,
  viewerId: string | null,
  filter: PostFilter,
): Observable<MarketplaceData> {
  return repositories.posts.list(filter).pipe(
    switchMap((posts) => {
      const authors$ = loadAuthors(repositories.users, posts);
      if (!viewerId) {
        return authors$.pipe(map((users) => ({ users, posts, ...PRIVATE_EMPTY })));
      }

      return forkJoin({
        users: authors$,
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
          return messages$.pipe(map((messages) => ({ ...data, posts, messages })));
        }),
      );
    }),
  );
}
