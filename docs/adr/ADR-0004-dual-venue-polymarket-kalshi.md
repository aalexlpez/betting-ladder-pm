# ADR-0004 - Dual-Venue Polymarket and Kalshi Baseline

Date: 2026-06-01

## Status

Accepted, updated 2026-06-02

## Context

The original opportunity explicitly references Polymarket/Kalshi-style prediction markets. The product should not hard-code one provider because the ladder, risk, execution, and monetization model need to survive provider differences.

## Decision

Support Polymarket and Kalshi as required first-version provider integrations:

- `packages/core` remains provider-neutral.
- `packages/market-data` exposes shared market-data ports plus provider adapters.
- `packages/execution` exposes shared execution ports plus provider adapters.
- market selection includes `providerId`;
- financial metrics aggregate globally, by provider, and by market.

Implementation may still sequence work by risk and availability, but the product demo must not replace either provider with simulated data. Fixtures are allowed only for deterministic tests. If official API access, authentication constraints, legal review, or platform terms block one provider inside the 40-hour window, that is documented as a blocker rather than counted as complete.

## Consequences

- Adapters must normalize different order-book, account, fee, identifier, and eligibility models.
- The UI must show active provider and provider-level metrics.
- Live execution gates apply per provider.
- Provider-specific behavior must not leak into domain logic.
- Completion criteria must distinguish test fixtures from real provider integration.
- Additional provider features beyond the shared base need a scoped ADR or task decision.

## Rejected alternatives

- Polymarket-only MVP: rejected because it creates a second migration later and conflicts with the requested base support.
- Kalshi-only MVP: rejected because it ignores Polymarket demand and available public read paths.
- Unstructured multi-exchange dashboard: rejected because the product remains a focused ladder terminal, not a generic exchange hub.
