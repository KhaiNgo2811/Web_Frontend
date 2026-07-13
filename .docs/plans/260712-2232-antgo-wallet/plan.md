# AntGo Wallet Implementation Plan

## Objective

Add a protected, interactive `/wallet` destination to the marketplace shell. The page includes every section from the Stitch reference, but uses AntGo's design system, Bootstrap Icons, existing repositories, Signals, and local mock persistence.

## Product Behavior

- Show the authenticated user's token balance, today's earnings, current check-in streak, and recent activity.
- Daily check-in grants 10 tokens once per local calendar day; the seventh consecutive day grants 20 tokens and restarts the weekly progress.
- Mock video rewards grant 5 tokens up to three times per local calendar day.
- Seed three one-time system tasks and one referral reward; completed rewards cannot be claimed again.
- Load active token packages from `BusinessConfig.tokenPackages`. Confirming a mock purchase adds package tokens plus the configured bonus and creates a ledger entry.
- Let users choose one of their own active posts and boost it for 1, 3, or 7 days at 50, 120, or 200 tokens. Validate ownership, duplicate active boosts, and balance before committing.
- Offer Basic, Professional, and Featured provider plans at 500, 1,200, and 2,000 tokens. A confirmed purchase replaces the user's active plan and records the transaction.
- Every successful mutation updates the balance and appends an immutable transaction atomically. Transaction history UI is deferred to the Account section.
- Use accessible confirmation dialogs for purchases, boosts, and plans. Surface pending, success, failure, completed, limit-reached, and insufficient-balance states.

## Data And Architecture

- Add typed wallet models for summaries, transactions, earning activities, boosts, subscriptions, commands, and filters.
- Add `WalletRepository` to the repository contracts, a `LocalWalletRepository`, and provider registration in `provideAntgoCore()`.
- Extend `MockDatabaseData` and deterministic seed data with wallet collections. Increment the mock database schema version and collection validation list.
- Keep `User.tokenBalance` as the source of truth. Wallet collections store ledger and feature state, not a duplicate balance.
- Add a root-provided `WalletStore` using Signals for the loaded summary, operation state, selected boost inputs, confirmation state, and user-facing feedback.
- Use the current authenticated `SessionStore` user ID for all repository commands. Refresh wallet state after each successful operation.

## UI Structure

- Add lazy `/wallet` route under `MainLayout`, guarded by `authGuard`, and add the `Ví Ant Xu` navigation link after Messenger.
- Build `features/wallet/wallet-page` as a standalone component with separate HTML and SCSS.
- Reuse `.ant-container`, `.ant-btn`, global typography, `--ant-*` tokens, and Bootstrap Icons. Do not port the reference header, footer, emoji, fonts, or CSS variables.
- Use a compact balance banner followed by a desktop dashboard: earning activities and token packages first, then a focused two-column promotion workspace.
- Render daily check-in as a seven-day reward strip. Today is the only active gift box; claiming it flips the day into an opened reward state.
- Route task rewards with real app flows: first demand post goes to `/posts/new/request`, first proposal goes to `/feed`, referral opens a share dialog, and profile completion remains a direct claim.
- Center the three Ant Xu package options in the purchase section.
- Cards represent actual repeated actions only. Avoid nested cards and decorative gradients beyond the balance surface and coin accent.
- Optimize for the existing 1200px shell; collapse four/three-column grids progressively without horizontal overflow.

## Accessibility And Failure Handling

- Use semantic sections, articles, headings, tables, form controls, and real buttons.
- Give icon-only controls accessible names; decorative icons use `aria-hidden`.
- Dialogs trap focus, close on Escape/backdrop, restore invoking focus, and expose title/description associations.
- Announce successful and failed operations through an `aria-live` region.
- Disable invalid actions while pending and preserve repository validation messages in the UI.

## Verification

- Repository tests: initial summary, persistence, check-in and ad limits, one-time rewards, package bonus, insufficient balance, post ownership, duplicate boost, subscription replacement, and ledger ordering.
- Component/store tests: loading, selections, confirmation lifecycle, success/error feedback, and disabled states.
- Route and shell checks: wallet is lazy, protected, navigable, and active in primary navigation.
- Run `npm test`, `npm run lint`, and `npm run build`.
- Inspect desktop and narrow layouts for text containment, grid collapse, keyboard focus, dialog behavior, and horizontal overflow.

## Boundaries

- No real payment gateway, advertising SDK, backend API, referral delivery, or subscription renewal.
- Desktop receives primary polish. The wallet content remains usable on narrow screens, but global mobile navigation redesign is out of scope.
- The mandatory `.Codex/workflows/*.md` paths referenced by `AGENTS.md` are absent; the repository README, `.docs`, and checked-in patterns are authoritative.
