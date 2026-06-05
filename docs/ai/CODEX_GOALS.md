# Codex Goals

Use these as copy-pasteable Codex goals. Keep each task small and reviewable. Do not ask Codex to "build the app" in one pass.

## Implementation vertical slice priority

```txt
repo bootstrap
-> provider-neutral domain/risk/financial metrics tests
-> Tauri desktop shell wired to provider ports, with honest loading/empty/error states
-> normalized multi-venue contracts for markets, books, account state, orders, fills, and settlement
-> complete real Polymarket and Kalshi read-only market data adapters
-> official provider runtime with SDK/source-of-truth clients and WebSocket-first streaming
-> unified multi-venue desktop market experience
-> paper/live-dry-run order intent and audit log
-> gated real live place/cancel capability
-> Windows installer/distribution artifact
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
- command contracts ready to consume normalized provider snapshots from Goal 04A/04
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

## Goal 04A - Normalized multi-venue contracts

```txt
/goal Implement the normalized multi-venue contracts before real provider API work.

Read first:
- docs/ai/CONTEXT_INDEX.md Routes B, C, and D
- docs/specs/MARKET_DATA_SPEC.md
- docs/specs/MARKET_SELECTION_SPEC.md
- docs/specs/FINANCIAL_METRICS_SPEC.md
- docs/specs/LIVE_EXECUTION_SPEC.md
- docs/adr/ADR-0004-dual-venue-polymarket-kalshi.md

Use skills:
- context-router
- monorepo-architect
- domain-tdd-ladder
- legal-live-safety-gate as a guardrail for account/live-adjacent contracts

Implement:
- keep canonical normalized shared types in packages/core
- add TradableMarketRef separate from display-only MarketRef, requiring provider, market, outcome, currency, tick size, open status, and fresh data before executable/read-only ladder paths treat a market as tradable
- normalize outcomes, order-book levels/snapshots, freshness, connection mode, balances, positions, fees, order states, fills, and settlement status
- add packages/market-data provider ports for discovery, market resolution, order-book snapshots, optional subscriptions, explicit adapter errors, source metadata, and fixture-vs-live origin distinction
- add packages/execution ports for execution and account state snapshots, without live submission implementation
- add workspace dependencies from packages/market-data and packages/execution to packages/core only
- keep desktop provider IDs sourced from core while leaving the UI disabled/fake-free

Forbidden:
- no external API calls
- no credentials
- no live order placement or cancellation
- no provider SDKs
- no pretending fixtures are live integration
- no Polymarket/Kalshi payload shape in packages/core beyond normalized provider IDs and providerMetadata

Acceptance criteria:
- tests cover required tradable refs, decimal-safe order-book normalization, bid/ask ordering, freshness states, unknown account data, no fake balances/positions, fixture source distinction, and disabled execution ports
- packages/market-data and packages/execution expose contracts_ready package statuses
- pnpm --filter @prediction-ladder/core test, pnpm --filter @prediction-ladder/market-data test, pnpm --filter @prediction-ladder/execution test, pnpm typecheck, pnpm lint, pnpm test, and pnpm build pass or blockers are documented
- docs/ai/context-handoff.md updated
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
- use the Goal 04A MarketDiscoveryAdapter and MarketDataAdapter contracts
- PolymarketMarketDataAdapter read-only path
- KalshiMarketDataAdapter read-only path
- configured fallback provider/market/outcome support using real provider identifiers only
- order-book snapshot fetch for both providers
- market list/search adapter for both providers, or a documented official-access blocker
- keep any subscription interface contract-only; official SDK/WebSocket runtime is deferred to Goal 04B
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

## Goal 04B - Official provider runtime and WebSocket streaming

```txt
/goal Implement the provider runtime that turns the Goal 04 read-only adapters into an end-to-end live market-data path using official SDKs or official source-of-truth specifications.

Read first:
- docs/ai/CONTEXT_INDEX.md Routes B, D, E, and F
- docs/specs/MARKET_DATA_SPEC.md
- docs/specs/MARKET_SELECTION_SPEC.md
- docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md
- docs/adr/ADR-0004-dual-venue-polymarket-kalshi.md

Use skills:
- context-router
- monorepo-architect
- tauri-desktop-shell
- legal-live-safety-gate
- polymarket-live-adapter for Polymarket-specific work

Implement:
- validate current official SDK/client availability before adding dependencies
- use official provider SDKs when they exist for the chosen runtime
- where no official SDK exists for the chosen runtime, use the provider's official OpenAPI/AsyncAPI specification or direct documented API client and document why no official SDK was used
- keep all provider clients, WebSocket connections, credentials, auth signatures, and reconnect state outside the React renderer
- add Tauri-side command/runtime boundary for `market_search`, `market_get_order_book`, and `market_subscribe`
- make WebSocket streaming the primary fresh market-data path for providers that support it
- keep REST snapshot reads only for discovery, initial bootstrap, recovery, and documented fallback
- implement provider-specific WebSocket subscription adapters for Polymarket and Kalshi, or document a concrete official SDK/API/access blocker
- model connected, connecting, reconnecting, stale, disconnected, invalid, blocked, and credentials-required states explicitly
- preserve normalized `TradableMarketRef`, `NormalizedOutcome`, `NormalizedOrderBookSnapshot`, `OrderBookLevel`, `DataFreshness`, and `ConnectionMode`
- add deterministic tests for stream messages, out-of-order updates, reconnect, stale timeout, malformed messages, auth-required WebSocket handshake, and REST fallback

Provider notes:
- Polymarket official docs currently list TypeScript, Python, and Rust CLOB clients, and a market WebSocket channel that does not require authentication.
- Kalshi official docs currently list Python and TypeScript SDKs, recommend OpenAPI/AsyncAPI as source of truth for active traders, and require authentication during WebSocket connection setup even for public market-data channels.
- If a Kalshi Rust SDK is required but not officially available, do not substitute an unofficial SDK and call it official; use an official spec-generated/direct client or document the blocker.

Forbidden:
- no provider SDKs or auth headers in the renderer
- no private keys, seed phrases, API secrets, or signed payloads in renderer memory
- no live order submission
- no geoblock or auth bypass
- no pretending REST polling is the final streaming integration if official WebSocket access is available
- no treating credential-required Kalshi WebSocket failure as provider success

Acceptance criteria:
- desktop can load/search/select a real provider market through the Tauri-side provider runtime
- a fresh ladder can be driven by WebSocket messages for each provider, or a named official SDK/API/access blocker is shown
- REST snapshots remain available as initial/recovery/fallback path and are labelled as such
- renderer receives only normalized, secret-free market-data state
- freshness/reconnect behavior is tested
- pnpm --filter @prediction-ladder/market-data test, pnpm --filter @prediction-ladder/desktop test, pnpm typecheck, pnpm lint, pnpm test, and pnpm build pass or blockers are documented
- docs/ai/context-handoff.md updated
```

## Goal 04C - Unified multi-venue desktop market experience

```txt
/goal Replace the provider-switching desktop market surface with a unified multi-venue market experience.

Read first:
- docs/ai/CONTEXT_INDEX.md Routes D, E, and J
- docs/specs/MARKET_DATA_SPEC.md
- docs/specs/MARKET_SELECTION_SPEC.md
- docs/specs/DESKTOP_APP_SPEC.md
- docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md
- docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md
- docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md

Use skills:
- context-router
- desktop-terminal-design
- tauri-desktop-shell
- legal-live-safety-gate as a guardrail for live/account status visibility

Implement:
- unified market search/list across Polymarket and Kalshi instead of a provider-first switch as the primary workflow
- provider appears as a compact venue badge/icon and metadata, not as a separate product mode
- one ladder workspace consumes normalized market/outcome/book state regardless of venue
- provider-specific blockers remain visible only where they affect availability, credentials, legal gates, account metrics, order semantics, or execution safety
- sorting/filtering may include provider, but the default experience should feel like one prediction-market ladder terminal
- keep disconnected/stale/blocked/unavailable states explicit and fake-free
- keep order submission disabled until Goal 05/06 paths are implemented

Forbidden:
- no hiding provider identity entirely when it affects legal, fees, currency, credentials, or execution risk
- no fake unified liquidity across venues
- no cross-venue order routing, aggregation, arbitrage, bots, copy trading, or AI signals
- no live submission path
- no provider SDK access from the renderer

Acceptance criteria:
- user can discover real markets from both providers from one market surface
- selected market renders in one normalized ladder layout with only a venue badge/icon differentiating the source
- provider switch is no longer the main mental model of the desktop workspace
- state tests prove Polymarket and Kalshi snapshots render through the same ladder-facing view model
- pnpm --filter @prediction-ladder/desktop test, pnpm typecheck, pnpm lint, pnpm test, and pnpm build pass or blockers are documented
- docs/ai/context-handoff.md updated
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
