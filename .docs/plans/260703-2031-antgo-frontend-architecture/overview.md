# AntGo Frontend — Architecture & Implementation Plan

_Created 2026-07-03 · Phase: BA / design · Status: plan (no code yet)_

Brainstorm output. Defines the overall Angular 22 FE architecture for **AntGo**
(community service marketplace). Code starts **after Figma design is ready** —
this plan is the contract Figma screens get mapped onto.

## Docs in this plan

| File | What |
|---|---|
| `overview.md` | This — problem, locked decisions, build order, open questions |
| [`frontend-architecture.md`](./frontend-architecture.md) | Layers, folders, data-layer seam (Express-ready), routing, state, faking backend, shared UI + screen map |
| [`domain-model.md`](./domain-model.md) | Entities / enums / relationships, traced to business-rule codes |

## Problem statement

Build a **client-side Angular 22 SPA** that walks stakeholders through AntGo's
full business process using **mock data**. Backend-heavy features (escrow,
tokens, weighted reputation, OTP, auto-timers) are **visualized, not computed**.
Purpose = design/UX validation + a foundation whose data layer can migrate to a
real Express REST API with no caller changes.

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Goal = design/UX exploration.** Screens + navigation are the product. | User confirmed. Invest in shared UI + nav map, not runtime robustness. |
| D2 | **Mock persistence = localStorage**, seeded from TS consts. | Stateful multi-step demos survive reload; no server needed. |
| D3 | **Data layer = repository pattern, Express-REST-migration-ready. No dead/commented code.** | User's explicit requirement. Swap = one provider line, callers untouched. See arch doc §3. |
| D4 | **State = Angular Signals only.** No NgRx. | Repo standard already in force. |
| D5 | **Bootstrap 5 CSS-first**, add ng-bootstrap JS only when an interactive widget is truly needed. | Existing design-guidelines. |
| D6 | **Fake backend-weighted funcs** (OTP `000000`, token = signal number, reputation precomputed, timers via a dev "fast-forward" control). | YAGNI — don't simulate money/crypto/schedulers in a design demo. |
| D7 | **Flows not pre-selected.** All 7 functional groups modeled in domain + arch; screens built per Figma when ready. | User deferred flow scoping to Figma. |

## Suggested build order (once Figma lands)

Not committed — order screens by Figma readiness. Recommended dependency spine:

1. **Foundation** — `core/` (models, mock db, stores, repositories, guards), `layout/` shell + navbar, `shared/` primitives (post-card, star-rating, status-badge, empty-state).
2. **Core marketplace loop** — auth/OTP → feed+search+filter → create post (both flows) → accept → order lifecycle → two-way complete → review. The demo spine.
3. **Messaging** — per-order chat, image/QR share.
4. **Token & monetization** — balance, buy, priority listing, profile promo, verified badge, escrow toggle.
5. **Admin & complaints** — dashboard, moderation, user lock, 7-step complaint workflow, business-param config screen.

## Explicitly out of scope (YAGNI)

- Real HTTP / Express backend (only the migration seam is designed now).
- Real auth, JWT, real OTP delivery.
- Real payment / money movement / token purchase settlement.
- Real schedulers for 24h-expiry / 12h-auto-complete (faked via fast-forward).
- SSR, i18n framework, NgRx, design-token system (add on genuine need).

## Open questions (resolve before/with Figma)

1. **Region partitioning (BR-ADM-01)** — demo single region, or show multi-region admin switching? Affects admin screens + mock seed.
2. **Escrow + token depth** — full monetization screens, or just badges/states to prove the rule exists? Affects feature breadth.
3. **Mobile-first vs responsive-desktop** — target form factor drives layout/nav (mobile tab-bar vs top nav). Docs read mobile-first ("ứng dụng"); confirm.
4. **Reset control** — expose a "Reset demo data" button (recommended for live demos) alongside localStorage persistence? (D2 implies session persistence; confirm reset UX.)
