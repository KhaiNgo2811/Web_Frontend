# Project Roadmap

_Last updated: 2026-07-11._

## Milestone 1 - Angular frontend scaffold - DONE

- Angular 22 standalone SPA.
- ESLint, Prettier, SCSS, Bootstrap 5, Vitest + jsdom.
- `.docs/` documentation set created.

## Milestone 2 - AntGo marketplace MVP - DONE

- Auth, feed, posts, orders, messages, notifications, account view.
- Local repository/mock DB architecture.
- AntGo tokens, typography, and marketplace UI styling.

## Milestone 3 - Trust & support admin workspace - DONE

- Guarded `/admin` workspace with dashboard, inbox, account management, moderation, complaint workflow, business configuration, and audit log.
- Seeded admin account: `admin@antgo.vn` / `AntGoAdmin123!`.
- Four implemented staff roles: `support_agent`, `moderator`, `complaint_reviewer`, and `super_admin`; local repository commands enforce their declared permissions.
- System-wide admin dashboard; no global region selector in the current shell.
- Moderation hides/restores posts, reviews, and messages from user-facing views.
- Complaint repository exposes explicit stage actions; route-driven moderation and complaint drawers are available with keyboard/backdrop close paths, direct deep links, and invalid-ID states. Appeal review requires a different reviewer from the original decision-maker.
- Inbox supports open/unassigned/SLA-risk views and bulk assignment. Audit events and queued, default-redacted CSV export requests persist in MockDb schema v4.
- Configuration is restricted to `super_admin` and configuration changes produce local audit events.
- Carbon-inspired admin interaction upgrade completed without adding a behavior runtime dependency: shared accessible drawers/confirmations, data states, pagination, staff selectors, segmented controls, toast/live feedback, and operation-state store signals are in place. Tabler is installed as compiled CSS for admin card, list, badge, and progress styling.
- The admin shell now provides Vietnamese contextual route titles, skip navigation, current-page semantics, a collapsible sidebar, narrow-browser collapsed rail fallback, and an account menu. Operational table views standardize filtering, sorting, refresh, pagination, detail controls, and explicit loading/error/empty/no-result states.
- Inbox batch assignment/selection, state-valid moderation actions, report/complaint progress visualization, isolated complaint drafts and keyboard tabs, linked cockpit dashboard queues, query-linked user safety details, configuration dirty/discard/restore handling, and confirmed audit export management are implemented with Vietnamese UI labels.
- Browser checks cover `/admin`, `/admin/audit`, `/admin/moderation`, and `/admin/complaints` at 1440px, 1200px, and the narrow-sidebar regression width.
- The backend-contract reference is documented in `admin-api-contract.md`; HTTP adapters and a configured backend are not present.
- Future `/admin/regions` map-based management remains planned; no route or nav item is registered yet.

## Next candidates

- HTTP repository implementations and server-side authorization/session integration.
- Asynchronous export generation/download, not just the local request state.
