# Web_Frontend

Web_Frontend from zero to hero — an Angular 22 single-page app (standalone components, Signals, Bootstrap 5).

## Quick start

### Prerequisites

- **Node.js 22.22.3+** (pinned in [`.nvmrc`](./.nvmrc)). This repo requires Node 22; the Angular 22 CLI is not compatible with Node 20.
  - With [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 22.22.3 && nvm use 22.22.3` (the `use` step needs an admin terminal).
  - With [fnm](https://github.com/Schniz/fnm) / [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use` (auto-reads `.nvmrc`).
  - Verify: `node -v` → `v22.22.3`.
- **npm** (ships with Node).

### Install & run

```bash
npm install        # install dependencies (first time only)
npm start          # dev server → http://localhost:4200/ (auto-reloads on save)
```

Open **http://localhost:4200/** in your browser.

## npm scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server at `http://localhost:4200/` with live reload |
| `npm run build` | Production build → `dist/web-frontend/` |
| `npm test` | Unit tests (Vitest + jsdom, runs in Node — no browser needed) |
| `npm run lint` | Lint with ESLint (angular-eslint) |
| `npm run format` | Format `src/` with Prettier |

## Tech stack

- **Angular 22** — standalone components (no NgModules), lazy-loaded routing, Signals for state
- **Bootstrap 5** — global CSS (via `angular.json` styles), SCSS enabled
- **Tooling** — ESLint + Prettier, Vitest + jsdom for tests
- No SSR (client-side SPA), no backend integration yet

## Project layout

```
src/app/
├── app.ts            # root shell (<router-outlet/>)
├── app.routes.ts     # route table (lazy loadComponent)
└── features/
    └── home/         # home page (first feature)
src/environments/     # environment.ts (prod) / environment.development.ts (dev)
```

More detail lives in [`.docs/`](./.docs/) (architecture, code standards, deployment).
