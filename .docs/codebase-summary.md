# Codebase Summary

_Last updated: 2026-07-11._

## Current shape

- Angular 22 client SPA using standalone components, lazy `loadComponent` routes, Signals, RxJS repositories, SCSS, Bootstrap CSS, and Tabler CSS for admin surface patterns.
- App routes now include public/auth marketplace views plus a guarded admin workspace under `/admin`.
- `src/app/core/` contains durable domain models, mock DB persistence, repository abstractions/local implementations, guards, and signal stores.
- `src/app/shared/` contains reusable marketplace UI primitives such as logo, empty state, post card, star rating, status pill, and dialog. Admin-specific shared controls live under `features/admin/shared/` and include accessible drawers/confirmation dialogs, data states, pagination, segmented controls, staff selection, and toast regions.
- `src/app/features/admin/` contains the operational admin shell and pages for dashboard, inbox, account management, moderation, complaints, configuration, and audit.

## Admin workspace

- Every admin child route declares a Vietnamese browser title and contextual shell heading. The shell adds skip navigation, `aria-current` navigation, a collapsible sidebar with compact icon labels, a narrow-browser collapsed rail fallback, and an Escape-aware account menu.
- Users, Inbox, Moderation, Complaints, and Audit use compact operational tables with Vietnamese search/filter controls, result and active-filter feedback, refresh actions, keyboard-operable sorting, sticky headers, client-side pagination, explicit detail controls, and distinct loading/error/empty/no-result states.
- Internal enum and repository values remain unchanged; admin pages translate statuses, stages, actions, target types, roles, priorities, and workflow feedback at the presentation boundary.

- Routes:
  - `/admin`
  - `/admin/users`
  - `/admin/inbox`
  - `/admin/moderation`
  - `/admin/complaints`
  - `/admin/config`
  - `/admin/audit`
- Guard behavior:
  - unauthenticated users go to `/auth/login?returnUrl=<requested admin url>`
  - authenticated non-admin users go to `/feed`
  - the admin shell accepts the four staff roles below; Configuration and Audit additionally require their route permissions
- Seeded admin login:
  - `admin@antgo.vn`
  - `AntGoAdmin123!`

## Data layer

- `MockDb` persists to `localStorage` under `antgo.mock-db`; schema version is `4`. Malformed or version-mismatched data is reset to the deterministic seed.
- Admin collections: `regions`, `businessConfig`, `moderationReports`, `complaints`, `adminAccountActivities`, `auditEvents`, and `exportJobs`.
- Admin repositories:
  - `AdminUserRepository`
  - `ModerationRepository`
  - `ComplaintRepository`
  - `ConfigRepository`
  - `InboxRepository`
  - `AuditRepository`
- Local providers implement those contracts; no HTTP adapter or configured backend exists.
- Admin dashboard totals are system-wide. It provides 7/30/90-day KPI comparisons, activity trends, complaint SLA workload, marketplace health, ownership split, complaint pipeline, moderation matrix, region/category mix, recent operational activity, explicit panel states, and deep links to selected records. Region data remains seeded for future management, but the current admin shell has no global region selector.
- Moderation and complaint records open from query-param URLs in a shared right-side drawer. Moderation detail includes typed target context and history; the complaint drawer exposes overview, evidence, timeline, and decision tabs plus stage-specific workflow controls.
- User-facing post/message/review queries filter hidden moderated content.
- Inbox combines pending moderation reports and unresolved complaints. It supports the `all_open`, `unassigned`, and `breach_risk` views, SLA/assignment filtering, urgency ordering, and bulk assignment with an optional handoff note.
- Inbox additionally supports tri-state page selection, select/deselect-all controls, a batch action bar, and a staff selector instead of free-form staff IDs. Moderation restricts controls to valid report-state actions, shows report lifecycle progress in the detail drawer, and confirms consequential changes. Complaint drawers show stage progress, reset drafts on record/stage changes, use keyboard tabs, structured notification channels, staff selection, inline validation, and confirmations.
- Audit is a super-admin route. Local command paths append typed `AuditEvent` records for implemented account restriction, moderation, complaint, configuration, and inbox-assignment actions. Events are exposed as an append-only audit collection; no repository update or delete operation exists.
- Dashboard KPIs, workload rows, and priority records link into filtered work queues; chart metric controls expose a live selected-value summary. User safety details open in a query-linked drawer with reason-based restrict/unlock confirmation. Configuration supports constrained package editing/removal, dirty/discard feedback, inline errors, and confirmed restore; success appears only after repository completion. Audit exposes actor/action/target filters, event disclosure, manual refresh, export confirmation, and export-job status.
- A super-admin can enqueue a local CSV audit export request. The resulting `ExportJob` starts `queued`, has default redaction, and records a seven-day retention deadline; this demo does not generate or download a file.

## Admin authorization

Permission checks are applied in the guard where a route has a declared requirement and again in local repository commands. The roles are:

| Role                 | Implemented access                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `support_agent`      | Read users, moderation, and complaints; assign moderation and complaints.                                                        |
| `moderator`          | Read users and complaints; read, assign, hide, restore, or dismiss moderation reports.                                           |
| `complaint_reviewer` | Read users and moderation; read, assign, and decide complaint workflow actions.                                                  |
| `super_admin`        | All implemented admin permissions, including user restrictions, configuration changes, audit viewing, and audit-export requests. |

`/admin/config` requires `configuration.manage`; `/admin/audit` requires `audit.read`. Both permissions are currently granted only to `super_admin`.

## Testing

- Test runner: Angular unit test builder with Vitest + jsdom.
- Current coverage includes seeded auth, marketplace repositories, admin guard, admin repositories, and shared components.
