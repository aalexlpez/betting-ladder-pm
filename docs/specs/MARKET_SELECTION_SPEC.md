# Market Selection Spec

Status: implementation source of truth for selecting real providers, markets, outcomes, and venue-specific identifiers.

## Scope decisions

| Decision | Reason | Alternatives considered | Rejected alternatives | Source / evidence |
|---|---|---|---|---|
| Use provider-neutral market selection | Prevents Polymarket or Kalshi assumptions from leaking into core/domain code | Single-provider market picker | Domain coupled to one provider | Current product decision |
| User must select a concrete provider-backed market and outcome | Live orders target provider-specific instruments, not vague event names | Auto-select first outcome | Ambiguous live route | Provider order-book/execution models |
| Desktop market discovery should be unified across venues | The product should feel like one prediction-market ladder terminal, not a Polymarket/Kalshi mode switch | Provider-first switch as the primary workflow | Splits the product into venue silos and weakens the normalized-domain model | Current product decision after Goal 04 |
| Reject closed/resolved/archived/unknown markets for trading | Prevents unusable live paths | Show everything and fail later | Runtime surprise during live smoke | Market safety policy |
| Configured market fallback is allowed only with real provider identifiers | Keeps demo stable if search is incomplete without pretending fixture data is live | Search-only | Hard-coded domain logic or mock market data as product demo | 5-day / 40-hour launch-readiness constraint |

## Discovery path

1. User searches or browses one unified market surface across supported providers.
2. Provider may be used as a direct filter, but it is not the primary product mode.
3. Search or load paginated market pages from provider adapters through the normalized market-data runtime.
4. Infinite-scroll or load-more UI may request more bounded pages, preserving provider-specific pagination tokens behind the Tauri/provider boundary.
   Providers without a documented free-text market search endpoint may use
   bounded cursor scans or exact identifier filters instead of pretending a
   broader search API exists.
5. Display event/market title, outcomes, liquidity/volume if available, status, and a compact provider badge/icon.
6. User selects one provider-backed market and one outcome/instrument.
7. Adapter resolves normalized fields:
   - `providerId`;
   - `marketId`;
   - `outcomeId`;
   - `currency`;
   - selected outcome name;
   - `tickSize`;
   - `freshness`;
   - market status flags;
   - provider metadata required for execution or account metrics.

The resolved executable/read-only ladder target is `TradableMarketRef`, not a
provider-specific Polymarket or Kalshi market object. `MarketRef` may remain
display-only, but `TradableMarketRef` requires provider, market, outcome,
currency, tick size, open status, and fresh data.

## Provider identifier mapping

| Provider | Required adapter metadata before trading |
|---|---|
| Polymarket | `conditionId`, selected CLOB token ID, CLOB token mapping, `tickSize`, `negRisk`, market status flags. |
| Kalshi | market ticker, selected outcome side, order-book representation, `tickSize`, market status flags, and any authenticated trading/account prerequisites. |

## Required market status checks

Reject for live and live-dry-run trading if:

- provider is unsupported;
- market is closed;
- market is resolved/settled;
- market is archived or inactive;
- selected outcome/instrument is missing;
- provider-specific identifier mapping cannot be parsed;
- `tickSize` is missing or invalid;
- provider risk metadata required for execution is missing or unknown;
- data is stale beyond the configured threshold;
- visible liquidity/depth is missing for the selected outcome;
- order book cannot be loaded;
- geoblock/jurisdiction status is blocked or unknown for live.

The UI may still display read-only information for rejected markets if clearly marked read-only.

## Unified multi-venue UI rule

The desktop app should present one ladder terminal. Polymarket and Kalshi should
appear as venue metadata, such as a compact badge/icon, not as separate app modes.
Provider identity must still remain visible when it affects legal eligibility,
currency, credential state, fees, account metrics, order semantics, or execution
safety. The app must not merge liquidity or order books across providers unless a
later explicit cross-venue aggregation decision is approved.

The market list may merge search results from multiple providers into one
scrollable rail, but each row must retain provider identity and selection must
still target exactly one provider-backed market/outcome. Pagination cursors,
offsets, raw provider payloads, and provider SDK clients stay outside React.

## Read-only market data path

Minimum implementation path:

```txt
Unified market discovery/configured fallback
  -> selected outcome/instrument
  -> TradableMarketRef
  -> provider order book snapshot
  -> normalized bids/asks
  -> LadderModel rows
  -> freshness state
```

## Configured real-market fallback

For demo reliability, allow local configuration of real provider markets:

```env
MARKET_FALLBACK_PROVIDER=
MARKET_FALLBACK_MARKET_ID=
MARKET_FALLBACK_OUTCOME_ID=
MARKET_FALLBACK_OUTCOME_LABEL=
```

Provider-specific optional values may also exist, such as Polymarket condition/token IDs or Kalshi tickers. Fallback values are not domain constants, fixtures, or mock markets. They are local demo configuration and must not bypass market status checks.

## Requirements before trading

Before any live order submission:

- legal/live gate approved;
- geoblock/jurisdiction check pass;
- credentials available via approved local source;
- selected provider and market pass status checks;
- selected outcome/instrument, tick size, and provider execution metadata resolved;
- liquidity and freshness checks pass;
- account metrics required by risk policy are known or the action is blocked;
- order intent validated by risk policy;
- audit log enabled.

## Fixture expectations

Market-data goals should introduce official-shape payload fixtures for deterministic tests before relying on live endpoints.

Provider-neutral fixture cases:

- open valid market;
- closed/resolved market;
- missing selected outcome;
- invalid provider identifier mapping;
- missing tick size;
- stale data;
- empty depth;
- invalid payload.

Adapters must normalize these fixtures into explicit domain states. Fixtures are test artifacts only. Unknown market status, unknown outcome mapping, unknown tick size, stale data, missing account metrics for live risk, or empty liquidity must block trading and show a deterministic reason.
