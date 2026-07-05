# AntGo Frontend Architecture

_Companion to [`overview.md`](./overview.md). Angular 22, standalone, Signals, Bootstrap 5._

## 1. Layered structure

Introduces `core/` + `shared/` + `layout/` (deferred until now per YAGNI —
this is the genuine first need). Feature-based under `features/`.

```
src/app/
├── app.ts / app.config.ts / app.routes.ts   # shell + root providers + route table
│
├── core/                        # app-wide singletons, no UI
│   ├── models/                  # domain types + enums (see domain-model.md)
│   ├── mock/                    # seed data consts (the "database" contents)
│   ├── data/                    # persistence + repositories (the swap seam, §3)
│   │   ├── mock-db.ts           #   localStorage-backed collection store
│   │   ├── post-repository.ts   #   abstract PostRepository + LocalPostRepository
│   │   ├── order-repository.ts
│   │   └── ...                  #   one repository per aggregate
│   ├── stores/                  # signal stores (reactive app state, §4)
│   │   ├── session.store.ts     #   current user, auth state, token balance
│   │   ├── notification.store.ts
│   │   └── ...
│   ├── guards/                  # role guards: guest / user / admin (§5)
│   └── demo/                    # dev-only: fast-forward, reset-demo-data (§6)
│
├── shared/                      # dumb, reusable, presentational (§7)
│   ├── post-card/  star-rating/  status-badge/  empty-state/  avatar/  ...
│   └── pipes/                   # timeAgo, currencyVnd, ...
│
├── layout/                      # shell chrome
│   ├── main-layout/             #   navbar + <router-outlet/> + mobile tab-bar
│   └── admin-layout/            #   admin sidebar shell
│
└── features/                    # smart, route-level (one folder per functional group)
    ├── auth/       # login, OTP verify, register
    ├── feed/       # post feed, search, category filter
    ├── posts/      # create/edit/manage (request + service flows)
    ├── orders/     # transaction lifecycle, detail, history
    ├── profile/    # reputation, stats, activity, social links
    ├── messaging/  # per-order conversation, image/QR share
    └── admin/      # dashboard, users, moderation, complaints, config
```

**Rule:** `features/` may import from `shared/` + `core/`. `shared/` imports
nothing from `features/`. `core/` has no UI. Enforces one-way dependency.

## 2. Smart vs dumb split

- **Smart (feature) components** — route targets. Inject stores/repositories,
  own data-loading + user intent, hold no reusable markup worth extracting.
- **Dumb (shared) components** — `input()` / `output()` only, zero injection,
  no store/repository knowledge. Reusable across features. This is where the
  **design/UX investment (D1)** concentrates.

## 3. Data layer — the Express-migration seam (D3)

**Goal:** today reads/writes localStorage; tomorrow hits an Express REST API.
Callers change **nothing**. No commented-out code — the future HTTP class is a
*new file*, not a comment block.

### 3.1 Pattern — abstract repository + provider swap

```ts
// core/data/post-repository.ts
export abstract class PostRepository {
  abstract list(filter?: PostFilter): Observable<Post[]>;
  abstract getById(id: string): Observable<Post | undefined>;
  abstract create(input: CreatePostInput): Observable<Post>;
  abstract update(id: string, patch: UpdatePostInput): Observable<Post>;
  abstract close(id: string): Observable<void>;
}

// core/data/local-post-repository.ts  (TODAY)
@Injectable()
export class LocalPostRepository extends PostRepository {
  private db = inject(MockDb);
  list(filter?: PostFilter): Observable<Post[]> {
    return this.db.collection<Post>('posts').query(filter).pipe(delay(120));
  }
  // ...
}

// core/data/http-post-repository.ts  (LATER — new file, no edits to callers)
@Injectable()
export class HttpPostRepository extends PostRepository {
  private http = inject(HttpClient);
  list(filter?: PostFilter): Observable<Post[]> {
    return this.http.get<Post[]>('/api/posts', { params: toParams(filter) });
  }
  // ...
}
```

```ts
// app.config.ts — migration = flip useClass, one line per repo
providers: [
  { provide: PostRepository, useClass: LocalPostRepository }, // → HttpPostRepository
  // ...
]
```

### 3.2 Why these choices

- **`Observable<T>` return type everywhere** — identical shape today and post-
  migration (Angular `HttpClient` returns Observables). No refactor of
  subscribers/`toSignal` call sites. A small `delay()` mimics network latency so
  loading states are exercised now.
- **Abstract class as DI token** — no separate `InjectionToken` boilerplate;
  `inject(PostRepository)` resolves to whichever impl is provided.
- **`MockDb`** — a thin generic localStorage collection store
  (`collection<T>(name)` → CRUD + `query`). Repositories never touch
  `localStorage` directly; only `MockDb` does. Swapping to HTTP drops `MockDb`
  entirely.
- **Input/patch DTO types** (`CreatePostInput`, …) separate from entities — these
  become the REST request bodies verbatim.

### 3.3 REST contract the seam targets (design output)

Future Express routes the HTTP repos will map to 1:1:

| Resource | Endpoints |
|---|---|
| Posts | `GET/POST /api/posts` · `GET/PATCH/DELETE /api/posts/:id` |
| Orders | `GET /api/orders` · `POST /api/orders` · `PATCH /api/orders/:id/status` |
| Reviews | `GET /api/users/:id/reviews` · `POST /api/orders/:id/review` |
| Messages | `GET /api/orders/:id/messages` · `POST /api/orders/:id/messages` |
| Users | `GET /api/users/:id` · `PATCH /api/users/me` |
| Auth | `POST /api/auth/otp/request` · `POST /api/auth/otp/verify` |
| Notifications | `GET /api/notifications` · `PATCH /api/notifications/:id/read` |
| Complaints | `GET/POST /api/complaints` · `PATCH /api/complaints/:id` |
| Config | `GET/PATCH /api/admin/config` |

## 4. State — Signals (D4)

- **Server-ish data** (posts, orders): fetched via repository, exposed to
  components with `toSignal()` or a feature-local `signal()`. Repositories are
  the source of truth for persistence; stores cache reactive views.
- **App-wide session state** — `SessionStore` (injectable, `providedIn: 'root'`):
  `currentUser`, `isAuthenticated`, `role` (`computed`), `tokenBalance`. Guards +
  navbar + feature guards read it.
- **Derived values** via `computed()` (e.g. `canPostMore = computed(() => openPosts() < config.maxOpenPosts)`).
- No NgRx. Stores are plain classes exposing `readonly` signals + mutator methods.

## 5. Routing & guards (mock auth)

- Lazy `loadComponent` per feature route (existing convention).
- **Route groups:** public (feed preview, post detail, login) · authed (create
  post, orders, messaging, profile) · admin (`admin/**`).
- **`authGuard`** — redirects to `/auth/login` if `!isAuthenticated` (BR-ACC-01:
  guests may preview, must verify to act).
- **`adminGuard`** — `role === 'admin'` (BR-ACC-04: no cross-role inheritance).
- Auth is faked: OTP `000000` accepts; "login as" dev switcher to jump between a
  customer, a provider, and an admin persona for demos.

## 6. Faking backend-weighted functions (D6)

| Feature | BR | Fake strategy |
|---|---|---|
| OTP verification | BR-ACC-01 | Any 6-digit; `000000` always passes. No SMS. |
| Reputation weighted avg | BR-REP-02 | Precomputed number in seed data; display only. No formula. |
| Public-rep threshold | BR-REP-03 | Flag on mock user; show "Người dùng mới" vs score. |
| Token balance | BR-TOK | `signal<number>` in SessionStore; actions inc/dec it. |
| Escrow hold/release | BR-ESC | `escrowState` field + badge; no money moves. |
| Post 24h expiry | BR-ORD-03 | No timer. `demo/fast-forward` control flips status to `expired`. |
| Two-way auto-complete 12h | BR-ORD-04 | Same — fast-forward triggers auto-complete. |
| Auto-lock (rep<2.0 / 3 complaints) | BR-ACC-03 | Admin-triggered or fast-forward, not a live rule engine. |

`core/demo/` holds a dev-only panel: **fast-forward** (advance time-based rules),
**persona switch**, **reset demo data** → re-seed `MockDb` from consts. Stripped
from a "clean" build if needed; harmless in a design demo.

## 7. Shared UI catalog (design/UX focus — D1)

First-cut reusable dumb components (final set follows Figma):

- `post-card` — feed item: type badge (Cần giúp/Cung cấp), category, author,
  location, price, likes, time, priority marker, verified badge.
- `status-badge` — order/post status pill (color per state).
- `star-rating` — read + input variants (1–5).
- `avatar` — with verified check overlay.
- `empty-state`, `loading-skeleton`, `category-chip`, `price-tag`,
  `confirm-dialog`, `toast/notification-item`.
- Pipes: `timeAgo`, `currencyVnd`.

## 8. Screen / navigation map (initial — refine with Figma)

```
Public
  /feed                     feed + search + category filter        (BR-POST-01, feed)
  /posts/:id                post detail (preview mode for guests)  (BR-ACC-01)
  /auth/login → /auth/otp   phone → OTP verify                     (BR-ACC-01/02)

Authed
  /posts/new                create post (request | service tabs)   (BR-POST-01/03)
  /posts/mine               manage own posts (edit if unaccepted)  (BR-POST-02/04)
  /orders                   my transactions list
  /orders/:id               lifecycle detail + status actions      (BR-ORD-01/02/04, BR-ESC)
  /orders/:id/chat          conversation (image/QR share)          (BR-COM-02, BR-PAY-02)
  /orders/:id/review        leave rating after completion          (BR-REP-01)
  /profile/:id              public profile: rep, stats, history     (BR-REP-03)
  /profile/me/tokens        balance, earn, buy, spend               (BR-TOK)
  /complaints/new           file complaint (from an order)          (BR-CMP)

Admin (/admin)
  /admin                    dashboard / KPIs
  /admin/users              list, lock/unlock                       (BR-ACC-03)
  /admin/moderation         reported content queue                  (BR-COM-03)
  /admin/complaints         7-step resolution workflow              (BR-CMP)
  /admin/config             business-param config                   (BR-ADM-03)
```

Layout: **mobile-first** (docs describe an app) — `main-layout` = top navbar +
bottom tab-bar on narrow viewports; confirm form factor (open question 3).

## 9. Testing posture (design phase)

- Keep Vitest wired. Unit-test **repositories** (localStorage CRUD contract) and
  **stores** (state transitions) — they're the logic worth locking. Dumb
  components need only smoke render tests. Don't chase coverage in a design demo.
