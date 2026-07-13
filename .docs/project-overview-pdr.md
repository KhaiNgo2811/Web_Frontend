# Project Overview & PDR

_Last updated: 2026-07-11 · Status: marketplace MVP plus local admin workspace implemented_

## What this is

`Web_Frontend` — a client-side Angular Single Page Application (SPA). Working
theme: "Web_Frontend from zero to hero". It now includes the AntGo marketplace
MVP and a local-demo trust/support admin workspace. No backend integration is
configured yet.

## Current scope (Milestone 1 — DONE)

- Angular 22.x SPA scaffold (standalone bootstrap, no NgModules).
- Toolchain: ESLint (angular-eslint flat config) + Prettier, SCSS, Bootstrap 5, Tabler CSS.
- Marketplace routes for auth, feed, posts, orders, messages, notifications, account, and home.
- Guarded admin routes for dashboard, inbox, users, moderation, complaints, configuration, and audit.
- Vitest-based test runner via Angular's built-in unit-test builder.

## Out of scope right now (YAGNI — add on first real need)

- No backend / API integration — TBD, revisit when backend contract exists.
- No external state library (Angular Signals only, no NgRx).
- No SSR / server-side rendering (no `server.ts`).
- Server-side auth, durable audit/export storage, payments, finance, payouts, and regional-map operations.

## Functional requirements

- App boots to `/` and routes into the marketplace or guarded admin workspace.
- Local repositories provide deterministic demo data through `MockDb`.
- Admin moderation and complaint records support route-driven drawers and policy-backed local repository commands.
- Admin workspace is desktop-first, with a narrow collapsed-sidebar fallback so content remains reachable in small browser windows.

## Non-functional requirements

- Prod build budgets (enforced by `angular.json`): initial bundle warn 500 kB /
  error 1 MB; per-component styles warn 4 kB / error 8 kB.
- Lint + format must pass (see `code-standards.md`).
- Node 22.22.3+ (pinned via `.nvmrc`).

## Acceptance criteria (init milestone)

- `npm start`, `npm run build`, `npm test`, `npm run lint`, `npm run format` all run clean.
- Prod build (`ng build`, default = production) emits to `dist/web-frontend`.

## Success metrics

- TBD — revisit when real features + product goals are defined.

## Dependencies / constraints

- Angular 22.x, TypeScript ~6.0, Bootstrap 5.3.x, Tabler CSS. See `system-architecture.md`.

## Version history

- 2026-07-01 — v1: initial scaffold documented (init plan Milestone 1).
