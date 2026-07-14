import type {
  Application,
  Conversation,
  Message,
  Notification,
  NotificationType,
  Order,
  Post,
  Review,
  User,
} from '../models';

const POST_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // approximation — backend has no expiresAt field

/** Backend `order_accepted` <-> frontend `application_selected`; every other value matches both sides. */
const NOTIFICATION_TYPE_FROM_BACKEND: Record<string, NotificationType> = {
  order_accepted: 'application_selected',
};

export function toUser(raw: Record<string, unknown>): User {
  return {
    ...(raw as Omit<User, 'role'>),
    // Backend only has 'user'|'admin' — 'admin' carries full permissions,
    // matching hasAdminPermission()'s own 'admin' -> 'super_admin' mapping.
    role: raw['role'] === 'admin' ? 'super_admin' : 'user',
  } as User;
}

export function toPost(raw: Record<string, unknown>): Post {
  const likeCount = Number(raw['likeCount'] ?? 0);
  const createdAt = String(raw['createdAt']);
  return {
    ...(raw as Omit<Post, 'urgency' | 'likedBy' | 'hidden' | 'expiresAt'>),
    urgency: 'normal',
    // Backend only stores a like count, not who liked — synthesize
    // placeholder entries so `.length` (sort/display) stays accurate; no
    // consumer can rely on `.includes(userId)` against this list (toggleLike
    // is unsupported by design, see HttpPostRepository).
    likedBy: Array.from({ length: likeCount }, (_, i) => `unknown-${i}`),
    hidden: false,
    expiresAt: new Date(Date.parse(createdAt) + POST_DURATION_MS).toISOString(),
  } as Post;
}

export function toApplication(raw: Record<string, unknown>): Application {
  return { ...raw, proposedPrice: undefined } as Application;
}

export function toOrder(raw: Record<string, unknown>): Order {
  return { ...raw, applicationId: '' } as Order;
}

export function toReview(raw: Record<string, unknown>): Review {
  return raw as unknown as Review;
}

export function toConversation(raw: Record<string, unknown>): Conversation {
  return raw as unknown as Conversation;
}

export function toMessage(raw: Record<string, unknown>): Message {
  return raw as unknown as Message;
}

export function toNotification(raw: Record<string, unknown>): Notification {
  const type = raw['type'] as string;
  return {
    ...raw,
    type: NOTIFICATION_TYPE_FROM_BACKEND[type] ?? (type as NotificationType),
  } as Notification;
}
