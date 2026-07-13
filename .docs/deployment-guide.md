# Deployment Guide

_Last updated: 2026-07-11 · Status: local build documented; hosting/CI TBD._

## Prerequisites

- **Node 22.22.3+** — pinned via `.nvmrc` (`22.22.3`). Installed via
  nvm-windows alongside a global Node 20; run `nvm use` (or select 22.22.3) in
  this repo before building.
- **npm 10.9.8** (declared as `packageManager` in `package.json`).
- Install deps: `npm install`.
- Runtime CSS includes Bootstrap and Tabler through `angular.json`; no Tabler or Bootstrap JavaScript is required.

## npm scripts (`package.json`)

| Script          | Command                                   | Notes |
|-----------------|-------------------------------------------|-------|
| `npm start`     | `ng serve`                                | Dev server, `development` config (default). |
| `npm run build` | `ng build`                                | **Defaults to `production` config.** |
| `npm run watch` | `ng build --watch --configuration development` | Rebuild on change. |
| `npm test`      | `ng test`                                 | Vitest + jsdom (see `system-architecture.md`), no browser. |
| `npm run lint`  | `ng lint`                                 | angular-eslint. |
| `npm run format`| `prettier --write "src/**/*.{ts,html,scss}"` | |

## Production build

```
ng build --configuration production   # or just: npm run build (production is default)
```

- Output: `dist/web-frontend`.
- Production config applies: bundle budgets (initial warn 500 kB / error 1 MB;
  component style warn 4 kB / error 8 kB) and `outputHashing: all`.

## Development build

- `development` config: optimization off, source maps on, and the environment
  file swap (`environment.ts` → `environment.development.ts`).

## TBD

- **CI/CD pipeline** — none configured yet. TBD, revisit when a repo host /
  pipeline is chosen.
- **Hosting target** (static host, CDN, container, etc.) — TBD. Build output is
  a plain static SPA bundle, so any static host will work once chosen.
