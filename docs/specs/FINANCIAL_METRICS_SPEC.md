# Financial Metrics Specification

Status: implementation source of truth for account, PnL, open-order amount, and exposure metrics.

## Purpose

The desktop app must show risk and account state without faking precision. Metrics must be provider-aware, market-aware, auditable, and explicit when unavailable.

## Required metrics

The app must display:

- global PnL;
- available account funds;
- total amount offered in open orders;
- total exposure;
- the same metrics grouped by market;
- the same metrics grouped by provider: Polymarket and Kalshi.

## Canonical metric definitions

```ts
type ProviderId = "polymarket" | "kalshi";
type DecimalString = string;
type CurrencyCode = "USD" | "USDC" | string;

type MetricValue = {
  amount: DecimalString;
  currency: CurrencyCode;
} | {
  status: "unknown" | "not_applicable";
  reason: string;
};

type FinancialMetrics = {
  realizedPnl: MetricValue;
  unrealizedPnl: MetricValue;
  totalPnl: MetricValue;
  availableFunds: MetricValue;
  openOrderAmount: MetricValue;
  exposure: MetricValue;
};

type FinancialMetricsSnapshot = {
  timestamp: string;
  global: FinancialMetrics[];
  byProvider: Array<{ providerId: ProviderId; metrics: FinancialMetrics[] }>;
  byMarket: Array<{ providerId: ProviderId; marketId: string; outcomeId?: string; metrics: FinancialMetrics[] }>;
};
```

Goal 04A also defines normalized account-state contracts in `packages/core` for
balances, positions, fees, orders, fills, and settlement status. Provider
adapters may preserve venue-specific fields only in `providerMetadata`; the UI
and risk guard consume the normalized shapes and must treat credential-required
values as `unknown`.

## Display rules

- Never show fake PnL, fake balance, fake exposure, or invented provider metrics.
- If a provider cannot supply a value, show `unknown` with a clear reason.
- Global metrics are aggregated only within the same currency. Do not silently combine USD and USDC unless a later ADR defines a conversion policy.
- PnL is split into realized and unrealized when provider data allows it; otherwise total PnL is unknown.
- Open-order amount means user funds or stake currently committed/offered by resting/open orders, conservatively calculated.
- Exposure means worst-case loss under current positions plus open risk-increasing orders, conservatively calculated.

## Provider notes

### Polymarket

- Account and position metrics may depend on authenticated wallet/CLOB state.
- USDC-denominated values must remain explicit as USDC unless a conversion policy exists.
- If authenticated account data is unavailable, display market data but mark account metrics unknown.

### Kalshi

- Portfolio/account endpoints may provide balances, positions, fees, realized PnL, and market exposure when authenticated.
- USD-denominated values must remain explicit as USD.
- If authenticated portfolio data is unavailable, display market data but mark account metrics unknown.

## Risk policy integration

Risk validation must use conservative values:

- unknown available funds blocks live risk-increasing orders;
- unknown position/exposure blocks live risk-increasing orders;
- unknown open-order amount blocks live risk-increasing orders when it affects max exposure;
- cancellation remains risk-reducing and should remain available if technically possible.

Goal 06/07 implementation note: the desktop live gate model now renders a
missing privileged account metrics source plus unknown available funds,
provider exposure, and market exposure as exact live blockers
(`account_metrics_source_missing`, `available_funds_unknown`,
`provider_exposure_unknown`, `market_exposure_unknown`). The Tauri live submit
command requires authenticated provider-owned account metrics readiness for the
selected provider before any risk-increasing provider branch, so
renderer-provided funds/exposure inputs alone can never authorize live
submission. `ACCOUNT_METRICS_SOURCE=official_provider` remains only a
controlled dev/smoke alias, not normal user setup.

Goal 07 implementation note, 2026-06-04: desktop preflight can now
render Tauri-returned account metric readiness and, when ready, available funds,
open-order amount, provider exposure, and market exposure for the selected
provider/market. Polymarket now has a Tauri-owned provider metrics runtime that
authenticates through the local signer, reads CLOB USDC balance/allowance and
open orders, reads wallet positions through the provider-owned data API, and
computes conservative provider/market exposure without returning signer
material, auth headers, signatures, signed payloads, full wallet identifiers, or
raw provider payloads to React. Kalshi now has a Tauri-owned RSA-PSS signed
portfolio metrics runtime that uses the local `.key` material only in the main
process, signs documented Trade API portfolio requests, reads USD balance,
resting orders, and market positions, then computes conservative open-order
amount, position exposure, provider exposure, and market exposure without
returning private keys, API Key IDs, auth headers, signatures, signed payloads,
or raw provider payloads to React. Polymarket signer material and Kalshi key
material are imported once from local source files into app-managed encrypted
local credential storage; normal users should not keep editing file paths,
`.local/account-metrics.local.json`, or environment switches to make metrics
ready. `.local/account-metrics.local.json` and environment switches are
dev/smoke fallbacks only and must not be the normal operator onboarding path.
Missing/invalid credentials, provider credential
rejection, provider rejection, network failure, malformed payloads, stale data,
provider/market mismatch, missing market selection, and unconfigured live
adapters remain exact live blockers.

## Acceptance criteria

- UI can render global, provider, and market breakdowns.
- Domain tests cover aggregation by provider, aggregation by market, unknown metric propagation, and no cross-currency aggregation.
- Live order validation refuses risk-increasing actions when required financial metrics are unknown.
- Normal users do not edit `.local/*.json` or env vars to make account metrics
  appear ready; authenticated provider-owned metrics are required for product
  live readiness.
- Normal users complete the localized desktop legal approval modal for
  legal/local approval; Tauri writes the non-committed approval state. Manual
  `.local` files and environment switches remain dev/smoke fallbacks only.
