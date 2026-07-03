# Project Overview & PDR

_Last updated: 2026-07-01 · Status: scaffold only (no features yet)_

## What this is

`Web_Frontend` — a client-side Angular Single Page Application (SPA). Working
theme: "Web_Frontend from zero to hero". Currently a fresh Angular 22 scaffold
with toolchain configured; no real product features, no backend integration yet.

## Current scope (Milestone 1 — DONE)

- Angular 22.x SPA scaffold (standalone bootstrap, no NgModules).
- Toolchain: ESLint (angular-eslint flat config) + Prettier, SCSS, Bootstrap 5.
- One placeholder feature route (`/` → `Home`), lazy-loaded.
- Vitest-based test runner via Angular's built-in unit-test builder.

## Out of scope right now (YAGNI — add on first real need)

- No backend / API integration — TBD, revisit when backend contract exists.
- No auth, no state library (Angular Signals only, no NgRx).
- No SSR / server-side rendering (no `server.ts`).
- No `core/` or `shared/` folders yet — added when first cross-cutting concern appears.

## Functional requirements

- App boots to `/` and renders the `Home` feature via a lazy `loadComponent`.
- Shell (`App`) = a routing host (`<router-outlet/>`), nothing else.

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

- Angular 22.x, TypeScript ~6.0, Bootstrap 5.3.x. See `system-architecture.md`.

## Version history

- 2026-07-01 — v1: initial scaffold documented (init plan Milestone 1).
