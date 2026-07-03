# AntGo Domain Model

_Companion to [`overview.md`](./overview.md). TypeScript entities for `core/models/`,
traced to business-rule codes (BR-*). This is also the ERD basis for a future backend._

Types are the mock-data shape **and** the future REST payload shape (§3 of arch doc).
Roles are **per-transaction, not per-account** (BR-ACC-02): one `User` can be customer
in one order and provider in another.

## Enums

```ts
export type PostType = 'request' | 'service';           // Cần giúp | Cung cấp — immutable (BR-POST-01)
export type ServiceCategory = 'food' | 'laundry' | 'goods' | 'repair' | 'support' | 'other';
export type PostStatus = 'open' | 'connected' | 'closed' | 'expired';   // (BR-ORD-03)
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';  // Chờ nhận→Đang thực hiện→Hoàn thành (BR-ORD-01)
export type EscrowState = 'none' | 'held' | 'released' | 'disputed';    // (BR-ESC)
export type UserStatus = 'active' | 'locked';                          // (BR-ACC-03)
export type UserRole = 'user' | 'admin';                               // account-level only (BR-ACC-04)
export type MessageKind = 'text' | 'image' | 'qr';                     // (BR-COM-02, BR-PAY-02)
export type ComplaintStatus =                                          // 7-step (BR-CMP)
  | 'received' | 'verifying' | 'collecting_evidence'
  | 'evaluating' | 'resolving' | 'notified' | 'resolved';
export type EvidenceType =                                             // value tiers (BR-CMP §f)
  | 'system_log' | 'chat_history' | 'invoice' | 'video' | 'photo' | 'external_msg' | 'witness';
export type TokenReason =                                              // (BR-TOK-01/02)
  | 'checkin' | 'ad_view' | 'quest' | 'referral' | 'purchase'
  | 'spend_priority' | 'spend_promo' | 'spend_verify';
export type NotificationType =                                         // 5 mandatory events (BR-COM-01)
  | 'order_accepted' | 'work_started' | 'work_reported_done'
  | 'order_completed' | 'review_received';
```

## Entities

### User (account + profile) — BR-ACC, BR-REP, BR-TOK-05
```ts
export interface User {
  id: string;
  phone: string;                 // unique — one phone one account (BR-ACC-02)
  displayName: string;
  avatarUrl?: string;
  location: { building: string; room?: string; regionId: string };  // (BR-ADM-01)
  role: UserRole;                // 'admin' system-granted only (BR-ACC-04)
  status: UserStatus;            // (BR-ACC-03)
  isVerified: boolean;           // "Đã xác minh" badge (BR-TOK-05)
  social?: { facebook?: string; zalo?: string };
  // reputation — precomputed, display-only (BR-REP-02/03)
  reputationScore: number | null;   // null until ≥5 completed txns → show "Người dùng mới"
  completedCount: number;
  completionRate: number;            // 0..1
  reviewParticipationRate: number;   // (BR-REP-01)
  tokenBalance: number;              // (BR-TOK)
  createdAt: string;                 // ISO
}
```

### Post — BR-POST, BR-TOK-03
```ts
export interface Post {
  id: string;
  type: PostType;                // immutable after create (BR-POST-01)
  authorId: string;
  title: string;                 // ≥10 chars (BR-POST-03)
  description: string;           // ≥20 chars (BR-POST-03)
  category: ServiceCategory;
  price: number;                 // VND, proposed (request) / listed (service)
  expectedTime?: string;         // free text/ISO window
  images: string[];             // optional (BR-POST-03)
  status: PostStatus;
  likeCount: number;
  isPriority: boolean;           // token-boosted (BR-TOK-03)
  priorityUntil?: string;
  regionId: string;              // (BR-ADM-01)
  createdAt: string;
  updatedAt: string;             // edits stamped (BR-POST-02)
}
export interface CreatePostInput { type: PostType; title: string; description: string;
  category: ServiceCategory; price: number; expectedTime?: string; images?: string[]; }
export type UpdatePostInput = Partial<Omit<CreatePostInput, 'type'>>;  // type never changes
```

### Order (transaction) — BR-ORD, BR-ESC
```ts
export interface Order {
  id: string;                    // unique code, human-readable e.g. AG-000123
  postId: string;
  customerId: string;            // role assigned per-transaction (BR-ACC-02)
  providerId: string;
  status: OrderStatus;
  statusHistory: StatusEntry[];  // append-only, never deleted (BR-ORD-01, BR-ADM-02)
  cancelReason?: string;         // required if cancelled in-progress (BR-ORD-02)
  providerReportedDoneAt?: string;
  customerConfirmedAt?: string;
  autoCompleteDeadline?: string; // +12h after provider reports done (BR-ORD-04)
  // escrow — optional (BR-ESC)
  escrowState: EscrowState;
  escrowFeePct?: number;         // 1–2% (BR-ESC-01)
  heldAmount?: number;
  createdAt: string;
}
export interface StatusEntry { status: OrderStatus; at: string; byUserId: string; note?: string; }
export interface CreateOrderInput { postId: string; escrowEnabled: boolean; }
```

### Review — BR-REP
```ts
export interface Review {
  id: string;
  orderId: string;
  raterId: string;
  rateeId: string;
  stars: number;                 // 1–5 (BR-REP-02)
  comment?: string;
  hidden: boolean;               // admin-only moderation, immutable by user (BR-REP-04)
  createdAt: string;             // must be within 24h prompt window (BR-REP-01)
}
export interface CreateReviewInput { orderId: string; stars: number; comment?: string; }
```

### Conversation & Message — BR-COM-02, BR-PAY-02
```ts
export interface Message {
  id: string;
  orderId: string;               // chat keyed by transaction — evidence (BR-COM-02)
  senderId: string;
  kind: MessageKind;             // text | image | qr
  content: string;               // text | image url | qr/bank payload
  createdAt: string;
}
export interface SendMessageInput { orderId: string; kind: MessageKind; content: string; }
```

### Notification — BR-COM-01
```ts
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  orderId?: string;
  read: boolean;
  createdAt: string;
}
```

### Complaint & Evidence — BR-CMP
```ts
export interface Complaint {
  id: string;                    // ticket code
  orderId: string;
  initiatorId: string;
  category: string;              // from BR-CMP §b case list
  description: string;
  evidence: Evidence[];
  status: ComplaintStatus;       // 7-step workflow (BR-CMP §c)
  resolution?: string;           // compensation / penalty outcome (BR-CMP §d/§e)
  createdAt: string;
}
export interface Evidence { type: EvidenceType; ref: string; capturedAt?: string; }
```

### Token ledger & packages — BR-TOK
```ts
export interface TokenTxn { id: string; userId: string; delta: number; reason: TokenReason; createdAt: string; }
export interface TokenPackage { id: string; tokens: number; priceVnd: number; }  // admin-configured (BR-TOK-02)
```

### Business config — BR-ADM-03 (all dynamically configurable, no code change)
```ts
export interface BusinessConfig {
  postExpiryHours: number;          // default 24 (BR-ORD-03)
  autoCompleteHours: number;        // default 12 (BR-ORD-04)
  escrowFeePct: number;             // 1–2 (BR-ESC-01)
  cancelFeePct: number;             // (BR-ORD-02)
  reputationPublicThreshold: number;// default 5 completed txns (BR-REP-03)
  autoLockRepThreshold: number;     // 2.0 (BR-ACC-03)
  maxOpenPosts: number;             // 20 (BR-POST-04)
  escrowSuggestValueThreshold: number; // (BR-ESC-05)
  tokenPackages: TokenPackage[];    // (BR-TOK-02)
}
```

### Region — BR-ADM-01
```ts
export interface Region { id: string; name: string; }
```

## Relationships

```
Region 1───* User
User   1───* Post           (authorId)
Post   1───0..1 Order       (a post connects into one order when accepted)
Order  1───2 User           (customerId + providerId; roles per-txn — BR-ACC-02)
Order  1───* StatusEntry    (append-only history)
Order  1───0..2 Review      (each party rates the other)
Order  1───* Message        (conversation keyed by orderId)
Order  1───0..* Complaint
Complaint 1───* Evidence
User   1───* TokenTxn
User   1───* Notification
BusinessConfig — singleton (per region in full model; single-region for demo)
```

## Traceability summary

Every BR group maps to at least one entity/field: BR-ACC→User · BR-POST→Post ·
BR-ORD→Order/StatusEntry · BR-PAY→Message(qr)/Order(escrow) · BR-TOK→TokenTxn/
TokenPackage/User · BR-ESC→Order.escrow* · BR-REP→Review/User.reputation* ·
BR-COM→Notification/Message · BR-ADM→BusinessConfig/Region · BR-CMP→Complaint/Evidence.
