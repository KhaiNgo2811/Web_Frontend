# System Architecture

_Last updated: 2026-07-01 · Historical context: see
[`plans/20260701-1620-angular-frontend-init/`](../plans/20260701-1620-angular-frontend-init/)._

## Stack

- **Angular 22.x** (`@angular/*` `^22.0.0`).
- **Bootstrap 5.3.x** for UI (CSS only, via `angular.json` styles).
- **Angular Signals** for local/component state (no NgRx, no external state lib).
- **TypeScript ~6.0**, target `ES2022`.
- **RxJS 7.8** (transitive Angular usage).

## Application shape

- **Client-side SPA.** Single browser entry (`src/main.ts`) →
  `bootstrapApplication(App, appConfig)`.
- **Standalone architecture** — no NgModules. Providers declared in
  `app.config.ts` (`provideRouter(routes)`, `provideBrowserGlobalErrorListeners()`).
- **Routing**: lazy standalone components via `loadComponent` (`app.routes.ts`).
- **No SSR** — no `server.ts`, no `@angular/ssr`. Browser-only.
- **No backend integration yet** — no HTTP client provider, no API layer.
  TBD, revisit when a backend contract exists.

## Build system

- **`@angular/build:application` builder** (esbuild / Vite under the hood).
- Dev server: `@angular/build:dev-server`.
- Environment swap handled at build time via `fileReplacements`
  (see `codebase-summary.md`).

## Test architecture

- **Test builder: `@angular/build:unit-test`** (`architect.test` in `angular.json`).
- Runs on **Vitest 4 + jsdom 28** — headless, **no real browser**.
- Specs colocated with source (`*.spec.ts`).

## Cross-cutting

- **State**: Signals, component-scoped for now.
- **Error handling**: `provideBrowserGlobalErrorListeners()` wired at bootstrap;
  no custom `ErrorHandler` yet.
- **Auth / interceptors / guards**: none yet — TBD.
