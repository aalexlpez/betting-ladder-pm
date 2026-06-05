# Codex Context Index

Purpose: route Codex to the smallest useful context pack and avoid multiple sources of truth.

Canonical repository notice: this repository version is canonical. Earlier generated packs, Day 1 variants, files under `docs/archive/`, and superseded status reports are non-canonical implementation context unless explicitly requested.

## Documentation authority model

Use this hierarchy when documents appear to overlap:

| Authority level | Files | What they control |
|---|---|---|
| Current state and next action | `docs/ai/context-handoff.md` | The only detailed current phase, validation status, blockers, and next-action source. |
| Context routing | `AGENTS.md`, `docs/START_HERE_FOR_CODEX.md`, this file | Entry rules and the smallest route to read; these files point to the handoff rather than redefining the roadmap. |
| Goal prompts | `docs/ai/CODEX_GOALS.md`, task packs under `docs/ai/` | Reusable goal templates. They do not prove a goal is current or complete. |
| Canonical decisions | Product, architecture, legal, spec, and ADR files listed in the source map below | Stable product/technical/legal decisions and acceptance definitions. |
| Support and research | `docs/research/`, landing/desktop resource notes, review roles, source-quality notes | Evidence and implementation support. They must defer to canonical decisions and the handoff. |
| Historical/status traceability | `docs/status/`, `docs/launch/` reports/checklists where marked, time logs, daily reports | Human-readable history and evaluator evidence. They are not implementation authority for the current next action. |
| Archived/superseded | `docs/archive/` | Not implementation context unless a human explicitly asks for historical reconstruction. |

Only `docs/ai/context-handoff.md` may define the current next action. If another active document needs to mention next work, it should point to the handoff instead of restating the roadmap.

## Always read

- `AGENTS.md`
- `docs/START_HERE_FOR_CODEX.md`
- `docs/ai/context-handoff.md`
- this file

## Canonical Source Map

| Topic | Canonical source | Notes |
|---|---|---|
| Product mission, user, success definition | `docs/product/PROJECT_BRIEF.md` | Other docs may summarize only. |
| MVP scope and out-of-scope boundaries | `docs/product/MVP_SCOPE.md` | Scope changes require ADR or explicit update here. |
| Architecture and package boundaries | `docs/architecture/SYSTEM_ARCHITECTURE.md`, `docs/architecture/MONOREPO_STRUCTURE.md`, `docs/architecture/DEPENDENCY_BOUNDARIES.md` | Keep provider logic out of `packages/core`. |
| Desktop platform, runtime security, commands, packaging | `docs/architecture/DESKTOP_PLATFORM_DECISION.md`, `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`, `docs/adr/ADR-0002-desktop-first-tauri.md`, `docs/adr/ADR-0009-bootstrap-stack-and-quality-gates.md` | Tauri is the active desktop platform. |
| Providers, market data, market selection | `docs/specs/MARKET_DATA_SPEC.md`, `docs/specs/MARKET_SELECTION_SPEC.md`, `docs/adr/ADR-0004-dual-venue-polymarket-kalshi.md` | Polymarket and Kalshi are both in the base design. |
| Order semantics and domain tests | `docs/specs/ORDER_ENTRY_SEMANTICS.md`, `docs/specs/RISK_POLICY_SPEC.md`, `docs/specs/AUDIT_LOG_SPEC.md` | Domain stays deterministic and provider-neutral. |
| Financial metrics | `docs/specs/FINANCIAL_METRICS_SPEC.md` | Source for PnL, available funds, open-order amount, exposure, and provider/market breakdowns. |
| Live execution and approval gates | `docs/specs/LIVE_EXECUTION_SPEC.md`, `docs/legal/LEGAL_OPERATING_MODEL.md`, `docs/legal/LIVE_TRADING_APPROVAL_GATE.md` | Live risk-increasing actions remain blocked by default. |
| Monetization | `docs/product/MONETIZATION_MODEL.md`, `docs/adr/ADR-0010-fair-monetization-model.md` | Fees/revenue share are a preferred hypothesis, disabled by default. |
| Desktop UI/product design | `docs/desktop/` route docs, `docs/adr/ADR-0008-desktop-terminal-design-and-skills.md` | Specialized terminal UI, not a generic dashboard. |
| Landing strategy and copy | `docs/landing/`, `docs/specs/LANDING_PAGE_SPEC.md`, `docs/legal/LEGAL_OPERATING_MODEL.md` | Landing is not a trading surface. |
| Localization and UI copy catalogs | `docs/specs/LOCALIZATION_SPEC.md`, `packages/i18n` | Localized labels are presentation content and must not redefine trading state or legal gates. |
| Codex workflow and quality gates | `docs/ai/CODEX_OPERATING_MODEL.md`, `docs/ai/CODEX_GOALS.md`, `docs/ai/QUALITY_GATES.md`, `docs/ai/SKILLS_REGISTRY.md` | Use one small goal at a time. |
| Launch readiness | `docs/launch/LAUNCH_READINESS_CHECKLIST.md`, `docs/launch/LIVE_SMOKE_TEST.md`, `docs/status/TIME_LOG.md` | Checklists and time logs are traceability/support artifacts; the handoff controls current next action. |

## Route 0 - Project baseline

Use for onboarding, repo bootstrap, or when unsure.

Read:

- `docs/product/ASSIGNMENT_TRACEABILITY.md`
- `docs/product/PROJECT_BRIEF.md`
- `docs/product/MVP_SCOPE.md`
- `docs/architecture/MONOREPO_STRUCTURE.md`
- `docs/legal/LEGAL_OPERATING_MODEL.md`
- `docs/ai/CODEX_OPERATING_MODEL.md`

## Route A - Product, GTM, and monetization

Use for product decisions, user focus, MVP changes, pricing, positioning, or daily reports.

Read:

- `docs/product/ASSIGNMENT_TRACEABILITY.md`
- `docs/product/PROJECT_BRIEF.md`
- `docs/product/MVP_SCOPE.md`
- `docs/product/USER_AND_GTM.md`
- `docs/product/MONETIZATION_MODEL.md`
- `docs/research/COMPETITIVE_LANDSCAPE.md`
- `docs/research/SOURCE_QUALITY_POLICY.md`

## Route B - Architecture, stack, and monorepo

Use for package boundaries, app structure, build system, dependency decisions, quality gates, or ADR changes.

Read:

- `docs/architecture/MONOREPO_STRUCTURE.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/architecture/DEPENDENCY_BOUNDARIES.md`
- `docs/architecture/DESKTOP_PLATFORM_DECISION.md`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`
- `docs/adr/ADR-0002-desktop-first-tauri.md`
- `docs/adr/ADR-0003-monorepo-pnpm-turborepo.md`
- `docs/adr/ADR-0009-bootstrap-stack-and-quality-gates.md`

## Route C - Domain core, financial metrics, and risk

Use for ladder, order book normalization, trade intents, account metrics, risk policy, audit events, and deterministic tests.

Read:

- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/ORDER_ENTRY_SEMANTICS.md`
- `docs/specs/RISK_POLICY_SPEC.md`
- `docs/specs/FINANCIAL_METRICS_SPEC.md`
- `docs/specs/LIVE_EXECUTION_SPEC.md`
- `docs/specs/AUDIT_LOG_SPEC.md`
- `.agents/skills/domain-tdd-ladder/SKILL.md`

## Route D - Provider adapters

Use for Polymarket/Kalshi market discovery, market data, official SDK/source-of-truth client decisions, WebSocket/polling, authentication, account metrics, order placement, cancellation, or paid routing.

Read:

- `docs/specs/MARKET_DATA_SPEC.md`
- `docs/specs/MARKET_SELECTION_SPEC.md`
- `docs/specs/FINANCIAL_METRICS_SPEC.md`
- `docs/specs/LIVE_EXECUTION_SPEC.md`
- `docs/adr/ADR-0004-dual-venue-polymarket-kalshi.md`
- `.agents/skills/polymarket-live-adapter/SKILL.md` if touching Polymarket
- `.agents/skills/legal-live-safety-gate/SKILL.md` if touching credentials, live execution, or account data

## Route E - Tauri desktop shell engineering

Use for Tauri app startup, Windows packaging, command/capability boundaries, local settings, secure providers, and app shell work.

Read:

- `docs/architecture/DESKTOP_PLATFORM_DECISION.md`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`
- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/DESKTOP_APP_SPEC.md`
- `.agents/skills/tauri-desktop-shell/SKILL.md`

If the task is primarily visual/product design for the desktop app, use Route J instead or in addition.

## Route F - Legal, live gates, and safety

Use for any live execution, credential, geo, account, jurisdiction, custody, KYC, risk-limit, or paid-routing task.

Read:

- `docs/legal/LEGAL_OPERATING_MODEL.md`
- `docs/legal/LIVE_TRADING_APPROVAL_GATE.md`
- `docs/specs/RISK_POLICY_SPEC.md`
- `docs/specs/FINANCIAL_METRICS_SPEC.md`
- `docs/specs/ORDER_ENTRY_SEMANTICS.md`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md` if credentials or desktop commands are touched
- `docs/adr/ADR-0005-legal-governance.md`
- `.agents/skills/legal-live-safety-gate/SKILL.md`

## Route G - Codex process, goals, review roles, and quality gates

Use for AI workflow, context compaction, task packs, review, skills, prompts, and quality gates.

Read:

- `docs/ai/CODEX_OPERATING_MODEL.md`
- `docs/ai/CODEX_GOALS.md`
- `docs/ai/SKILLS_REGISTRY.md`
- `docs/ai/REVIEW_ROLES.md`
- `docs/ai/QUALITY_GATES.md`

## Route I - Landing page, brand, and conversion

Use for marketing landing page strategy, hero copy, visual design, product mockups, CTA, competitor differentiation, conversion review, or landing UI implementation.

Read:

- `docs/landing/LANDING_PAGE_BRIEF_FOR_CODEX.md`
- `docs/landing/LANDING_PAGE_STRATEGY.md`
- `docs/landing/LANDING_COPY.md`
- `docs/landing/LANDING_DESIGN_SYSTEM.md`
- `docs/landing/LANDING_IMPLEMENTATION_SPEC.md`
- `docs/specs/LANDING_PAGE_SPEC.md`
- `docs/landing/COMPETITOR_LANDING_NOTES.md`
- `docs/legal/LEGAL_OPERATING_MODEL.md` if editing legal/live-trading copy
- `docs/adr/ADR-0007-landing-page-design-and-skills.md`
- `.agents/skills/landing-conversion-strategist/SKILL.md`
- `.agents/skills/frontend-design/SKILL.md`

## Route J - Desktop terminal product design

Use for non-generic Tauri desktop app UX, trading-terminal visual design, ladder workspace composition, Windows desktop interaction patterns, hotkeys, status surfaces, risk/live-state UI, metrics UI, audit/blotter UI, or desktop design review.

Read:

- `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
- `docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md`
- `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
- `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
- `docs/desktop/DESKTOP_APP_COMPETITIVE_UI_NOTES.md`
- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/RISK_POLICY_SPEC.md`
- `docs/specs/FINANCIAL_METRICS_SPEC.md`
- `docs/legal/LEGAL_OPERATING_MODEL.md` if editing legal/live-state UI
- `docs/architecture/DESKTOP_PLATFORM_DECISION.md`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`
- `docs/adr/ADR-0008-desktop-terminal-design-and-skills.md`
- `.agents/skills/desktop-terminal-design/SKILL.md`
- `.agents/skills/tauri-desktop-shell/SKILL.md`

Use additionally when relevant:

- `.agents/skills/tauri-windows-native-polish/SKILL.md` for native-feeling desktop shell polish, menus, window behavior, shortcuts, and packaging cues.
- `.agents/skills/tauri-ux-quality-review/SKILL.md` after implementation.
- `.agents/skills/legal-live-safety-gate/SKILL.md` if changing live/risk/credential/geo/legal surfaces.
- `.agents/skills/release-readiness-review/SKILL.md` if preparing demo/release.

Forbidden in Route J:

- generic SaaS dashboard layout;
- fake PnL, fake win-rate, fake account balances, fake usage metrics, or profit claims;
- AI signals, bots, copy trading, or automated strategy controls;
- live order submission without Route F and approval gates;
- credentials/secrets in UI, logs, or screenshots;
- renderer access to unrestricted filesystem, shell/process, provider SDKs, or Tauri commands;
- hidden hotkeys that can submit live orders.

## Common task packs

### Bootstrap repo

Route 0 + Route B + `docs/adr/ADR-0009-bootstrap-stack-and-quality-gates.md` + `docs/ai/CODEX_GOALS.md#goal-01--repo-bootstrap`

### Build domain core

Route C + `docs/ai/CODEX_GOALS.md#goal-02--domain-core-with-tests`

### Build Tauri shell

Route E + `docs/ai/CODEX_GOALS.md#goal-03--tauri-desktop-shell-with-provider-ready-states`

### Add normalized multi-venue contracts

Route B + Route C + Route D + `docs/ai/CODEX_GOALS.md#goal-04a--normalized-multi-venue-contracts`

### Add complete provider read-only live data

Route D + `docs/ai/CODEX_GOALS.md#goal-04--complete-provider-read-only-data`

### Add official provider runtime and WebSocket streaming

Route B + Route D + Route E + Route F + `docs/ai/CODEX_GOALS.md#goal-04b--official-provider-runtime-and-websocket-streaming`

### Add unified multi-venue desktop market experience

Route D + Route E + Route J + `docs/ai/CODEX_GOALS.md#goal-04c--unified-multi-venue-desktop-market-experience`

### Add paper/live-dry-run order intent and audit log

Route C + Route F + `docs/ai/CODEX_GOALS.md#goal-05--paper-live-dry-run-audit-log`

### Add gated real live execution vertical slice

Route D + Route F + `docs/ai/CODEX_GOALS.md#goal-06--gated-live-execution-vertical-slice`

### Build differentiated landing page

Route I + `docs/ai/CODEX_GOALS.md#goal-07--landing-page-strategy-and-implementation`

### Build differentiated desktop terminal UI

Route J + `docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md` + `docs/ai/CODEX_GOALS.md#goal-09--desktop-terminal-design-pass`

### Release review

Route A + Route B + Route F + `docs/launch/LAUNCH_READINESS_CHECKLIST.md`
