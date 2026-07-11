# Trust & Support Admin API Contract

_Status: backend-ready contract reference only. The application currently uses local repository adapters backed by `MockDb`; no HTTP client, API endpoint, or backend authorization service is configured._

## Purpose and boundary

This contract is the replacement boundary for the existing `AdminUserRepository`, `ModerationRepository`, `ComplaintRepository`, `InboxRepository`, `AuditRepository`, and `ConfigRepository` ports in `src/app/core/data/repositories.ts`. A server implementation is authoritative for authorization, policy, audit creation, data retention, and redaction. Client role checks remain a usability measure only.

## Resource and port mapping

| Repository port | Read operations                                                              | Commands                                                                                        |
| --------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Admin users     | list users, get user safety detail, list account activity, dashboard summary | restrict or unlock an account                                                                   |
| Moderation      | list/get reported content                                                    | assign, hide, restore, dismiss                                                                  |
| Complaints      | list/get case                                                                | assign, verify, request evidence, assess, decide remedy, notify, record response, appeal, close |
| Inbox           | list unified moderation/complaint work items                                 | bulk assign or unassign, with handoff note                                                      |
| Audit           | list audit events, list export jobs                                          | request audit export                                                                            |
| Configuration   | get business/SLA policy and regions                                          | save or restore configuration                                                                   |

Suggested HTTP resources are `/api/admin/users`, `/api/admin/moderation-reports`, `/api/admin/complaints`, `/api/admin/inbox`, `/api/admin/audit-events`, `/api/admin/audit-exports`, and `/api/admin/configuration`. Commands should be explicit `POST` operations beneath the affected resource (for example, `/api/admin/moderation-reports/{id}/commands/hide`), not generic record replacement.

## Pagination, sorting, and filters

- Collection reads accept opaque `cursor` and `limit`; default `limit` is 50 and the maximum is 100. A response is `{ data, page: { nextCursor? } }`.
- A cursor is server-generated and tied to the selected ordering/filter set. Clients must not parse or construct it.
- Every collection declares a stable default order. Inbox: SLA urgency, then priority, then oldest creation time. Audit: newest event first. Resource lists should return the selected `sort` in their response metadata.
- Filters use explicit, typed query parameters. Examples: `status`, `stage`, `priority`, `assignment`, `sla`, `actorId`, `action`, `targetType`, `search`, and `regionId`. Omitted filters mean no restriction; `all` is a UI value and should be omitted from API requests.
- Search is plain text, server-escaped, and never interpreted as markup or a query language unless a future documented grammar is added.

## Authorization and command rules

The authenticated principal comes from the server session/token. Request bodies must not supply a trusted `actorId`. The server must check an active staff role and permission for every read and command.

| Role                 | Server permissions to enforce                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `support_agent`      | Read users, moderation, and complaints; assign moderation and complaints.                                        |
| `moderator`          | Support-agent reads plus moderation assignment and reversible moderation actions.                                |
| `complaint_reviewer` | Read users/moderation/complaints; assign and decide complaint workflow actions.                                  |
| `super_admin`        | All implemented permissions, including user restriction, configuration management, audit read, and audit export. |

- A complaint appeal must be assigned to a reviewer different from the original remedy decision-maker.
- The server enforces complaint stage order, deadlines, acceptance/expiry closure, required moderation notes, and safe evidence-link handling. Evidence URLs must be validated as allowed HTTPS destinations and rendered as untrusted data.
- Commands return the updated resource plus a request/correlation identifier. Authorization failures return `403`; an unauthenticated request returns `401`; policy/state conflicts return `409` with a stable machine-readable code.

## Idempotency and auditability

- Every mutating command requires an `Idempotency-Key` header scoped to the authenticated actor, command type, and target. Retrying the same key returns the original successful result; reusing it with a different request body returns `409`.
- A successful state-changing command creates an immutable `AuditEvent` in the same server-side transaction. Events have an ID, actor, action, target type/id, timestamp, reason where applicable, and a redacted before/after summary.
- Audit events are append-only. There is no client API to update or delete an event, and a request cannot nominate its audit actor or timestamp.
- The server retains the raw forensic record according to its documented retention policy; list and export responses expose only fields authorized for the requester.

## Audit export jobs

- Only `super_admin` may request or view audit exports.
- `POST /api/admin/audit-exports` enqueues an asynchronous job and returns `{ id, status: "queued", format: "csv", redaction: "default", retentionUntil }`. The request may include an audit filter, but the server re-applies authorization and redaction.
- Default redaction excludes sensitive personal data, free-form evidence contents, credentials, session material, and unnecessary before/after values. A future less-redacted mode requires an explicitly documented permission and purpose.
- A ready export is retrieved only through a short-lived, authorized download URL or a server-mediated download; it must carry retention metadata. Failed jobs expose a safe error code, not sensitive details.
- The current local implementation records only queued job state with default redaction and a seven-day retention deadline. It does not generate a CSV or download URL.

## Versioning and errors

- Publish the contract under a versioned path such as `/api/v1/admin/...`; incompatible changes require a new version.
- Error payloads use `{ error: { code, message, correlationId } }`. Messages are safe for staff display; diagnostics stay server-side.
- New server fields are additive and optional until a versioned breaking change. Clients ignore unknown fields.
