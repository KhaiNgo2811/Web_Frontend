import type {
  Application,
  AuthAccount,
  Conversation,
  Message,
  Notification,
  Order,
  Post,
  Review,
  StoredAuthChallenge,
  User,
} from '../models';
import { DEMO_CONVERSATIONS, DEMO_MESSAGES, DEMO_NOTIFICATIONS } from './demo-communications';
import { DEMO_APPLICATIONS, DEMO_ORDERS, DEMO_REVIEWS } from './demo-orders';
import { DEMO_POSTS } from './demo-posts';
import { DEMO_AUTH_ACCOUNTS, DEMO_USERS } from './demo-users';

export interface MockDatabaseData {
  users: User[];
  authAccounts: AuthAccount[];
  authChallenges: StoredAuthChallenge[];
  posts: Post[];
  applications: Application[];
  orders: Order[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
}

export const DEMO_DATABASE: MockDatabaseData = {
  users: DEMO_USERS,
  authAccounts: DEMO_AUTH_ACCOUNTS,
  authChallenges: [],
  posts: DEMO_POSTS,
  applications: DEMO_APPLICATIONS,
  orders: DEMO_ORDERS,
  reviews: DEMO_REVIEWS,
  conversations: DEMO_CONVERSATIONS,
  messages: DEMO_MESSAGES,
  notifications: DEMO_NOTIFICATIONS,
};

