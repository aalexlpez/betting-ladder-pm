# Codex Goals

Use these as copy-pasteable Codex goals. Keep each task small and reviewable. Do not ask Codex to "build the app" in one pass.

## Implementation vertical slice priority

```txt
repo bootstrap
-> provider-neutral domain/risk/financial metrics tests
-> Tauri desktop shell wired to provider ports, with honest loading/empty/error states
-> complete real Polymarket and Kalshi read-only market data adapters
-> paper/live-dry-run order intent and audit log
-> gated real live place/cancel capability
-> landing static
-> release readiness
```

Real live execution is an intended capability and live smoke target, but it must remain gated. If gates cannot pass, the final state must show the exact blocker. Day 1 is closed at 8 logged hours; current implementation starts from Day 2.

## Goal 01 - Repo bootstrap

```txt
/goal Bootstrap the monorepo for the Prediction Ladder product.

Read first:
- AGENTS.md
- docs/START_HERE_FOR_CODEX.md
- docs/ai/CONTEXT_INDEX.md
- docs/ai/context-handoff.md
- docs/architecture/MONOREPO_STRUCTURE.md
- docs/architecture/DESKTOP_PLATFORM_DECISION.md
- docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md
- docs/adr/ADR-0002-desktop-first-tauri.md
- docs/adr/ADR-0003-monorepo-pnpm-turborepo.md
- docs/adr/ADR-0009-bootstrap-stack-and-quality-gates.md

Use skills:
- context-router
- monorepo-architect
- tauri-desktop-shell

Implement:
- configure real root commands: dev, desktop:dev, landing:dev, test, typecheck, lint, build, package:win
- configure Tauri + Vite + React + TypeScript for apps/desktop
- configure Vite + React + TypeScript static build for apps/landing
- configure TypeScript strict baseline
- configure Vitest baseline for packages/core
- configure ESLint + Prettier baseline
- keep real commands and replace missing tool/config blockers during bootstrap

Forbidden:
- no external API integration
- no live execution
- no private keys or secrets
- no provider-specific live trading implementation
- no UI polish beyond minimal boot screen

Acceptance criteria:
- pnpm install can run or blockers are documented
- lockfile is generated when dependencies are installed
- package versions are pinned or justified; avoid broad latest dependencies in committed manifests
- minimal entrypoints exist for desktop, landing, and core tests
- pnpm typecheck, pnpm lint, pnpm test, pnpm build run real commands, not TODO/echo placeholders
- docs/ai/context-handoff.md updated
```

## Goal 02 - Domain core with tests

```txt
/goal Implement the provider-neutral domain core for a live-ready betting ladder.

Read first:
- AGENTS.md
- docs/ai/CONTEXT_INDEX.md Route C
- docs/specs/FUNCTIONAL_SPEC.md
- docs/specs/ORDER_ENTRY_SEMANTICS.md
- docs/specs/RISK_POLICY_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md
- docs/specs/LIVE_EXECUTION_SPEC.md
- docs/specs/AUDIT_LOG_SPEC.md

Use skills:
- domain-tdd-ladder
- legal-live-safety-gate

Implement in packages/core:
- ProviderId = polymarket | kalshi
- ExecutionMode = disabled | paper | live_dry_run | live
- RiskClass = C0 | C1 | C2 | C3
- RiskActionClass = risk_increasing | risk_reducing
- DecimalString value validation helpers backed by `decimal.js` for internal arithmetic
- MarketRef, PriceLevel, OrderBookSnapshot, LadderRow
- FinancialMetrics and aggregation helpers for global/provider/market breakdowns
- OrderIntent, OrderSide, OrderType, TimeInForce
- exposure calculation helpers
- OrderSafetyPolicy validation with deterministic rejection reasons
- AuditEvent type
- deterministic tests for happy path and refusal paths

Forbidden:
- no network calls
- no SDKs
- no UI
- no live order submission
- no native JS floating point for stake/price/size/exposure/PnL/balance calculations

Acceptance criteria:
- `decimal.js` is used for internal domain arithmetic and all public results remain `DecimalString`
- tests cover provider IDs, market refs, financial metric aggregation, unknown metrics, no cross-currency aggregation, one-click disabled, kill switch risk-increase block, kill switch cancellation allow, stake cap, exposure cap, C0, missing C1, missing legal gate, missing local approval, geo blocked/unknown, credentials missing, marketable order blocked
- pnpm typecheck, pnpm lint, pnpm test pass for core or blockers are documented
- docs/ai/context-handoff.md updated
```

## Goal 03 - Tauri desktop shell with provider-ready states

```txt
/goal Implement the first Tauri desktop shell using the shared React UI architecture and provider adapter contracts.

Read first:
- docs/ai/CONTEXT_INDEX.md Route E
- docs/architecture/DESKTOP_PLATFORM_DECISION.md
- docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md
- docs/specs/FUNCTIONAL_SPEC.md
- docs/specs/DESKTOP_APP_SPEC.md

Use skills:
- tauri-desktop-shell

Implement:
- apps/desktop minimal Tauri + Vite app
- secure Tauri command/capability boundary
- typed command wrapper stubs with allowed commands only
- React renderer with provider/market selector surfaces for both Polymarket and Kalshi
- ladder workspace with no-market, loading, empty, stale, disconnected, and error states
- command contracts ready to consume real provider snapshots from Goal 04
- stake presets
- execution mode banner
- global/provider/market metrics panel with unknown/fake-free states
- one-click armed/off control
- paper/live-dry-run status indicator
- audit log panel placeholder

Forbidden:
- no live credentials
- no external API integration in this goal
- no fabricated provider liquidity, fake balances, fake PnL, or fake live data as an accepted product state
- no unrestricted Tauri commands or broad filesystem/shell permissions
- no packaging optimization yet

Acceptance criteria:
- desktop dev command runs or blocker documented
- UI renders a usable terminal shell without pretending that fixture data is live provider data
- no trading action bypasses the risk guard
- renderer has no filesystem/shell/provider SDK/secret access
```

## Goal 04 - Complete provider read-only data

```txt
/goal Implement complete read-only market data adapters for both Polymarket and Kalshi.

Read first:
- docs/ai/CONTEXT_INDEX.md Route D
- docs/specs/MARKET_DATA_SPEC.md
- docs/specs/MARKET_SELECTION_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md
- docs/adr/ADR-0004-dual-venue-polymarket-kalshi.md

Use skills:
- legal-live-safety-gate if credentials/account data are touched
- polymarket-live-adapter only for Polymarket-specific work

Implement in packages/market-data:
- begin with a short Kalshi official-access spike: validate current official read-only endpoints, auth requirements, market/order-book semantics, rate limits, and whether the first demo can load a real Kalshi snapshot without credentials
- MarketDataAdapter provider port
- PolymarketMarketDataAdapter read-only path
- KalshiMarketDataAdapter read-only path
- configured fallback provider/market/outcome support using real provider identifiers only
- order-book snapshot fetch for both providers
- market list/search adapter for both providers, or a documented official-access blocker
- WebSocket subscription interface where official endpoints support it; polling fallback otherwise
- payload validation and normalization into core domain types
- stale/reconnect state model

Forbidden:
- no authenticated trading endpoints
- no private keys
- no live order submission
- no assuming Polymarket and Kalshi have identical book/account semantics
- no substituting fixture/mock data for a provider integration pass

Acceptance criteria:
- Kalshi official-access spike result is documented before treating the Kalshi adapter as blocked or complete
- adapters can be tested with official-shape payload fixtures
- fixtures cover valid open market, closed market, missing outcome, invalid provider mapping, missing tick size, stale data, and empty depth
- real Polymarket and real Kalshi read-only snapshots can be loaded from official provider endpoints, or a concrete provider/API/access blocker is documented as a blocker rather than treated as success
- UI can consume normalized snapshot data
- errors and stale states are explicit
- trading is refused when provider/outcome/tick/status/freshness/account requirements are unknown
```

## Goal 05 - Paper, live-dry-run, audit log

```txt
/goal Implement paper and live-dry-run order intent flow with audit logging.

Read first:
- docs/ai/CONTEXT_INDEX.md Route C and Route F
- docs/specs/ORDER_ENTRY_SEMANTICS.md
- docs/specs/RISK_POLICY_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md
- docs/specs/LIVE_EXECUTION_SPEC.md
- docs/specs/AUDIT_LOG_SPEC.md
- docs/legal/LEGAL_OPERATING_MODEL.md

Use skills:
- legal-live-safety-gate
- domain-tdd-ladder

Implement:
- ExecutionAdapter interface
- PaperExecutionAdapter
- LiveDryRunExecutionAdapter
- AuditLog interface and local redacted implementation stub
- UI connection for order intent preview, paper submit, dry-run submit, cancel/cancel-all stubs

Forbidden:
- no real live order submission
- no private keys or secrets
- no geoblock bypass
- no marketable live order path
- no presenting paper or dry-run execution as a substitute for real provider integration

Acceptance criteria:
- blocked gate reason is visible and audited
- cancellation is allowed under kill switch for existing order ids
- live-dry-run cannot submit to platform
- refusal paths are tested
```

## Goal 06 - Gated live execution vertical slice

```txt
/goal Implement the real live execution vertical slice behind hard gates.

Read first:
- docs/ai/CONTEXT_INDEX.md Route D and Route F
- docs/legal/LEGAL_OPERATING_MODEL.md
- docs/legal/LIVE_TRADING_APPROVAL_GATE.md
- docs/specs/LIVE_EXECUTION_SPEC.md
- docs/specs/RISK_POLICY_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md
- docs/specs/ORDER_ENTRY_SEMANTICS.md
- docs/launch/LIVE_SMOKE_TEST.md

Use skills:
- legal-live-safety-gate
- provider-specific adapter skill where available

Implement:
- CredentialProvider interface outside renderer
- LocalApprovalGateProvider interface reading non-committed local approval state
- LegalGateProvider interface
- GeoEligibilityProvider interface
- provider live execution adapters for both Polymarket and Kalshi behind hard gates; real place/cancel is reachable only for the provider whose legal, geo, credential, account, risk, audit, and human approval gates pass
- account metrics adapter required by risk guard
- audit logging with secrets redacted

Forbidden:
- do not place real orders unless LEGAL_GATE_STATUS=APPROVED, ENABLE_LIVE_TRADING=true, a non-committed local approval gate is approved, and all runtime gates pass
- do not store private keys in cloud/backend code
- do not expose secrets to renderer
- do not bypass geoblock
- do not use fake KYC or fake legal entity
- do not enable paid routing without approved disclosure and C1 decision

Acceptance criteria:
- refusal paths are tested
- live mode cannot activate accidentally
- live smoke checklist exists and is followed if gates pass
- final demo state is explicit: live smoke achieved, live blocked by named gate, live-dry-run, or paper + real data
```

## Goal 07 - Landing page strategy and implementation

Use `docs/ai/LANDING_PAGE_TASKPACK.md` for the full landing sequence.

```txt
/goal Build a distinctive, competitor-aware landing page for the Prediction Ladder Windows desktop product.

Read first:
- AGENTS.md
- docs/ai/CONTEXT_INDEX.md Route I
- docs/ai/context-handoff.md
- docs/landing/LANDING_PAGE_BRIEF_FOR_CODEX.md
- docs/landing/LANDING_PAGE_STRATEGY.md
- docs/landing/LANDING_COPY.md
- docs/landing/LANDING_DESIGN_SYSTEM.md
- docs/landing/LANDING_IMPLEMENTATION_SPEC.md
- docs/landing/COMPETITOR_LANDING_NOTES.md
- docs/legal/LEGAL_OPERATING_MODEL.md

Use skills:
- landing-conversion-strategist
- frontend-design

Forbidden:
- no live trading code in landing
- no private key, seed phrase, API secret, or deposit collection
- no fake testimonials/logos/metrics
- no unsupported speed, safety, legal, or profit claims
- no claim of being first, only, or globally available
```

## Goal 08 - Landing critique and polish pass

```txt
/goal Review and improve the landing page against competitive positioning, trust, accessibility, and non-generic design quality.

Read first:
- docs/ai/CONTEXT_INDEX.md Route I
- docs/ai/LANDING_PAGE_TASKPACK.md
- docs/legal/LEGAL_OPERATING_MODEL.md

Use skills:
- landing-conversion-strategist
- frontend-design
- web-interface-guidelines-review

Produce:
- short critique
- prioritized fixes
- implemented improvements if safe and scoped
- docs/ai/context-handoff.md update

Forbidden:
- no new product claims without source or implementation proof
- no fake testimonials/logos/metrics
- no broad legal availability claim
- no profit or execution-quality guarantees
```

## Goal 09 - Desktop terminal design pass

Use `docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md` for the full desktop sequence.

```txt
/goal Apply the desktop terminal design pass to the Tauri app.

Read first:
- AGENTS.md
- docs/ai/CONTEXT_INDEX.md Route J
- docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md
- docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md
- docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md
- docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md
- docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md
- docs/specs/FUNCTIONAL_SPEC.md
- docs/specs/RISK_POLICY_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md

Use skills:
- desktop-terminal-design
- tauri-desktop-shell
- tauri-windows-native-polish if touching shell/native behavior

Forbidden:
- no live execution
- no external APIs unless Goal 04 is already complete
- no private keys
- no bots or automation
- no generic admin dashboard layout
- no hiding legal/risk/account metrics state in settings or footer

Acceptance criteria:
- desktop app renders a credible trading terminal UI
- mode/risk/live/account states are impossible to miss
- one-click defaults to off
- central ladder is visually dominant
- numeric columns align and dense rows remain readable
- pnpm typecheck, pnpm lint, pnpm test, and pnpm build run or blockers are documented
- docs/ai/context-handoff.md is updated
```

## Goal 10 - Release readiness review

```txt
/goal Perform launch readiness review for the final 40-hour delivery demo.

Read first:
- docs/launch/LAUNCH_READINESS_CHECKLIST.md
- docs/launch/LIVE_SMOKE_TEST.md
- docs/legal/LIVE_TRADING_APPROVAL_GATE.md
- docs/status/TIME_LOG.md
- docs/ai/context-handoff.md

Use skills:
- release-readiness-review

Produce:
- PASS / CONDITIONAL_PASS / FAIL verdict
- list of passed gates
- list of failed/blocking gates
- demo script
- known issues
- next steps
- explicit live/no-live decision

Acceptance criteria:
- no ambiguous launch state remains
- final daily report and time log are updated
- screen recordings are not evaluated or necessary
```
