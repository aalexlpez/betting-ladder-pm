# Market Selection Spec

Status: implementation source of truth for selecting real providers, markets, outcomes, and venue-specific identifiers.

## Scope decisions

| Decision | Reason | Alternatives considered | Rejected alternatives | Source / evidence |
|---|---|---|---|---|
| Use provider-neutral market selection | Prevents Polymarket or Kalshi assumptions from leaking into core/domain code | Single-provider market picker | Domain coupled to one provider | Current product decision |
| User must select provider, market, and outcome | Live orders target provider-specific instruments, not vague event names | Auto-select first outcome | Ambiguous live route | Provider order-book/execution models |
| Reject closed/resolved/archived/unknown markets for trading | Prevents unusable live paths | Show everything and fail later | Runtime surprise during live smoke | Market safety policy |
| Configured market fallback is allowed only with real provider identifiers | Keeps demo stable if search is incomplete without pretending fixture data is live | Search-only | Hard-coded domain logic or mock market data as product demo | 5-day / 40-hour launch-readiness constraint |

## Discovery path

1. User selects or filters by provider: `polymarket` or `kalshi`.
2. Search or load markets from the provider adapter.
3. Display event/market title, outcomes, liquidity/volume if available, status, and provider-specific identifiers.
4. User selects one market and one outcome/instrument.
5. Adapter resolves normalized fields:
   - `providerId`;
   - `marketId`;
   - `outcomeId`;
   - selected outcome name;
   - `tickSize`;
   - market status flags;
   - provider metadata required for execution or account metrics.

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

## Read-only market data path

Minimum implementation path:

```txt
Provider selection
  -> market discovery/configured fallback
  -> selected outcome/instrument
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
