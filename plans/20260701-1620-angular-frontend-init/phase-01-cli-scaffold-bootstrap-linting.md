# Phase 01 — CLI Scaffold, Bootstrap, Linting

## Context links
- Overview: [plan.md](./plan.md)
- Next: [phase-02-folder-structure-routing-environments.md](./phase-02-folder-structure-routing-environments.md)

## Overview
- Date: 2026-07-01
- Description: scaffold Angular app via CLI, install+wire Bootstrap 5, add ESLint/Prettier
- Priority: high (blocks all other phases)
- Implementation status: not started
- Review status: not reviewed

## Key Insights
- Repo root already has `.git`, `.gitignore`, `CLAUDE.md`, `README.md`, `.claude/`. `ng new` must scaffold INTO this existing dir, not create a nested dir — use `--directory .` or scaffold to a temp dir and merge (prefer `--directory .` for simplicity, KISS).
- Global Node is v20.19.6, and a legacy project on this machine depends on it — **do not replace the global Node install**. `@angular/cli@latest` = v22.0.5, requires Node `^22.22.3||^24.15.0||>=26`. Resolve via a Node version manager (nvm-windows or fnm) installing Node 22.22.3+ scoped to this repo only, leaving the legacy project's Node version untouched. Plan uses literal **Angular latest (22.x)** on the version-managed Node.
- `ng new` default schematic (Angular 17+) already produces standalone components, no NgModules — no extra flag needed for that, it's the default. Explicit `--standalone` flag was removed/is default; confirm at execution time via `ng new --help` in case CLI version differs.
- Bootstrap via npm keeps versioning/build reproducible (lockfile-controlled) vs CDN which adds an external runtime dependency and a FOUC/network-failure risk, and can't be tree-shaken/bundled. npm + `angular.json` `styles` array is the standard Angular-idiomatic approach.
- ng-bootstrap deferred: no concrete near-term need for JS-driven components (modal/dropdown/tooltip/toast) stated in requirements. Adding it now is speculative (YAGNI violation). Plain Bootstrap 5 is CSS-only + optional vanilla-JS bundle (Popper-based) — if a JS widget is needed later, either import Bootstrap's JS bundle directly or add ng-bootstrap then, decided against real requirement.
- SCSS chosen over CSS: lets `styles.scss` `@import`/`@use` Bootstrap's SCSS source for variable overrides (theming) later without a rewrite; negligible extra setup cost via `--style=scss`.
- App/workspace name confirmed: `web-frontend`, scaffolded at repo root.

## Requirements
- Node 22.22.3+ available for this repo via a version manager, without touching global/legacy Node
- `ng new` produces: standalone components, routing enabled, SCSS, strict mode, no SSR/zoneless-SSR, no server-side rendering
- Bootstrap 5 CSS available globally, installed via npm (pinned in package.json)
- ESLint configured for Angular (angular-eslint) + Prettier, with npm scripts to run both
- No ng-bootstrap or other component library installed this phase

## Architecture
Scaffold target: repo root becomes the Angular workspace root (single app, no monorepo/nx). `angular.json` at repo root. No `projects/<name>/` nesting beyond Angular CLI's own default single-app layout.

Bootstrap wiring:
```
src/styles.scss          <- global styles entry, imports bootstrap here (or angular.json styles array references bootstrap css directly)
angular.json  ->  build.options.styles: ["node_modules/bootstrap/dist/css/bootstrap.min.css", "src/styles.scss"]
```
Decision: reference Bootstrap's precompiled CSS in `angular.json` styles array (simplest, KISS) rather than `@import` into `styles.scss`, UNLESS variable overrides are needed now — they are not (no design tokens specified) — so use the `angular.json` array approach. Revisit with SCSS `@use` override pattern only when custom theming is actually required.

## Related code files
None exist yet — this phase creates the entire workspace. Files created (for reference, not to be hand-written — CLI-generated):
- `angular.json`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`
- `src/main.ts`, `src/index.html`, `src/styles.scss`
- `src/app/app.ts` (or `app.component.ts` depending on CLI version naming), `src/app/app.routes.ts`, `src/app/app.config.ts`
- `.eslintrc.json` or `eslint.config.js` (flat config, angular-eslint v9+ uses flat config by default)
- `.prettierrc` (hand-added, not CLI-generated)

## Implementation Steps
0. Install a Node version manager if not already present: **nvm-windows** (github.com/coreybutler/nvm-windows) or **fnm** (github.com/Schniz/fnm). Either works; fnm is faster and has simpler per-directory auto-switching via shell hook — prefer fnm if starting fresh, use nvm-windows if already installed for the legacy project.
1. Install Node 22.22.3+ through the version manager (e.g. `fnm install 22` / `nvm install 22.22.3`) — this adds the version alongside the existing 20.19.6, does NOT replace it.
2. Pin this repo to the new version: create `.nvmrc` (content: `22.22.3`, works with both nvm-windows and fnm) at repo root. Switch active shell to it (`fnm use 22` / `nvm use 22.22.3`) before running any commands below. Legacy project's own pinned version (its own `.nvmrc` or documented version) stays untouched — switching is per-shell/per-directory, not global.
3. Verify active Node: `node -v` must report 22.22.3+ before proceeding.
4. Install Angular CLI globally or use `npx`: run `npx @angular/cli@latest ng new web-frontend --directory . --routing --style=scss --strict --ssr=false --skip-git --package-manager=npm` in repo root.
   - `--directory .` scaffolds into current dir (repo root) instead of creating `web-frontend/` subfolder
   - `--skip-git` — repo already has git initialized, avoid nested/duplicate git init
   - `--ssr=false` — explicit, confirms no Angular Universal
   - `--strict` — strict TypeScript + strict Angular template checks
   - standalone is CLI default in v17+, no flag needed; verify generated `app.config.ts` has no `NgModule` bootstrap
5. Resolve any prompts (CLI may ask about AI tooling integration, analytics) — decline analytics prompt, decline unrelated AI editor integration prompts (out of scope).
6. Verify `package.json`, `angular.json` created at repo root (not nested), and `package.json`'s Angular deps resolve to 22.x.
7. Install Bootstrap: `npm install bootstrap@5`.
8. Wire Bootstrap CSS: edit `angular.json` -> `projects.web-frontend.architect.build.options.styles`, prepend `"node_modules/bootstrap/dist/css/bootstrap.min.css"` before `"src/styles.scss"`.
9. Do NOT install `ng-bootstrap`, `bootstrap-icons`, or Popper — explicitly out of scope this pass (YAGNI).
10. Add ESLint: `ng add @angular-eslint/schematics` (installs angular-eslint, wires flat `eslint.config.js`, adds `ng lint` builder target to `angular.json`).
11. Add Prettier: `npm install -D prettier`; create `.prettierrc` (repo root) with minimal config (e.g. singleQuote, printWidth 100 — team default, no strong requirement given so keep Prettier defaults + `singleQuote: true` for TS/JS convention consistency).
12. Add `.prettierignore` (dist, node_modules, .angular, coverage).
13. Reconcile ESLint + Prettier: add `eslint-config-prettier` (`npm install -D eslint-config-prettier`) to `eslint.config.js` to disable stylistic ESLint rules that'd conflict with Prettier formatting.
14. Add npm scripts to `package.json` (see Phase 3 for full script list — this phase adds `lint` and `format`, others come from CLI default or Phase 3):
    - `"lint": "ng lint"`
    - `"format": "prettier --write \"src/**/*.{ts,html,scss}\""`
15. Run `npm run lint` once to confirm zero errors on freshly scaffolded code.

## Todo list
- [ ] Install Node version manager (fnm or nvm-windows) if not present
- [ ] Install Node 22.22.3+ via version manager, alongside existing 20.19.6
- [ ] Create `.nvmrc` (22.22.3) at repo root, switch shell to it, confirm legacy project's Node version is unaffected
- [ ] Run `ng new` with flags above, scaffolding into repo root, on Angular latest (22.x)
- [ ] Verify standalone components (no NgModule) and no SSR files (`server.ts`, `main.server.ts` should NOT exist)
- [ ] `npm install bootstrap@5`
- [ ] Wire Bootstrap CSS path into `angular.json` styles array
- [ ] `ng add @angular-eslint/schematics`
- [ ] `npm install -D prettier eslint-config-prettier`
- [ ] Create `.prettierrc`, `.prettierignore`
- [ ] Add `lint`/`format` npm scripts
- [ ] Run `npm run lint` clean

## Success Criteria
- Node 22.22.3+ active in this repo's shell (via `.nvmrc`/version manager), legacy project's Node version unaffected
- `angular.json`, `package.json` exist at repo root, single app project, Angular deps on 22.x
- `ng new` used standalone default (no `NgModule` in generated app files)
- No `server.ts`/SSR artifacts present
- Bootstrap 5 in `package.json` dependencies, its CSS listed in `angular.json` styles
- No ng-bootstrap/Popper/bootstrap-icons installed
- `eslint.config.js` + `.prettierrc` present; `npm run lint` exits 0 on scaffolded code

## Risk Assessment
- Global Node replacement would risk breaking the legacy project — mitigated by using a version manager (fnm/nvm-windows) scoped per-directory instead of a system-wide upgrade
- `ng new --directory .` into a non-empty dir (repo has `.gitignore`, `CLAUDE.md`, `README.md`, `.claude/`) may prompt/fail if it detects existing files — mitigate by testing the command; if it refuses, fallback is scaffold to temp dir then move generated files into repo root manually (excluding CLI's own `.gitignore`/`README.md` so ours aren't overwritten)
- `--skip-git` must be used to avoid CLI re-initializing git and clobbering existing `.git` history
- ESLint flat-config vs legacy config differences across angular-eslint versions — verify actual generated file name/format at execution time (don't hardcode assumption)
- If the legacy project has no existing version manager/pin, switching shells could accidentally leave it on the wrong Node version — verify the legacy project's required Node version and set its own `.nvmrc`/pin before touching global state, so switching back is unambiguous

## Security Considerations
- No secrets involved in this phase. Ensure `npm install` does not pull unvetted third-party schematics beyond `@angular-eslint/schematics` (official Angular ecosystem package).
- Confirm `.gitignore` (already present) blocks `node_modules/` before first commit — already true per current repo `.gitignore`.

## Next steps
Proceed to Phase 02 (folder structure, routing, environments) after `ng serve` boots the default scaffold page with Bootstrap CSS visibly applied (spot-check: default page font/box-sizing reflects Bootstrap reset).
