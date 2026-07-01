# Angular Frontend Init — Plan Overview

Date: 2026-07-01
Goal: bootstrap brand-new Angular SPA in this empty repo. Standalone components, Signals, Bootstrap 5, npm, ESLint+Prettier, Jasmine/Karma default. Planning only, no code.

## Environment finding — RESOLVED
Local Node = v20.19.6. `@angular/cli@latest` (v22.0.5) requires Node `^22.22.3 || ^24.15.0 || >=26.0.0` — incompatible with current global Node.
Decision: **do not replace global Node** (a legacy project on this machine depends on the current version). Instead install Node 22.22.3+ via a version manager (**nvm-windows** or **fnm**) alongside the existing install, and pin this repo to the new version (`.nvmrc`/`fnm` per-directory version file). Legacy project keeps using its own pinned version untouched. Scaffold with **literal latest Angular (22.x)** on the version-managed Node. Detailed in Phase 1.

## Phases

| Phase | File | Content | Status |
|---|---|---|---|
| 1 | [phase-01-cli-scaffold-bootstrap-linting.md](./phase-01-cli-scaffold-bootstrap-linting.md) | Node version manager + Node 22 (scoped to this repo), `ng new` scaffold (Angular latest), Bootstrap install+wiring, ng-bootstrap decision, ESLint+Prettier | Not started |
| 2 | [phase-02-folder-structure-routing-environments.md](./phase-02-folder-structure-routing-environments.md) | core/shared/features folders, routing (lazy), environments | Not started |
| 3 | [phase-03-verification-build.md](./phase-03-verification-build.md) | minimal home route, ng serve/build/test/lint all pass, gitignore extension, package.json scripts audit | Not started |
| 4 | [phase-04-docs-init.md](./phase-04-docs-init.md) | create `.docs/` structure per CLAUDE.md, populate from finished scaffold | Not started |

## Key decisions (settled, not re-litigated)
- Angular latest (22.x) — Node 22.22.3+ installed via nvm-windows/fnm, scoped to this repo only; global/legacy Node untouched
- Standalone components, no NgModules, SPA (no SSR), routing enabled
- App/workspace name: `web-frontend`, scaffolded at repo root
- Styling: Bootstrap 5 via npm (not CDN), SCSS
- Component library: defer ng-bootstrap/any JS-widget lib (YAGNI) — plain Bootstrap CSS classes only for now; native `<dialog>`/simple toggles for anything interactive until a real modal/dropdown need appears
- State: Angular Signals only, no NgRx
- Package manager: npm
- Testing: Jasmine/Karma defaults from `ng new`, no test files written this pass
- Linting: ESLint via `angular-eslint`, Prettier for formatting
- `.docs/` structure created at the end (Phase 4), once the scaffold exists and there's real content to document

## Unresolved questions
1. No app name/branding/logo requirements given for the minimal home page — Phase 3 keeps it to a placeholder heading only.
