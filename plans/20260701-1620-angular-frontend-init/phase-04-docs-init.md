# Phase 04 — Docs Init

## Context links
- Overview: [plan.md](./plan.md)
- Previous: [phase-03-verification-build.md](./phase-03-verification-build.md)

## Overview
- Date: 2026-07-01
- Description: create `.docs/` structure per CLAUDE.md, populated from the now-existing scaffold (not placeholders)
- Priority: medium (not blocking app functionality, but required by CLAUDE.md's documentation-management rule)
- Implementation status: not started
- Review status: not reviewed

## Key Insights
- CLAUDE.md mandates a fixed `.docs/` structure, kept up to date over time — done last (not Phase 1) since there's nothing real to document until the scaffold, folder structure, and tooling choices from Phases 1-3 actually exist.
- Per `primary-workflow.md`, docs updates are normally delegated to the `docs-manager` agent — same applies here at execution time.
- Content should reflect actual decisions made (Angular 22.x, Bootstrap 5, Signals, npm, feature-based folders), not generic boilerplate — each doc's job is to save a future session from re-deriving these choices by reading code.

## Requirements
- `.docs/` folder created at repo root with all 7 files listed in CLAUDE.md's structure
- Each file has real, specific content about this project (not templates left empty)
- No duplication with plan files in `plans/` — `.docs/` is the durable/current-state record, `plans/` is the historical record of how it got there

## Architecture
```
.docs/
├── project-overview-pdr.md   (what this app is/does, initial scope: SPA frontend)
├── code-standards.md         (kebab-case naming, <200 line files, ESLint+Prettier rules, standalone components, Signals-only state — mirrors development-rules.md but frontend-specific)
├── codebase-summary.md       (folder structure: core/shared/features, routing pattern, environments)
├── design-guidelines.md      (Bootstrap 5 usage conventions, no custom design system yet — flag as TBD until real UI work starts)
├── deployment-guide.md       (npm build commands, prod build via `ng build --configuration production`, no CI/CD or hosting decided yet — flag as TBD)
├── system-architecture.md    (SPA, no backend integration yet, no SSR, Angular 22.x + Bootstrap 5 + Signals stack)
└── project-roadmap.md        (this init task as milestone 1; next milestones TBD pending real feature requirements)
```

## Related code files
- All 7 files above, new, under `.docs/`
- No existing code files modified in this phase

## Implementation Steps
1. Delegate to `docs-manager` agent (per `primary-workflow.md` convention) to draft the 7 files, using Phases 1-3's actual implementation as source of truth (read `angular.json`, `package.json`, folder layout at execution time — do not guess).
2. For docs where no real decision exists yet (deployment target, design system, roadmap beyond init), explicitly mark as "TBD — revisit when [X] is decided" rather than inventing content — avoids stale/fabricated docs.
3. Cross-link `.docs/codebase-summary.md` and `.docs/system-architecture.md` back to this plan folder (`plans/20260701-1620-angular-frontend-init/`) for historical context, per this plan's "no duplication" rule.
4. Review generated docs for accuracy against actual repo state (folder names, script names, versions) before considering phase done.

## Todo list
- [ ] Create `.docs/` folder
- [ ] Write `project-overview-pdr.md`
- [ ] Write `code-standards.md`
- [ ] Write `codebase-summary.md`
- [ ] Write `design-guidelines.md` (mark TBD sections explicitly)
- [ ] Write `deployment-guide.md` (mark TBD sections explicitly)
- [ ] Write `system-architecture.md`
- [ ] Write `project-roadmap.md`
- [ ] Cross-link back to this plan folder

## Success Criteria
- All 7 files exist under `.docs/` with real, current content (verified against actual `angular.json`/`package.json`/folder tree, not assumed)
- No file left as an empty template
- TBD sections clearly marked as such, not silently omitted

## Risk Assessment
- Docs drift immediately if written before Phases 1-3 are actually done — mitigated by running this phase strictly last, reading real repo state at execution time
- Over-writing (adding content beyond what's decided, e.g. inventing a deployment target) would violate YAGNI/accuracy — mitigated by explicit TBD marking in step 2

## Security Considerations
- None — documentation only, no secrets/config values to redact (none exist at this stage)

## Next steps
Init task fully complete after this phase. Future work (out of scope): keep `.docs/` updated per `documentation-management.md` workflow as real features land.
