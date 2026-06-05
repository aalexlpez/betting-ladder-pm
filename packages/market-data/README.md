# @prediction-ladder/market-data

Provider-neutral market-data contracts, read-only Polymarket/Kalshi adapters, and
the Goal 04B official-provider streaming runtime boundary.

What is implemented:

- official public REST discovery/resolve/order-book adapter boundaries for Polymarket and Kalshi;
- official-provider runtime documentation for Polymarket and Kalshi client choices;
- WebSocket-first stream normalizers for official Polymarket market-channel messages;
- Kalshi WebSocket order-book message normalizers plus an explicit credential-required handshake gate;
- reconnect, stale timeout, malformed-message, out-of-order update, and REST recovery state helpers;
- renderer-safe market-data projection that strips provider metadata and secret-like fields;
- Tauri command-boundary response shapes for `market_search`, `market_get_order_book`, and `market_subscribe`;
- normalization into `@prediction-ladder/core` `TradableMarketRef`, `NormalizedOutcome`, and `NormalizedOrderBookSnapshot` contracts;
- explicit stale, unavailable, malformed, unsupported-market, provider-error, credential-required, and empty-liquidity errors;
- configured real-market fallback request helper that does not count as provider success;
- fixture source markers that cannot be treated as live provider data.

What is intentionally not implemented here:

- live order placement or cancellation;
- account balances, positions, or portfolio metrics;
- provider SDKs, credentials, private keys, or renderer secret access.
- geoblock, authentication, or credential bypasses.

Follow repository boundaries in `docs/architecture/MONOREPO_STRUCTURE.md`.
