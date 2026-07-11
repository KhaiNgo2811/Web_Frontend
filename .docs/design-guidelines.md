# Design Guidelines

_Last updated: 2026-07-11._

## Foundation

- Bootstrap CSS is loaded first, Tabler CSS is loaded after Bootstrap, and AntGo SCSS tokens and component styles layer on top.
- Global tokens live in `src/styles/_tokens.scss`.
- Typography:
  - headings: Baloo 2
  - body/UI: Be Vietnam Pro
- Desktop-first operational layouts are optimized for `1200px`, with a narrow fallback that collapses the admin sidebar and keeps primary content visible.

## AntGo visual system

- Warm app background, white operational surfaces, soft borders, compact spacing.
- Orange is reserved for primary actions and active navigation.
- Semantic colors:
  - green: success/active
  - red: locked/destructive
  - yellow: warning/high-priority
  - blue: informational
- Cards and panels should stay restrained; use them for actual grouped tools, rows, and detail panels.

## Admin workspace

- Direction: warm operational control desk.
- Carbon is an interaction reference only, not a runtime dependency. Tabler is an installed CSS dependency for Bootstrap-compatible admin surfaces; do not use Tabler or Bootstrap JavaScript. Preserve AntGo's warm identity while using compact spacing, flatter surfaces, stronger borders, and explicit hover, focus, selected, pending, success, and failure states.
- All visible admin information and accessibility labels are Vietnamese. Keep repository enums and URL values internal, and map them to Vietnamese display labels in the UI.
- Admin shell uses:
  - dark ink sidebar
  - orange active nav states
  - compact tables
  - right-side detail panels for repeated workflows
  - dense filters/toolbars for scanning and batch-like work
- Admin navigation must retain the skip link, contextual route title, current-page semantics, collapsible sidebar labels/tooltips, and keyboard-dismissable account menu.
- Operational tables should provide search and relevant filters, result counts, active-filter feedback, clear and refresh actions, sortable headers with `aria-sort`, sticky headers, explicit row-detail controls, client-side pagination, and separate loading, refresh, error, empty, and no-result feedback.
- Prefer the existing admin shared controls for confirmation dialogs, drawers, data states, pagination, segmented choices, staff selectors, and toast/live announcements.
- Do not add a global region selector to the current admin shell; region management is future dedicated workspace scope.
- Admin account, moderation, and complaint details use query-param right drawers. Drawers and confirmation dialogs must trap focus, close on Escape/backdrop, isolate background content, restore focus on close, and preserve unrelated query parameters where route-linked.
- Complaint workflow controls are stage-specific. Show only the currently valid action form, keep repository validation visible inline, and render evidence as escaped text plus validated `https:` links only.
- Dashboard panels need explicit empty/loading/error states and must remain usable at the supported 1200px admin width.
- No Bootstrap JS, Tabler JS, Tailwind, NgModules, or NgRx.
- Keep interactive controls keyboard reachable and preserve Escape/confirmation behavior where dialogs or destructive actions are added.
