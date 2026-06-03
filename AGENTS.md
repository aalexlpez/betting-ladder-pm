# AGENTS.md

This is the stable entry point for Codex. Keep it short.

## Canonical source of truth

This repository version is canonical. Earlier generated packs, Day 1 variants, and files under `docs/archive/` are non-canonical and must not be used as implementation context unless explicitly requested.

For the current next action, read `docs/ai/context-handoff.md`. This file is the stable entry point and guardrail summary; it does not redefine the detailed roadmap.

## Timing context

- Total test budget: 40 hours.
- Day 1 is closed and logged as 8 hours.
- Day 2 is closed and logged as 8 hours after bootstrap, corrected product decisions, and Goal 02 domain core/audit fixes.
- Current phase and next action are controlled by `docs/ai/context-handoff.md`.
- Delivery target: launched or launch-ready first version by the end of the 40-hour budget.

## Mission

Build a real, live-ready Windows desktop trading terminal for prediction markets, with a strong competitor-aware landing page and a monorepo architecture.

The product is a Betfair-style betting ladder for prediction markets. It must use real market data and be architected for gated live order placement and cancellation. Paper mode is only a harness, fallback, and QA tool.

## Non-negotiable constraints

1. Use a monorepo for apps, packages, docs, scripts, and Codex skills.
2. Repository documentation and code comments must be in English, except consolidated daily reports may be written in Spanish for evaluator readability.
3. Do not build a paper-only prototype as the final product.
4. Real live execution is an intended product capability and live smoke target, but it is allowed only if all legal, geographic, credential, safety, risk, audit, and explicit user-confirmation gates pass.
5. Criminal / severe compliance risk is an absolute no-go.
6. Administrative/regulatory risk can only be accepted by a human business owner through an explicit approval gate.
7. Never implement geoblock evasion, VPN bypass, sanctions bypass, AML/KYC bypass, false identity, fake beneficial ownership, or fake KYC.
8. Never custody user funds, seed phrases, private keys, or unencrypted API secrets in a server.
9. Support Polymarket and Kalshi from the base architecture through venue-neutral domain ports and provider-specific adapters.
10. Do not add bots, automated strategies, copy trading, or AI trading signals in the MVP.
11. Landing UI must be product-specific, competitor-aware, visually non-generic, and legally careful.
12. Desktop UI must be a specialized trading terminal, not a generic SaaS/admin dashboard inside Tauri.
13. The desktop ladder, live/risk state, one-click state, kill switch, and data freshness must remain visible in the operating workspace.
14. Do not use external AI tools in autonomous agent mode. Review roles may critique; the main Codex flow applies changes.
15. Screen recordings are not evaluated, are not necessary, and must not consume implementation time or block planning, implementation, or release readiness.

## Default technology decisions

- Monorepo: pnpm workspaces + Turborepo.
- Desktop: Tauri + Vite + React + TypeScript.
- Landing: Vite + React + TypeScript static build; not a trading surface.
- Domain: TypeScript package with pure functions and deterministic tests.
- UI: React components consuming domain state; no trading logic inside components.
- Market data: provider-neutral ports with Polymarket and Kalshi adapters.
- Execution: paper, live-dry-run, and live adapters behind a common port.
- Storage: local-first; no cloud custody. Local env secrets are dev/smoke-test only and never the default credential source.

## Required context flow

Before making changes:

1. Read `docs/ai/context-handoff.md` for the current next action.
2. Read `docs/ai/CONTEXT_INDEX.md`.
3. Select the minimum relevant route.
4. Use the appropriate local skill in `.agents/skills/`.
5. Write a short task plan before editing files.

Do not read deleted historical notes, earlier generated packs, or non-canonical skills unless explicitly requested.

## Required validation

Before marking work complete, run the relevant commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Commands must not be fake-positive placeholders. If tooling is not bootstrapped yet, commands must fail loudly and the blocker must be documented in `docs/ai/context-handoff.md`.

## Stop conditions

Stop immediately and request human decision if a task requires:

- bypassing a platform or country restriction;
- hiding real ownership;
- using a fake legal entity for live accounts;
- storing real private keys or seed phrases in cloud/backend storage;
- executing live orders without the legal approval gate;
- increasing live exposure limits without explicit approval;
- adding automated trading behavior;
- adding fake testimonials, fake logos, fake metrics, or unsupported profit/legal/safety claims.
