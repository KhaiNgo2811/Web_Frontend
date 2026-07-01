# Code Standards

_Last updated: 2026-07-01 · Reflects config actually in force in the repo._

Standards below are enforced by the checked-in config (`eslint.config.js`,
`.prettierrc`, `angular.json`, `tsconfig.json`). Keep this file in sync with them.

## Components & architecture

- **Standalone components only** — no NgModules. Bootstrap via
  `bootstrapApplication` (`src/main.ts`) + `appConfig` (`src/app/app.config.ts`).
- **State via Angular Signals** (e.g. `signal()` in `app.ts`). No NgRx / no
  external state lib.
- Keep files small and focused — one component per file, split when a file grows
  past a screen or two of logic.

## File & symbol naming (Angular 22 CLI convention)

- **No `.component` / `.service` type suffix in filenames.** Files are named by
  role: `app.ts`, `app.html`, `app.scss`, `app.routes.ts`, `home.ts`.
- Class names are PascalCase and match the concept, not the file suffix:
  `App`, `Home`.
- Specs live next to source: `app.spec.ts`, `home.spec.ts`.
- Feature folders are kebab-case (`features/home/`).

## Selectors (enforced by angular-eslint)

- **Components**: element selector, `app` prefix, kebab-case →
  `selector: 'app-root'`, `selector: 'app-home'`.
- **Directives**: attribute selector, `app` prefix, camelCase.

## Formatting (Prettier — `.prettierrc`)

- `printWidth: 100`, `singleQuote: true`.
- `*.html` formatted with the `angular` parser.
- Run: `npm run format` (writes `src/**/*.{ts,html,scss}`).

## Linting (ESLint flat config — `eslint.config.js`)

- Extends: `@eslint/js` recommended, `typescript-eslint`
  recommended + stylistic, `angular-eslint` tsRecommended, and
  `eslint-config-prettier` (Prettier owns formatting, ESLint owns correctness).
- HTML templates: `templateRecommended` + `templateAccessibility`.
- Run: `npm run lint`.

## TypeScript (`tsconfig.json`)

- Strict-leaning flags on: `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`.
- Angular: `strictInjectionParameters`, `strictInputAccessModifiers`.
- Target `ES2022`, `module: "preserve"`, `isolatedModules: true`.

## Folder layout

- Feature-based: code lives under `src/app/features/<feature>/`.
- `core/` and `shared/` are **intentionally not created yet** (YAGNI) — add on
  first genuine need, not preemptively.

## Styling

- SCSS everywhere (`inlineStyleLanguage: scss`, component schematic `style: scss`).
- Bootstrap 5 utilities/components first (see `design-guidelines.md`).
