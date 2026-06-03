# Prediction Ladder Monorepo

> **Canonical source of truth:** this repository version is canonical. Earlier generated packs, Day 1 variants, and files under `docs/archive/` are non-canonical and must not be used as implementation context unless explicitly requested.

A launch-ready Windows desktop trading terminal for prediction markets, built for a 5-day / 40-hour technical test.

## Current timing state

- Total time budget: 40 hours.
- Day 1 is closed and logged as 8 hours.
- Day 2 is closed and logged as 8 hours after bootstrap, corrected product decisions, and Goal 02 domain core/audit fixes.
- Current phase, blockers, validation status, and next action are controlled by `docs/ai/context-handoff.md`.
- Delivery target: a launched or launch-ready first version by the end of the 40-hour budget, not a calendar-weekday milestone.

## Start here for Codex

Read only the minimal route before editing:

1. `AGENTS.md`
2. `docs/START_HERE_FOR_CODEX.md`
3. `docs/ai/CONTEXT_INDEX.md`
4. `docs/ai/context-handoff.md`
5. One route and one goal selected from the current handoff.

Do not start feature implementation before the current guardrails in `docs/ai/context-handoff.md` are reviewed.

The product and architecture notes below are a summary for orientation. Use `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current state, blockers, validation, and next action.

## Product thesis

Professional prediction-market traders need a faster and safer way to read liquidity and interact with prices than native market interfaces provide. The product is a Betfair-style betting ladder:

- vertical price ladder;
- live order-book liquidity per price level;
- stake presets;
- one-click trading only after explicit arming;
- local-first execution posture;
- strict safety gates;
- real market data;
- live order placement and cancellation only if legal/compliance gates pass.

Paper mode is not the product strategy. Paper mode is a development harness, QA tool, and fallback. The target is a real, live-ready product with a fair monetization model: free controlled pilot/read-only evaluation, provider-approved disclosed fees or revenue share as a hypothesis, subscription as a fallback, and all paid routing disabled by default.

## Strategic decision

The primary deliverable is a Windows desktop application built with Tauri + Vite + React + TypeScript, plus a Vite + React static landing page. Desktop is favored because live trading requires a credible local-first story for credentials, no-custody, hotkeys, persistent trading UI, and a professional terminal experience.

The demonstrable vertical slice targets real Polymarket and Kalshi market data, provider-neutral order intent, risk/legal/geo/credential validation, a gated real live place/cancel smoke path, live-dry-run or paper fallback, and a redacted audit log. Fixtures are for tests only, not a substitute for provider integration. Real live execution is reachable only if every gate is explicitly approved for the selected provider.

## Legal operating stance

The application must be capable of live operation, but live trading is gated:

- **C0 criminal / severe compliance risk:** absolute no-go.
- **C1 administrative / regulatory risk:** human business-owner sign-off required.
- **C2 platform / ToS / account risk:** controlled by feature flags and fallbacks.
- **C3 product / economic risk:** handled through normal product decisions.

The app must not implement geoblock evasion, false identity, fake KYC, custody of user funds, custody of private keys, sanctions evasion, AML evasion, or hidden beneficial ownership.

## Monorepo layout

```txt
apps/
  desktop/          # Tauri Windows desktop app
  landing/          # static landing / marketing / download page

packages/
  core/             # pure domain: ladder, order intent, risk, audit
  market-data/      # provider-neutral Polymarket/Kalshi read adapters
  execution/        # paper, dry-run, and live execution adapters
  ui/               # reusable React UI components
  config/           # shared TS/lint/test/build config

docs/
  product/          # product, GTM, MVP, assignment traceability
  research/         # source quality and competitive landscape
  legal/            # operating model and live approval gates
  architecture/     # system, security, and monorepo architecture
  specs/            # functional and technical specs
  adr/              # architecture/product decision records
  ai/               # Codex operating model, context routing, goals
  launch/           # launch readiness and live smoke tests
  status/           # time log and daily reports

.agents/skills/     # local Codex skills
scripts/ai/         # Codex helper scripts and quality gates
```

## Intended root commands

These commands are the target developer interface. They must not pass through fake placeholders.

```bash
pnpm install
pnpm dev
pnpm desktop:dev
pnpm landing:dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm package:win
pnpm ai:session-start
pnpm ai:quality-gate
pnpm ai:live-preflight
```

Use `.env.example` for safe defaults. `.env.local-smoke.example` documents the controlled local smoke-test override; never commit real secrets.

## Source assumptions snapshot

Last reviewed: 2026-06-03.

- The original test asks for a product, GTM strategy, daily reports, traceability, time logging, and a launched or launch-ready version in 5 days / 40 hours.
- Polymarket CLOB read endpoints are public, while trading endpoints require authentication and order signing.
- Kalshi read/account/trading access must be validated from official provider docs during adapter work.
- Provider geoblock/jurisdiction checks are required before live risk-increasing actions.
- The concrete bootstrap stack is Tauri + Vite + React + TypeScript, Vitest, ESLint, Prettier, pnpm workspaces, and Turborepo.
