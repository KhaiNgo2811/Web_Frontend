# Codebase Summary

_Last updated: 2026-07-01 · Historical context: see
[`plans/20260701-1620-angular-frontend-init/`](../plans/20260701-1620-angular-frontend-init/)._

Snapshot of the actual repo structure and conventions. `.docs/` = durable
current-state record; `plans/` = how it got here.

## Folder tree (actual)

```
src/
├── main.ts                    # bootstrapApplication(App, appConfig)
├── index.html
├── styles.scss                # global styles
├── app/
│   ├── app.ts                 # App shell component (selector app-root)
│   ├── app.html               # template = <router-outlet/>
│   ├── app.scss
│   ├── app.config.ts          # ApplicationConfig: providers (router, error listeners)
│   ├── app.routes.ts          # Routes: '' -> lazy Home
│   ├── app.spec.ts
│   └── features/
│       └── home/
│           ├── home.ts        # Home component (selector app-home)
│           ├── home.html
│           ├── home.scss
│           └── home.spec.ts
└── environments/
    ├── environment.ts             # base = PRODUCTION ({ production: true })
    └── environment.development.ts  # dev ({ production: false })
public/                        # static assets, copied as-is (angular.json assets glob **/*)
```

## Shell & routing pattern

- `App` (`app.ts`) is a thin shell: template is just `<router-outlet/>`; holds a
  `title = signal('web-frontend')` placeholder.
- Routing (`app.routes.ts`) uses **lazy standalone loading**:
  ```ts
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) }
  ```
- New features follow this pattern: add `features/<name>/<name>.ts` + a lazy
  `loadComponent` route.

## Environments pattern

- **Base `environment.ts` holds PRODUCTION values** (`production: true`).
- `environment.development.ts` is swapped in for dev builds via
  `angular.json` → build `development` config `fileReplacements`
  (`environment.ts` → `environment.development.ts`).
- Import from `environment.ts` in code; the build handles the swap.

## Notable absences (by design)

- No `core/` or `shared/` folders yet — YAGNI; add on first real need.
- No `server.ts` — no SSR.
- No state-management folder — Signals only.

## Config files (repo root)

- `package.json`, `angular.json`, `tsconfig.json` (+ `tsconfig.app.json`,
  `tsconfig.spec.json`), `eslint.config.js`, `.prettierrc`, `.nvmrc` (22.22.3).
