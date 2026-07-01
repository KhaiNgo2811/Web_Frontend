# Design Guidelines

_Last updated: 2026-07-01 · Status: baseline only — real design work not started._

## UI framework

- **Bootstrap 5 (v5.3.x)**, installed via npm (`bootstrap` dependency).
- Bootstrap CSS is loaded through `angular.json` → build `styles` array:
  `node_modules/bootstrap/dist/css/bootstrap.min.css`, then `src/styles.scss`.
- **SCSS enabled** globally and per-component (`inlineStyleLanguage: scss`).

## Conventions in force

- Prefer Bootstrap 5 layout + utility classes and CSS components first.
- Global overrides / project styles go in `src/styles.scss` (loaded after
  Bootstrap so it wins).

## Deliberately not used yet (YAGNI)

- **No ng-bootstrap / Bootstrap JS widgets** — only the CSS is wired up. Add the
  JS bundle or ng-bootstrap only when an interactive widget (modal, dropdown,
  etc.) is actually needed.
- **No custom design system / design tokens** yet.

## TBD

- Custom theming (Bootstrap SCSS variable overrides, brand palette,
  typography scale) — **TBD, revisit when real UI/branding work starts.**
- Component-level design patterns / spacing scale — **TBD.**
