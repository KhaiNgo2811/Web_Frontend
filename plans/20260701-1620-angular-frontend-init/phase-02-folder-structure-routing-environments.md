# Phase 02 — Folder Structure, Routing, Environments

## Context links
- Overview: [plan.md](./plan.md)
- Previous: [phase-01-cli-scaffold-bootstrap-linting.md](./phase-01-cli-scaffold-bootstrap-linting.md)
- Next: [phase-03-verification-build.md](./phase-03-verification-build.md)

## Overview
- Date: 2026-07-01
- Description: establish feature-based folder convention, lazy-loaded routing skeleton, dev/prod environment config
- Priority: high
- Implementation status: not started
- Review status: not reviewed

## Key Insights
- Feature-based structure (`core`/`shared`/`features/<domain>`) is the standard scalable Angular convention — avoids a flat `components/` dump, keeps ownership boundaries clear as app grows, aligns with DRY (shared/ prevents duplication) and file-size rule (small focused files per feature).
- Lazy loading via `loadChildren`/`loadComponent` on `app.routes.ts` is Angular's built-in code-splitting — set up the pattern now with one placeholder feature (`home`) so future features just follow the same shape, rather than retrofitting later.
- `src/environments/` is no longer scaffolded by default by newer Angular CLI (removed default environments setup in v15+, replaced by manual `fileReplacements` in `angular.json` or plain build-time config). Must verify current CLI behavior at execution time and manually recreate `environment.ts`/`environment.prod.ts` + `angular.json` `fileReplacements` if not auto-generated (`ng generate environments` schematic exists in newer CLI — prefer using it over hand-rolling if available).
- Angular Signals for state: no dedicated `store/` folder needed yet — signals live alongside the service/component that owns them (e.g. a feature service exposing a `signal()`). Revisit only if cross-feature shared state emerges.

## Requirements
- `src/app/core/` — singleton services, HTTP interceptors, route guards (empty placeholder subfolders acceptable, no premature files)
- `src/app/shared/` — shared/reusable components, pipes, directives (empty placeholder acceptable)
- `src/app/features/home/` — first (and for this init pass, only) feature folder, contains the minimal home route component
- `src/app/app.routes.ts` — root route table, `home` route lazy-loaded via `loadComponent`
- `src/environments/environment.ts` + `environment.prod.ts` (or CLI-current equivalent) wired via `angular.json` `fileReplacements` for prod build

## Architecture
```
src/
├── app/
│   ├── core/
│   │   ├── interceptors/       (empty, .gitkeep or first real interceptor later)
│   │   ├── guards/              (empty)
│   │   └── services/            (empty)
│   ├── shared/
│   │   ├── components/          (empty)
│   │   ├── pipes/                (empty)
│   │   └── directives/          (empty)
│   ├── features/
│   │   └── home/
│   │       └── home.component.ts   (standalone, lazy-loaded via loadComponent)
│   ├── app.routes.ts
│   ├── app.config.ts            (CLI-generated, unchanged)
│   └── app.ts / app.component.ts (CLI-generated root shell — keep minimal, just <router-outlet>)
├── environments/
│   ├── environment.ts           (dev defaults)
│   └── environment.prod.ts      (prod overrides)
```
Empty placeholder folders: Git doesn't track empty dirs — either skip creating them until a real file lands (YAGNI-aligned, preferred) or add `.gitkeep`. Recommendation: **do not pre-create empty `core`/`shared` subfolders** — create `core/` and `shared/` only when the first real file (first interceptor, first shared component) is added. Avoids empty-folder clutter contradicting YAGNI. Only `features/home/` is created now since it has real content (Phase 3).

## Related code files
- `src/app/app.routes.ts` (CLI-generated, to be edited — add home route)
- `src/app/features/home/home.component.ts` (new, created in Phase 3 alongside routing wire-up — kept together since route + component are one unit of work)
- `angular.json` (edited — add `fileReplacements` for environments if not auto-scaffolded)
- `src/environments/environment.ts`, `src/environments/environment.prod.ts` (new)

## Implementation Steps
1. Decide core/shared: create empty dirs now only if team prefers visible convention upfront; default plan = skip, create on first real need (documented above).
2. Create `src/app/features/home/` directory (real content follows in Phase 3, but the routing wiring happens here since route table is a cross-cutting concern for this phase).
3. Edit `src/app/app.routes.ts`:
   ```ts
   export const routes: Routes = [
     { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
   ];
   ```
4. Check if current Angular CLI version still scaffolds `src/environments/` by default; if yes, keep as-is. If no (removed in v15+), run `ng generate environments` (official schematic) to recreate the pattern, OR manually create `environment.ts`/`environment.prod.ts` + add `fileReplacements` block to `angular.json` under the `production` configuration.
5. Populate `environment.ts` with `{ production: false }` and `environment.prod.ts` with `{ production: true }` — no real config values needed yet (no API URLs, no secrets specified for this init task).
6. Confirm `.gitignore` doesn't need environment-specific entries (these files are NOT secrets, they're committed — only `.env*` files are gitignored per existing rules, which is already correct/unaffected).

## Todo list
- [ ] Create `src/app/features/home/` folder
- [ ] Write `app.routes.ts` with lazy `loadComponent` route to home
- [ ] Verify/recreate `src/environments/environment.ts` + `environment.prod.ts`
- [ ] Wire `fileReplacements` in `angular.json` if manually created
- [ ] Confirm no premature empty `core`/`shared` folders committed unless team overrides

## Success Criteria
- `app.routes.ts` has at least one lazy-loaded route (`loadComponent`), not eagerly imported
- `environment.ts`/`environment.prod.ts` exist and `ng build --configuration production` correctly swaps them (verified in Phase 3)
- Folder layout matches feature-based convention: no components placed directly under `src/app/` root besides the shell component

## Risk Assessment
- Angular CLI environments scaffolding behavior varies by version — must verify live rather than assume; if `ng generate environments` doesn't exist in the resolved CLI version, fall back to manual `fileReplacements` (documented, low risk, well-known Angular pattern)
- Over-creating empty folders now could get flagged as premature structure (YAGNI) — mitigated by deferring `core`/`shared` subfolder creation until first real file

## Security Considerations
- `environment.prod.ts` must never contain hardcoded secrets/API keys — any future real config (API base URLs are fine, keys/tokens are not) should come from build-time env injection, not committed files. No secrets exist at this stage.

## Next steps
Proceed to Phase 03: implement `HomeComponent` itself and run full verification (serve/build/lint/test).
