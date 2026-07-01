# Phase 03 — Home Component & Verification Build

## Context links
- Overview: [plan.md](./plan.md)
- Previous: [phase-02-folder-structure-routing-environments.md](./phase-02-folder-structure-routing-environments.md)

## Overview
- Date: 2026-07-01
- Description: minimal home component, final package.json scripts, gitignore audit, full verification pass (serve/build/lint/test)
- Priority: high
- Implementation status: not started
- Review status: not reviewed

## Key Insights
- Task explicitly says keep verification minimal — one placeholder route/page proving the toolchain works end to end, not a real landing page. Avoid over-building (YAGNI/scope creep risk for an init task).
- Jasmine/Karma harness comes free from `ng new` defaults — this phase only needs to confirm `ng test` runs the CLI-generated default spec (e.g. `app.spec.ts`), not author new spec files (explicit instruction: no test files written this pass).
- `package.json` scripts: `start`/`build`/`test` are CLI defaults already; only `lint` (Phase 1) and `format` (Phase 1) are additions. This phase just confirms the full set is present and correct.
- `.gitignore` audit: current root `.gitignore` already covers `node_modules/`, `dist/`, `build/`, `out/`, logs, `.env*`. Missing Angular-specific: `.angular/` (build cache dir Angular CLI v13+ uses for incremental builds) — must add. `/coverage` (karma coverage reports, if generated) — add defensively.

## Requirements
- One minimal `HomeComponent` (standalone) rendering under the `home` route, styled with at least one Bootstrap utility class (visual proof Bootstrap CSS is actually applied, not just installed)
- `ng serve` boots without error, home route renders
- `ng build` (default + `--configuration production`) succeeds, no TypeScript/template errors
- `ng lint` exits clean
- `ng test` runs existing default spec(s) successfully (headless/CI-friendly Karma launcher config confirmed present, typically ChromeHeadless via `karma.conf.js`)
- `.gitignore` extended with Angular-specific entries
- `package.json` scripts finalized: `start`, `build`, `lint`, `test`, `format`

## Architecture
`HomeComponent` — single standalone component, template-only content (no child components, no services needed):
```
src/app/features/home/
└── home.component.ts   (inline template or small companion .html — keep under 200-line rule trivially; a single file here is fine since it's tiny)
```
Kept as one file (not split into .ts/.html/.scss trio) only if trivially small; if template grows beyond a few lines, CLI default (separate .html/.scss) is preferred for consistency with rest of app — use `ng generate component features/home --standalone` defaults (which DO produce separate .ts/.html/.scss/.spec.ts files) rather than hand-rolling a single-file component, for consistency with every other component the team will generate later (DRY in tooling usage).

## Related code files
- `src/app/features/home/home.component.ts` (new — via `ng generate component`)
- `src/app/features/home/home.component.html` (new)
- `src/app/features/home/home.component.scss` (new, likely empty/minimal)
- `src/app/features/home/home.component.spec.ts` (new, CLI-generated default spec — counts as harness verification, not "new tests written by us")
- `src/app/app.routes.ts` (from Phase 2, already wired)
- `package.json` (scripts section, finalize)
- `.gitignore` (repo root, extend)

## Implementation Steps
1. Generate component: `ng generate component features/home --standalone` (standalone is default in current CLI; flag explicit for clarity). This auto-creates the 4 files and a default passing spec.
2. Edit `home.component.html`: minimal content, e.g. a heading plus one Bootstrap class (`container`, `mt-5` or similar) to visually confirm Bootstrap CSS is active. No further sections/features — this is a toolchain smoke test, not a real homepage.
3. Confirm `app.routes.ts` `loadComponent` import path resolves to this new file (path from Phase 2 plan: `./features/home/home.component`).
4. Confirm root shell component (`app.ts`/`app.component.ts`) template contains `<router-outlet />` (CLI default already includes this — verify, don't duplicate).
5. Run `npm start` (`ng serve`) — manually confirm home route renders at `http://localhost:4200/`, Bootstrap styling visible (e.g. spacing utility takes effect).
6. Run `npm run build` (`ng build`) — confirm dev build succeeds, `dist/` output produced.
7. Run `ng build --configuration production` — confirm prod build succeeds (this exercises `fileReplacements`/environment swap from Phase 2, and Angular's prod optimizer/AOT).
8. Run `npm run lint` — confirm 0 errors on all files including new home component.
9. Run `npm test` (`ng test`) — confirm default CLI-generated specs (root app spec + new home component spec) pass. If `ng test` opens an interactive Karma/Chrome watcher by default, confirm a CI-style single-run flag works too (Angular CLI's `ng test` typically respects `--watch=false` — verify default `test` script behavior, adjust only if it hangs in non-interactive shells).
10. Extend root `.gitignore`: add an `### Angular ###` section with `.angular/`, `/coverage`. Insert near existing `### Node ###` section for cohesion, don't duplicate already-present entries (`dist/`, `node_modules/` already present — skip).
11. Finalize `package.json` scripts block — confirm exactly:
    ```json
    "scripts": {
      "start": "ng serve",
      "build": "ng build",
      "test": "ng test",
      "lint": "ng lint",
      "format": "prettier --write \"src/**/*.{ts,html,scss}\""
    }
    ```
    (`start`/`build`/`test` are CLI defaults — confirm not accidentally altered; `lint`/`format` added in Phase 1, re-verify presence here as final check.)
12. Do NOT write additional `.spec.ts` files beyond CLI defaults (explicit instruction).

## Todo list
- [ ] `ng generate component features/home --standalone`
- [ ] Minimal template with one Bootstrap utility class
- [ ] Verify route wiring resolves (Phase 2's `app.routes.ts`)
- [ ] Verify root shell has `<router-outlet />`
- [ ] `ng serve` manual check — home page renders, Bootstrap visible
- [ ] `ng build` succeeds
- [ ] `ng build --configuration production` succeeds
- [ ] `ng lint` clean
- [ ] `ng test` passes (default specs only)
- [ ] Extend `.gitignore` with `.angular/`, `/coverage`
- [ ] Confirm final `package.json` scripts block

## Success Criteria
- `ng serve` + `ng build` + `ng build --configuration production` + `ng lint` + `ng test` all exit 0 / succeed with no manual workarounds
- Home page visibly Bootstrap-styled when rendered
- No new test files authored beyond CLI defaults
- `.gitignore` covers `.angular/` and coverage output
- `package.json` scripts complete and correct

## Risk Assessment
- Karma default launcher may need `ChromeHeadless` and a locally available Chrome/Chromium on the dev machine/CI runner — CLI default `karma.conf.js` ships with `ChromeHeadless` already configured, but execution environment must have Chrome installed (flag as an environment dependency, not a plan gap)
- Production build catching template/type errors not caught by dev build (stricter AOT) — acceptable, that's the point of running it in this phase; fix any such errors before calling Phase 3 done
- If `.gitignore` insertion is done carelessly it could duplicate or conflict with existing toptal.com-generated sections — edit surgically, insert new section without touching existing ones

## Security Considerations
- No new security surface introduced — static SPA, no backend calls, no auth, no secrets. Confirm no accidental hardcoded config in `home.component.ts`.

## Next steps
Proceed to Phase 04: create `.docs/` structure per CLAUDE.md now that the scaffold exists. Further out of scope (future work, not this init pass): add real feature folders under `src/app/features/`; introduce `core/` interceptors/guards and `shared/` components when first genuinely needed; revisit ng-bootstrap if a JS-driven widget becomes a real requirement.
