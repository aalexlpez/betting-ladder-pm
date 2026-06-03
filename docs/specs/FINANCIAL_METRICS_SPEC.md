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

## Acceptance criteria

- UI can render global, provider, and market breakdowns.
- Domain tests cover aggregation by provider, aggregation by market, unknown metric propagation, and no cross-currency aggregation.
- Live order validation refuses risk-increasing actions when required financial metrics are unknown.
