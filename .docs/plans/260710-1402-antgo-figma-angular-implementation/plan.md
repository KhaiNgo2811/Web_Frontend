# AntGo Figma-to-Angular Implementation Plan

_Created 2026-07-10 · Status: approved for implementation · Target: Angular 22 desktop SPA_

## Goal and Definition of Done

Convert the 37 populated desktop frames in Figma file `VyDBGZav4suN10z3bXce2e` into a
cohesive AntGo demo. Figma is visual/interaction authority; existing AntGo docs remain domain
and data-architecture authority. Done means every populated frame/state is reachable through a
working journey, state survives refresh where intended, and build/lint/tests pass.

Reference viewport: **1440×1024**. Support desktop widths **≥1200 px** without horizontal
overflow. Admin and Mobile Figma pages are empty and excluded.

## Phase Checklist

- [ ] **1. Design extraction and foundation** — inspect each Figma frame/subtree with the Figma
  integration; download expiring image assets into `public/assets/antgo/`; record node-to-asset
  mapping; add local/global font loading; build tokens, layouts, and shared primitives.
- [ ] **2. Mock data architecture** — add domain/DTO types, seeded versioned `MockDb`, abstract
  Observable repositories, local implementations, DI providers, and Signal stores.
- [ ] **3. Authentication journey** — login, remembered session, mock Google login, registration,
  OTP verification, success, forgot/reset password, validation, guards, loading/error states.
- [ ] **4. Marketplace journey** — feed/hero, search/location/filter/sort, cards, post detail,
  receive-order confirmation, create request/service, edit, extend, and delete flows.
- [ ] **5. Applications and orders** — order workspace and every Figma state: applicant detail,
  applied, withdrawn, selected, pending, in-progress, completed, cancellation, review, complaint.
- [ ] **6. Messaging and account** — conversation list/detail, sent/received tabs, text/image/QR
  mock messages, notifications, location/account dropdowns, notifications page, account page.
- [ ] **7. Verification and docs** — unit/component/journey tests, 1440×1024 visual comparison,
  accessibility pass, build/lint/test, then update durable `.docs` current-state documents.

Run `npm run build` after each implementation phase. Final gate: `npm run build`,
`npm run lint`, and `npm test -- --watch=false` all green; do not weaken tests or budgets.

## Routes and Shells

Use lazy standalone route components. `/` redirects to `/feed`; unknown paths redirect to
`/feed`. `AuthLayout` owns branded auth background/card. `MainLayout` owns navbar, routed
content, dropdown overlays, and footer.

| Route | Access | Figma behavior |
|---|---|---|
| `/auth/login` | guest | Password login, remember option, Google mock login |
| `/auth/register` | guest | Registration information form |
| `/auth/register/verify` | guest | Six-digit OTP entry/resend state |
| `/auth/register/success` | guest | Registration completion |
| `/auth/forgot-password` | guest | Recovery identity form |
| `/auth/forgot-password/reset` | guest | New password form |
| `/auth/forgot-password/success` | guest | Reset completion |
| `/feed` | public | Long home, hero, search, filters, sort, post grid |
| `/posts/:id` | public | Detail; guest can view but must log in before acting |
| `/posts/new` | authenticated | Request/service type chooser |
| `/posts/new/request` | authenticated | Create “Cần giúp” post |
| `/posts/new/service` | authenticated | Create “Cung cấp” post |
| `/posts/:id/edit` | owner | Shared editor; type immutable; extend/delete dialogs |
| `/orders` | authenticated | Three-column order/application workspace and tabs |
| `/orders/:id` | participant | Order detail, lifecycle actions, review/cancel/report overlays |
| `/messages` | authenticated | Conversation index and “Tôi đăng/Tôi nhận” tabs |
| `/messages/:conversationId` | participant | Conversation detail/composer |
| `/notifications` | authenticated | Full notification list/read state |
| `/account` | authenticated | Current account/profile screen |

`authGuard` saves the attempted URL and redirects guests to `/auth/login`; successful login
returns there. `guestGuard` redirects authenticated users from auth routes to `/feed`. Resource
screens verify ownership/participation and return to the parent list for unknown/forbidden IDs.

## Architecture Contracts

- Add `core/` (models, mock database, repositories, stores, guards), `shared/` (input/output-only
  UI and pipes), `layout/`, and route-level `features/`. Imports flow `features → shared/core`;
  `shared` never imports features; `core` contains no UI. Keep files focused and under 200 lines.
- Use standalone components, Angular control flow, Reactive Forms, Signals, RxJS, SCSS, and
  Bootstrap 5 utilities. No NgModules, NgRx, Tailwind, Bootstrap JS, or new UI library.
- Create CSS custom properties for Figma typography and palette: Baloo 2 headings/brand,
  Be Vietnam Pro UI/body; `#f4efe8`, `#f97316`, `#ea580c`, `#1c1008`, `#5a3e2b`,
  `#7a5c4a`, `#b79a80`, `#ede6da`; also spacing, radii, borders, shadows, and gradients.
- Shared primitives: buttons, form fields, avatar, badge/status pill, tabs, chips, post card,
  order/application card, dropdown, dialog, toast/notification item, empty/error state, skeleton,
  star rating, `timeAgo`, and VND formatting. Reuse variants instead of frame-specific copies.
- Domain additions: `Credentials`, `RegistrationDraft`, `Session`; `Application` with
  `pending | selected | withdrawn | rejected`; `Conversation` linked to a post and optional
  order; feed/order/message filter types. Retain existing `Post`, `Order`, `Review`, `Message`,
  `Notification`, `User`, input DTOs, and transaction-scoped customer/provider roles.
- Repositories are abstract-class DI tokens returning `Observable<T>`:
  `AuthRepository`, `PostRepository`, `ApplicationRepository`, `OrderRepository`,
  `ConversationRepository`, `NotificationRepository`, `UserRepository`. Local implementations
  alone access `MockDb`; callers remain compatible with future HTTP implementations.
- Store all collections in `antgo.mock-db` as `{ schemaVersion: 1, data }`; recover malformed or
  mismatched storage by reseeding. Store remembered auth only in `antgo.session`; otherwise keep
  session memory-only. Seed deterministic IDs covering every designed empty/populated/state view.
- `SessionStore`, `FeedStore`, `OrderStore`, `MessageStore`, and `NotificationStore` expose
  readonly signals/computed values plus command methods. Repositories remain persistence truth;
  stores load/mutate through repositories and expose loading/error state.

## State and Screen Mapping

| Figma frame family | Angular composition/state |
|---|---|
| Login/register/OTP/reset variants | Auth route components over shared auth card and fields |
| Home/feed and dropdown variants | One feed route; Signal filters plus location/navbar overlays |
| Post detail/chat/confirm variants | One detail route; embedded contact panel and confirm dialog |
| Create request/service/edit variants | Shared post form configured by immutable `PostType` |
| Extend/delete variants | Dialog state owned by editor; repository mutation then route return |
| Applied/withdrawn/applicant variants | Order workspace selection plus `Application.status` |
| Selected/pending/in-progress/completed variants | Order detail/workspace rendered from `Order.status` |
| Review/cancel/complaint variants | Accessible overlays on order detail; persisted mutations |
| Message index/detail variants | Shared conversation list; selected route ID and role tab filter |
| Notification/location/account variants | Reusable navbar dropdowns plus dedicated list/account routes |

For a request post, author = customer and applicant = provider; for a service post, author =
provider and applicant = customer. Applying creates one pending application. Applicant may
withdraw while pending. Author selection rejects other pending applications, creates one order,
marks the post `connected`, and creates both users’ conversation/notifications. Provider starts
work; provider reports done; customer confirms completion and may review. Either participant may
cancel, with a non-empty reason required once work started. Review is one per rater/order.

Auth is a demo: seeded password credentials, Google selects the seeded demo user, registration
accepts OTP `000000`, and reset updates local mock credentials. No real OAuth, SMS, email, JWT,
payment, upload, or QR processing. Image/QR messages store safe local asset URL plus metadata only.

## Test and Acceptance Matrix

- **Data:** seed/reseed, CRUD, persistence, schema mismatch, malformed storage, repository errors,
  session remembered/not remembered, filtering/sorting, deterministic IDs.
- **Rules:** request/service role assignment, apply/withdraw/select, competing rejection, post
  connection, permitted/forbidden order transitions, cancellation reason, one review per party,
  notification/read and conversation updates.
- **Components:** shared primitives and all form validation/loading/disabled/empty/error variants;
  dropdown keyboard dismissal; dialog focus trap/restore, Escape, labels; image alt text.
- **Journeys:** register→OTP→feed; login→return URL; create→edit/extend/delete; browse→apply→
  select→start→complete→review; withdraw; cancel/report; message/send; mark notifications read;
  refresh each deep link; invalid/forbidden IDs.
- **Visual:** representative frame from each family at 1440×1024; typography, asset crop, colors,
  spacing, radius, borders, gradients, shadows, overlays, long-page scroll; no horizontal overflow.
- **Accessibility/performance:** semantic landmarks/headings, keyboard-only actions, visible focus,
  WCAG AA contrast, reduced-motion support, lazy routes, stable image dimensions, bundle budgets.

## Assumptions and Exclusions

- Implement all populated desktop frames; frame variants are states, not separate duplicated
  routes/components. Figma assets must be downloaded when access is available because URLs expire.
- Desktop-first only for this milestone. Keep fluid containers where cheap, but no mobile-specific
  navigation or Admin UI until those Figma pages are populated.
- LocalStorage is approved demo persistence. Token, escrow, timers, reputation formulas, admin,
  real backend/API, SSR, and production security are excluded unless visibly required by a frame;
  any visible escrow/reputation value is seeded display state only.
- Vietnamese Figma copy is preserved exactly. No i18n framework in this milestone.
- No unresolved product decisions. If a Figma detail conflicts with older docs, visual/layout copy
  follows Figma; domain invariants and repository boundaries follow the architecture docs.
