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
type MarketStatus = "open" | "closed" | "resolved" | "archived" | "inactive" | "unknown";

type MarketRef = {
  providerId: ProviderId;
  marketId: string;
  outcomeId?: string;
};

type TradableMarketRef = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
  currency: "USD" | "USDC" | string;
  tickSize: Price;
  marketStatus: "open";
  freshness: "fresh";
  providerMetadata?: Record<string, unknown>;
};

type OrderBookLevel = {
  price: Price;
  size: Size;
};

type OrderBookSnapshot = {
  marketRef: TradableMarketRef;
  bids: OrderBookLevel[]; // normalized best/highest price first
  asks: OrderBookLevel[]; // normalized best/lowest price first
  tickSize: Price;
  timestamp: string;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  providerMetadata?: Record<string, unknown>; // adapter-owned venue details
};
```

`MarketRef` is display/search-safe and may omit `outcomeId`; `TradableMarketRef`
is required for executable ladder paths and must not be created unless the adapter
has resolved provider, market, outcome, currency, tick size, open status, and fresh
data.

## Adapter behavior

Every provider adapter must:

- fetch an initial snapshot;
- prefer official provider SDKs where they exist for the selected runtime;
- use official OpenAPI/AsyncAPI specs or direct documented API clients when no official SDK exists for the selected runtime;
- normalize bid/ask levels into deterministic price ordering;
- validate external payloads before creating domain objects;
- expose freshness and connection mode;
- expose stale/reconnect/error states;
- support official-shape payload fixtures before live endpoint reliance;
- never place orders.

## Official SDK and WebSocket-first runtime requirement

Goal 04 implemented official-documented REST snapshot adapters. That remains useful
as the bootstrap, recovery, fallback, and deterministic testing layer, but it is
not the final end-to-end market-data runtime if official WebSocket access is
available.

Goal 04B implemented the first official-provider runtime boundary and
WebSocket-first normalization layer:

- provider clients and WebSocket sessions live behind the Tauri/provider runtime,
  never in the React renderer;
- WebSocket streaming is the primary path for fresh ladder data when the provider
  officially supports it;
- REST snapshots are limited to discovery, initial book bootstrap, recovery,
  polling fallback, and documented blockers;
- official SDKs are used where they exist for the chosen runtime;
- if a provider does not publish an official SDK for the chosen runtime, the
  implementation must use that provider's official OpenAPI/AsyncAPI
  specification or direct documented API client and document the reason;
- provider-specific SDK objects, WebSocket payloads, auth headers, signatures,
  credentials, and private keys must not cross into `packages/core` or the
  renderer.

Goal 04C wired the desktop React UI to the Tauri commands so users can
search/select markets and see the normalized ladder state on screen while the
renderer receives only secret-free command responses.

## Provider-specific notes

### Polymarket

- Public read endpoints are required for the first Polymarket real-data path unless official availability changes.
- Official docs currently list TypeScript, Python, and Rust CLOB clients.
- Official docs currently list a CLOB market WebSocket channel for order-book and price updates without authentication.
- Outcome token IDs, `tickSize`, negative-risk metadata, and market status must be resolved before trading.
- Authenticated trading endpoints remain separate from read-only data.

### Kalshi

- Kalshi read-only discovery/order-book snapshots are required for the first product version unless official API/access constraints create a documented blocker.
- Kalshi order books have binary-market semantics that may expose YES/NO bids rather than a simple bid/ask shape; the adapter must normalize this without losing provider metadata.
- Official docs currently list Python and TypeScript SDKs; if a Rust runtime is selected, do not claim an unofficial Rust client is official.
- Official docs recommend treating REST OpenAPI and WebSocket AsyncAPI specifications as the source of truth for active production clients.
- WebSocket connection setup currently requires authentication even for public market-data channels; treat missing credentials as an explicit `provider_credentials_required` or blocked state, not a fake success.
- Portfolio/account channels require authentication; treat them as credentialed provider behavior, not public data.

Goal 04 completed the required Kalshi official-access spike after the Goal 04A normalized contracts. The current implementation documents official read-only endpoints, authentication ambiguity, market/order-book semantics, and the rule that any real credential-required response is an explicit blocker rather than provider success.

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
- `unsupported_market`;
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

## Goal 04 read-only adapter status

Status on 2026-06-03: implemented in `packages/market-data`.

Official-access spike result:

- Polymarket official docs state that Gamma market data and CLOB read endpoints are public and do not require authentication. The adapter uses `GET https://gamma-api.polymarket.com/markets`, `GET /markets/{id}`, and CLOB `GET https://clob.polymarket.com/book?token_id=...` through an injectable HTTP boundary.
- Kalshi official docs list `GET https://external-api.kalshi.com/trade-api/v2/markets` and `GET /markets/{ticker}/orderbook`. The Kalshi orderbook guide says no authentication is required for that endpoint, while the API reference examples also show auth headers. The adapter therefore attempts the public read path and maps `401`/`403` to `provider_credentials_required` instead of pretending Kalshi succeeded.
- Kalshi books expose YES and NO bid arrays. The adapter normalizes the selected side into bids and converts opposite-side bids into implied asks using `1 - oppositeBid`, preserving the source shape only in `providerMetadata`.

Implemented behavior:

- Polymarket and Kalshi discovery, market resolution, and order-book snapshot adapters normalize into shared core contracts.
- Provider-specific payloads stay in adapter code or `providerMetadata`.
- Fixture and configured-fallback sources are distinct from `official_live` provider success.
- Stale data, malformed payloads, unsupported markets, provider errors, credential-required responses, missing outcomes, invalid ticks, and empty liquidity return explicit adapter errors.
- Desktop consumes normalized read-only snapshot state but still keeps order submission disabled, one-click off, account metrics unknown, and live execution blocked.

## Goal 04B provider runtime status

Status on 2026-06-03: implemented in `packages/market-data` and the Tauri
command boundary.

Official documentation validation before implementation:

- Polymarket official docs list TypeScript, Python, and Rust CLOB clients. The
  fresh ladder path uses the official documented market WebSocket directly
  because that page defines the public WSS subscription shape for order-book
  data and states that the market channel does not require auth.
- Kalshi official docs list Python and TypeScript SDKs, recommend REST
  OpenAPI/WebSocket AsyncAPI plus documentation as the production source of
  truth, and require authenticated WebSocket handshake headers even for public
  market-data channels. The implementation therefore treats missing Kalshi
  credentials as `provider_credentials_required` / `credentials-required`, not
  stream success.

Implemented behavior:

- `packages/market-data` now reports `official_runtime_streaming_ready`.
- Polymarket WebSocket `book` and `price_change` messages normalize into
  `NormalizedOrderBookSnapshot` with `connectionMode="streaming"`.
- Kalshi WebSocket `orderbook_snapshot` and `orderbook_delta` messages normalize
  into the same shared snapshot contract when an authenticated stream is already
  allowed by the credential gate.
- Connected, connecting, reconnecting, stale, disconnected, invalid, blocked,
  credentials-required, unavailable, and provider-error states are explicit.
- Out-of-order stream updates are ignored deterministically without mutating the
  current book.
- REST snapshots remain as discovery, bootstrap, recovery, and fallback; recovery
  snapshots are labelled `polling_fallback`.
- Renderer projection strips provider metadata and returns only normalized,
  secret-free market-data state.
- `apps/desktop/src-tauri` registers `market_search`, `market_get_order_book`,
  and `market_subscribe` command boundaries that return secret-free states and
  never expose SDK clients, WebSocket objects, auth headers, credentials, or
  signed payloads to React.

## Goal 04C desktop command/UI status

Status on 2026-06-03: implemented in `apps/desktop`.

Implemented behavior:

- The desktop market rail now has one unified search surface across Polymarket
  and Kalshi. Venue identity appears as compact metadata/badges and provider
  health, not as a provider-first product mode.
- The renderer calls `market_search`, `market_get_order_book`, and
  `market_subscribe` through the Tauri command boundary. In a plain browser tab
  without Tauri, the command client returns explicit `unavailable` and does not
  call provider APIs directly.
- `market_search` returns normalized secret-free search results plus per-venue
  state. Empty search text is the default browse-all path and loads the first
  bounded page from every supported venue instead of becoming a no-op. The
  desktop command response also exposes secret-free pagination metadata:
  Polymarket uses Gamma offset pagination, Kalshi uses documented market
  cursors, and React sees only normalized `hasMore`/next-page state.
  Polymarket discovery is implemented through the official Rust SDK Gamma
  client; Kalshi public REST search uses the documented Trade API host first
  and the documented elections host as fallback. Kalshi `GET /markets`
  supports cursor, ticker, event, series, status, and timestamp filters rather
  than a public free-text market search parameter, so typed Kalshi queries use a
  bounded cursor scan and exact-looking `KX...`/hyphenated queries try the
  documented `tickers` filter first. Any `401`/`403` remains
  `provider_credentials_required`.
- The desktop search rail renders the aggregate search message and the
  individual venue diagnostics together. Each provider state must expose status,
  connection mode, data freshness, visible result count, next-page availability,
  and its latest message/error so one connected venue cannot hide another
  venue's blocker.
- The direct all/Polymarket/Kalshi filters must also show visible result counts
  for the current unified result list, so the aggregate market count is readable
  by venue without switching modes.
- `market_get_order_book` resolves a selected provider-backed market/outcome and
  returns normalized bid/ask levels for the ladder. Polymarket uses the
  official Rust SDK Gamma/CLOB clients for market resolution and order-book
  bootstrap; Kalshi uses the official public orderbook path when access works
  and maps credential-required responses explicitly.
- `market_subscribe` returns visible streaming state. Kalshi remains
  `credentials-required`; Polymarket returns `unavailable` with REST snapshot as
  the documented fallback until a safe persistent Tauri WebSocket
  transport/session exists.
- The desktop UI labels this surface as stream state so a provider snapshot can
  be visibly usable even when the persistent WebSocket path is blocked or
  unavailable.
- Fixture or non-live data cannot be represented as provider success in the
  desktop view model, and renderer state remains free of `providerMetadata`,
  auth headers, credentials, and secrets.

Goal 04C audit fixes:

- Empty or whitespace-only searches initially returned a disconnected no-request
  state after the audit, but the product expectation was corrected on
  2026-06-03: empty search text now means browse all supported venues through
  the Tauri command boundary.
- Selected venue health distinguishes snapshot/order-book data availability
  from WebSocket subscription availability. Stream blockers remain visible in
  the ladder header, bottom strip, and selected venue summary.
- Tauri-side read-only provider HTTP requests use a bounded timeout so provider
  stalls do not leave the desktop command indefinitely in flight.
- The post-audit runtime correction strips the Kalshi `/trade-api/v2` prefix
  before applying documented fallback hosts, preventing duplicate paths such as
  `/trade-api/v2/trade-api/v2/markets`.
- Kalshi typed search is bounded: empty browse remains a single page, while
  non-empty text scans only a small number of cursor pages before returning the
  explicit venue state and next cursor for load-more.
- The unified search summary must expose partial provider blockers. If one
  venue returns markets and another venue is disconnected, credentials-required,
  or provider-error, the aggregate message includes connected venue counts and
  the blocked venue states instead of implying every provider succeeded.
- The market rail must keep those per-venue diagnostics visible beside the
  search results, including provider badge, connection mode, freshness, page
  state, visible result count, and the last error/message.
- Kalshi TLS/certificate transport failures are diagnosed explicitly as
  DNS/proxy/network-filtering candidates. The desktop runtime must not disable
  certificate validation or hardcode alternative DNS/IP routing to make Kalshi
  appear connected.

Remaining blockers after Goal 04C:

- No authenticated account/portfolio metrics are available.
- Kalshi real WebSocket connection cannot be marked connected until a valid
  Tauri-side/local credential provider can create official handshake headers.
- Polymarket WebSocket normalization exists in `packages/market-data`, but the
  desktop command path intentionally does not fake a live socket while no safe
  persistent Tauri-side WebSocket transport/session is configured.
- Real live execution remains blocked until the legal, geo, credential, risk,
  audit, and explicit human approval gates pass.

## Current official documentation references

- Polymarket Clients & SDKs: https://docs.polymarket.com/api-reference/clients-sdks
- Polymarket WebSocket overview: https://docs.polymarket.com/market-data/websocket/overview
- Polymarket WebSocket market channel: https://docs.polymarket.com/market-data/websocket/market-channel
- Kalshi SDKs: https://docs.kalshi.com/sdks/overview
- Kalshi market data quick start: https://docs.kalshi.com/getting_started/quick_start_market_data
- Kalshi WebSocket quick start: https://docs.kalshi.com/getting_started/quick_start_websockets
- Kalshi WebSocket API: https://docs.kalshi.com/websockets
- Kalshi orderbook WebSocket updates: https://docs.kalshi.com/websockets/orderbook-updates
