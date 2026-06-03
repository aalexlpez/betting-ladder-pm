# Market Data Specification

## Provider decision

Polymarket and Kalshi are both required provider integrations for the first product version through shared market-data ports and provider-specific adapters.

The domain must not assume that either provider is the only venue. Provider differences are normalized at adapter boundaries and preserved as explicit metadata when they affect trading, pricing, account metrics, or execution safety.

Fixtures are required for deterministic tests, but fixture/mock payloads must not be accepted as a replacement for real provider integration in the product demo. If an official provider endpoint, access policy, authentication requirement, or terms issue blocks one provider during the 40-hour delivery, that state must be documented as a blocker rather than treated as a successful simulated integration.

## Required domain types

```ts
type ProviderId = "polymarket" | "kalshi";
type Price = string; // decimal string to avoid float precision surprises
type Size = string;

type DataFreshness = "fresh" | "stale" | "disconnected" | "invalid";
type ConnectionMode = "snapshot" | "streaming" | "polling_fallback";

type MarketRef = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
};

type OrderBookLevel = {
  price: Price;
  size: Size;
};

type OrderBookSnapshot = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
  bids: OrderBookLevel[]; // normalized best/highest price first
  asks: OrderBookLevel[]; // normalized best/lowest price first
  tickSize: Price;
  timestamp: string;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  providerMetadata?: Record<string, unknown>;
};
```

## Adapter behavior

Every provider adapter must:

- fetch an initial snapshot;
- normalize bid/ask levels into deterministic price ordering;
- validate external payloads before creating domain objects;
- expose freshness and connection mode;
- expose stale/reconnect/error states;
- support official-shape payload fixtures before live endpoint reliance;
- never place orders.

## Provider-specific notes

### Polymarket

- Public read endpoints are required for the first Polymarket real-data path unless official availability changes.
- Outcome token IDs, `tickSize`, negative-risk metadata, and market status must be resolved before trading.
- Authenticated trading endpoints remain separate from read-only data.

### Kalshi

- Kalshi read-only discovery/order-book snapshots are required for the first product version unless official API/access constraints create a documented blocker.
- Kalshi order books have binary-market semantics that may expose YES/NO bids rather than a simple bid/ask shape; the adapter must normalize this without losing provider metadata.
- WebSocket and portfolio/account channels may require authentication; treat them as credentialed provider behavior, not public data.

Before implementing or declaring a blocker, Goal 04 must start with a short Kalshi official-access spike. The spike must validate current official read-only endpoints, authentication requirements, market/order-book semantics, rate limits, and whether a real Kalshi snapshot can be loaded without credentials for the first demo. Document the result in `docs/ai/context-handoff.md` or a scoped provider note before proceeding.

## Error states

- `provider_not_supported`;
- `market_not_found`;
- `outcome_not_found`;
- `network_error`;
- `invalid_payload`;
- `websocket_disconnected`;
- `stale_data`;
- `invalid_tick_size`;
- `empty_liquidity`;
- `provider_credentials_required`;
- `provider_status_unknown`.

## Freshness and fallback rules

- Default stale threshold for the first implementation slice: 10 seconds from the snapshot timestamp.
- If WebSocket is unavailable, fallback polling may be used with `connectionMode="polling_fallback"`.
- Polling fallback should prefer a 5 second interval unless rate limits or endpoint behavior require a later ADR.
- Trading actions must be refused when snapshot freshness is unknown, stale, disconnected, or invalid.
- Rendering may fill empty ladder rows by tick size, but domain snapshots must preserve actual venue levels separately from synthetic rows.
- Reject trading when a price does not align with the resolved `tickSize`.

## Market selection

Implementation must follow `docs/specs/MARKET_SELECTION_SPEC.md` for provider-aware market discovery, outcome selection, tick size, staleness, status checks, and trading preconditions.

## Read-only does not mean tradable

Public market/order-book reads are required for the MVP data path where official provider APIs allow them, but live trading still requires authentication, geoblock/jurisdiction, legal, credential, risk, monetization/disclosure, and audit gates.
