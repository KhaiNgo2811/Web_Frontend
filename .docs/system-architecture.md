# System Architecture

_Last updated: 2026-07-11._

## Stack

- Angular 22.x standalone SPA.
- Bootstrap 5.3 CSS, Tabler CSS for admin-compatible surfaces, plus AntGo SCSS tokens.
- Angular Signals for UI state; no NgRx.
- RxJS Observables for repository contracts.
- TypeScript strict-leaning compiler settings.
- Vitest + jsdom via `@angular/build:unit-test`.

## Runtime architecture

- `src/main.ts` bootstraps `App` with `appConfig`.
- `app.routes.ts` defines lazy standalone routes.
- `provideAntgoCore()` registers repository providers.
- `MockDb` provides deterministic local demo persistence and resets malformed/version-mismatched storage. Its current schema is v4 and includes `auditEvents` and `exportJobs` alongside the existing admin records.

## Auth and guards

- `SessionStore` owns the current user, login/register/reset flows, and persisted session.
- `authGuard` protects user-only marketplace pages.
- `adminGuard` protects `/admin`; guests are redirected to login with `returnUrl`, non-admin users and staff without a route's declared permission are redirected to `/feed`.
- Login redirects by role when no safe `returnUrl` exists: admins to `/admin`, users to `/feed`.

## Admin architecture

- Admin domain models include `admin-authorization.ts`, `admin.ts`, `admin-dashboard.ts`, `admin-inbox.ts`, `audit.ts`, and `complaint-policy.ts`.
- `admin-ui.ts` defines internal presentation contracts for operation status, pagination, sorting, confirmation requests, toast messages, staff options, and segmented-control options. These contracts do not change repository interfaces or MockDb schema.
- Admin repositories live behind abstractions in `core/data/repositories.ts`. The local adapter uses focused provider entry points for admin users, configuration, inbox, and audit, with the current moderation/complaint compatibility adapter still in `local-admin-repositories.ts`.
- Admin signal stores include `admin.stores.ts`, `admin-inbox.store.ts`, and `admin-audit.store.ts`. Stores expose operation-state signals for pending, success, and failure feedback while repository contracts remain unchanged.
- Dashboard summaries are system-wide and range-aware, with comparison KPIs, activity buckets, SLA classifications, operational activity, and priority queues; current admin pages do not use a shared region selector.
- Region data and `ConfigRepository.listRegions()` remain available for future map/region management work.
- Admin UI lives under `features/admin/` and uses Tabler's compiled CSS classes for compact cards, lists, badges, and progress meters while keeping Angular-owned interactions and AntGo tokens, typography, and SCSS overrides.
- Admin child routes carry Angular `title` metadata plus Vietnamese `adminTitle` data consumed by the shell. The shell owns skip navigation, current-route navigation semantics, sidebar collapse state, narrow-browser collapsed rail behavior, and account-menu state.
- Admin layout is optimized for 1200px operational use but does not globally lock `html` or `body` to a fixed minimum width.
- Reusable admin primitives under `features/admin/shared/` provide accessible drawers and confirmations, data-state rendering, client-side pagination, segmented controls, staff selection, and toast regions. Table sorting/pagination helpers remain presentation-layer utilities over current repository results.
- Admin localization is presentation-only: internal enum values continue through repositories, filters, query parameters, URLs, and tests, while templates/component label functions render Vietnamese text.
- The UI has `/admin/inbox` for open moderation/complaint queue work and `/admin/audit` for audit-event search and export-request state. Configuration and Audit are route-restricted to `super_admin` through `configuration.manage` and `audit.read` respectively. Audit export UI previews scope, redaction, retention, current state, latest request, and job history; the local repository does not expose a download URL.
- Local repository write commands require the corresponding active-user permission. Their audit records are typed, append-only `AuditEvent` values in the local demo store. This is a development adapter, not a backend authorization boundary.

## Moderation behavior

- Moderation reports can hide, restore, or dismiss posts, reviews, and messages.
- Hiding and dismissing reports require a nonblank admin note in repository code.
- Moderation and complaint record selection uses `report` and `complaint` query parameters; detail views open in an Angular-controlled accessible drawer with Escape/backdrop close paths, focus restoration, route cleanup, and invalid-ID feedback.
- Hidden posts/messages/reviews are excluded from normal marketplace queries.
- Complaints are mutated through explicit repository actions and normally move forward through:
  `received -> verifying -> collecting_evidence -> evaluating -> resolving -> notified -> resolved`.
- A complaint cannot close as `resolved` without a resolution already present or supplied during close.
