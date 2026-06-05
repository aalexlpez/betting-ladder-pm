# System Architecture

## High-level architecture

```txt
Polymarket APIs / Kalshi APIs
  -> packages/market-data
  -> packages/core ladder model
  -> packages/ui React ladder
  -> apps/desktop Tauri shell

User action
  -> UI event
  -> OrderIntent
  -> RiskGuard
  -> LegalGate / GeoGate / CredentialGate
  -> ExecutionAdapter
      -> PaperExecutionAdapter
      -> LiveDryRunExecutionAdapter
      -> ProviderLiveExecutionAdapter
  -> AuditLog
```

## Core ports

```ts
interface MarketDataAdapter {
  providerId: ProviderId;
  getOrderBook(marketRef: TradableMarketRef): Promise<MarketDataResult<NormalizedOrderBookSnapshot>>;
  subscribeOrderBook?(marketRef: TradableMarketRef, onEvent: (event: MarketDataEvent) => void): Unsubscribe;
}

interface ExecutionAdapter {
  providerId: ProviderId;
  placeOrder(intent: ApprovedOrderIntent): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<CancelResult>;
}

interface AccountMetricsAdapter {
  providerId: ProviderId;
  getAccountMetrics(): Promise<AccountMetricsSnapshot>;
}

interface LegalGateProvider {
  getStatus(): Promise<LegalGateStatus>;
}

interface GeoEligibilityProvider {
  check(): Promise<GeoEligibilityResult>;
}

interface CredentialProvider {
  getStatus(): Promise<CredentialStatus>;
}
```

## Execution modes

| Mode | Meaning |
|---|---|
| `disabled` | No order actions allowed. |
| `paper` | Simulated order flow for development and fallback. |
| `live_dry_run` | Full validation and payload construction, no submission. |
| `live` | Real order submission after all gates pass. |

## Data flow principles

- External payloads are validated at adapter boundaries.
- Domain code receives normalized types only.
- UI never calls platform APIs directly.
- Provider-specific semantics stay in adapters; the domain receives `providerId`, market references, normalized order-book levels, positions, balances, fees, and exposure metrics.
- Live adapters are provider-specific implementations of the shared execution port; the architecture must not make Polymarket or Kalshi behavior the default domain model.
- Live execution cannot be reached without explicit approved intent.
- Audit logs must redact secrets.

## Failure states

Every critical operation must return an explicit state:

- `ok`;
- `blocked_by_legal_gate`;
- `blocked_by_geo_gate`;
- `blocked_by_credentials`;
- `blocked_by_risk_policy`;
- `platform_rejected`;
- `network_error`;
- `unknown_state`.

No silent failures.
