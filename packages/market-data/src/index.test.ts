import { describe, expect, it } from "vitest";

import type {
  NormalizedOrderBookSnapshot,
  TradableMarketRef,
} from "@prediction-ladder/core";
import { buildLadderRows } from "@prediction-ladder/core";

import {
  DEFAULT_MARKET_DATA_STALE_THRESHOLD_MS,
  KalshiMarketDataAdapter,
  PolymarketMarketDataAdapter,
  GOAL_04B_PROVIDER_RUNTIME_DOCUMENTATION,
  createConfiguredMarketResolveRequest,
  createFixtureMarketDataSource,
  createKalshiWebSocketHandshakeState,
  createMarketDataBootstrapStatus,
  isLiveMarketDataSource,
  markStreamStateIfStale,
  markStreamStateReconnecting,
  normalizeKalshiWebSocketMessage,
  normalizePolymarketWebSocketMessage,
  recoverStreamWithRestSnapshot,
  toRendererMarketDataUpdate,
  type MarketDataAdapterErrorReason,
  type MarketDataHttpClient,
  type MarketDataAdapter,
  type MarketDataResult,
  type MarketDiscoveryAdapter,
  type MarketDataStreamState,
  type NormalizedStreamUpdate,
} from "./index";

const now = new Date("2026-06-03T10:00:05.000Z");
const freshTimestamp = "2026-06-03T10:00:00.000Z";
const staleTimestamp = "2026-06-03T09:59:40.000Z";

function routeByUrl(routes: Record<string, unknown>): MarketDataHttpClient {
  return async (request) => {
    const response = routes[request.url];

    if (response === undefined) {
      return {
        status: 404,
        body: { error: "No fake route configured", url: request.url },
      };
    }

    if (typeof response === "function") {
      return (response as MarketDataHttpClient)(request);
    }

    return response as Awaited<ReturnType<MarketDataHttpClient>>;
  };
}

function polymarketAdapter(
  routes: Record<string, unknown>,
): PolymarketMarketDataAdapter {
  return new PolymarketMarketDataAdapter({
    gammaBaseUrl: "https://gamma.example.test",
    clobBaseUrl: "https://clob.example.test",
    httpClient: routeByUrl(routes),
    now: () => now,
  });
}

function kalshiAdapter(routes: Record<string, unknown>): KalshiMarketDataAdapter {
  return new KalshiMarketDataAdapter({
    baseUrl: "https://kalshi.example.test/trade-api/v2",
    httpClient: routeByUrl(routes),
    now: () => now,
  });
}

function expectOk<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected ok result, got ${JSON.stringify(result.error)}`);
  }

  return result.value;
}

function expectError<T>(
  result:
    | { ok: true; value: T }
    | { ok: false; error: { reason: MarketDataAdapterErrorReason } },
  reason: MarketDataAdapterErrorReason,
) {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error(`Expected error result, got ${JSON.stringify(result.value)}`);
  }

  expect(result.error.reason).toBe(reason);
}

const polymarketMarketPayload = {
  id: "pm-market-1",
  question: "Will the Fed cut rates in June 2026?",
  active: true,
  closed: false,
  archived: false,
  enableOrderBook: true,
  conditionId: "condition-1",
  outcomes: '["Yes","No"]',
  clobTokenIds: '["pm-token-yes","pm-token-no"]',
  volume: "12000",
  liquidity: "3400",
};

const polymarketBookPayload = {
  market: "condition-1",
  asset_id: "pm-token-yes",
  timestamp: freshTimestamp,
  hash: "book-hash",
  bids: [
    { price: "0.49", size: "7.00" },
    { price: "0.50", size: "12.00" },
  ],
  asks: [
    { price: "0.53", size: "8.00" },
    { price: "0.52", size: "5.00" },
  ],
  min_order_size: "5",
  tick_size: "0.01",
  neg_risk: false,
  last_trade_price: "0.50",
};

const kalshiMarketPayload = {
  ticker: "KX-FEDCUT-26JUN",
  event_ticker: "KX-FEDCUT",
  title: "Will the Fed cut rates in June 2026?",
  subtitle: "Federal Reserve target rate",
  status: "open",
  volume_fp: "12000.00",
  liquidity_dollars: "3400.00",
  price_ranges: [{ start: "0.0100", end: "0.9900", step: "0.0100" }],
};

const kalshiBookPayload = {
  orderbook_fp: {
    yes_dollars: [
      ["0.4900", "7.00"],
      ["0.5000", "12.00"],
    ],
    no_dollars: [
      ["0.4800", "5.00"],
      ["0.4700", "8.00"],
    ],
  },
};

describe("market-data bootstrap status", () => {
  it("keeps provider integration scoped outside the core package", () => {
    expect(createMarketDataBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/market-data",
      boundary: "provider-neutral market-data ports, adapters, and streaming runtime",
      boundaryReady: true,
      implementationStatus: "official_runtime_streaming_ready",
    });
  });

  it("documents official provider runtime choices before endpoint coding", () => {
    expect(GOAL_04B_PROVIDER_RUNTIME_DOCUMENTATION).toEqual([
      expect.objectContaining({
        providerId: "polymarket",
        clientMode: "direct_documented_client",
        websocketAccess: expect.stringContaining("does not require auth"),
      }),
      expect.objectContaining({
        providerId: "kalshi",
        clientMode: "official_openapi_asyncapi",
        websocketAccess: expect.stringContaining("requires authenticated handshake"),
      }),
    ]);
  });
});

describe("market-data provider ports", () => {
  const tradableRef: TradableMarketRef = {
    providerId: "polymarket",
    marketId: "pm-election-2026",
    outcomeId: "pm-token-yes",
    currency: "USDC",
    tickSize: "0.01",
    marketStatus: "open",
    freshness: "fresh",
  };
  const snapshot: NormalizedOrderBookSnapshot = {
    marketRef: tradableRef,
    capturedAt: "2026-06-03T10:00:00.000Z",
    bids: [{ price: "0.5", size: "12" }],
    asks: [{ price: "0.52", size: "5" }],
    tickSize: "0.01",
    freshness: "fresh",
    connectionMode: "snapshot",
    providerMetadata: { sourceShape: "polymarket_clob" },
  };

  it("keeps fixture-shaped data explicit and distinct from live provider success", async () => {
    const fixtureSource = createFixtureMarketDataSource("polymarket-clob-book");
    const fixtureResult: MarketDataResult<NormalizedOrderBookSnapshot> = {
      ok: true,
      value: {
        data: snapshot,
        source: fixtureSource,
      },
    };
    const adapter: MarketDataAdapter = {
      providerId: "polymarket",
      getOrderBook: async () => fixtureResult,
    };
    const result = await adapter.getOrderBook(tradableRef);

    expect(isLiveMarketDataSource(fixtureSource)).toBe(false);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.source.kind).toBe("official_fixture");
      expect(result.value.data.marketRef.providerId).toBe("polymarket");
    }
  });

  it("returns explicit adapter errors for unresolved provider data", async () => {
    const discovery: MarketDiscoveryAdapter = {
      providerId: "kalshi",
      searchMarkets: async () => ({
        ok: false,
        error: {
          reason: "provider_credentials_required",
          message: "Kalshi official access must be validated before account data use.",
        },
      }),
      resolveMarket: async () => ({
        ok: false,
        error: {
          reason: "market_not_found",
          message: "No matching real provider market was resolved.",
        },
      }),
    };
    const searchResult = await discovery.searchMarkets({ query: "fed" });
    const resolveResult = await discovery.resolveMarket({
      providerId: "kalshi",
      marketId: "KX-FED-2026",
      outcomeId: "yes",
    });

    expect(searchResult).toEqual({
      ok: false,
      error: {
        reason: "provider_credentials_required",
        message: "Kalshi official access must be validated before account data use.",
      },
    });
    expect(resolveResult).toEqual({
      ok: false,
      error: {
        reason: "market_not_found",
        message: "No matching real provider market was resolved.",
      },
    });
  });
});

describe("provider read-only adapters", () => {
  it("normalizes Polymarket and Kalshi books into the same ladder-facing rows", async () => {
    const polymarket = polymarketAdapter({
      "https://gamma.example.test/markets/pm-market-1": {
        status: 200,
        body: polymarketMarketPayload,
      },
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 200,
        body: polymarketBookPayload,
      },
    });
    const kalshi = kalshiAdapter({
      "https://kalshi.example.test/trade-api/v2/markets?tickers=KX-FEDCUT-26JUN&limit=1&status=open": {
        status: 200,
        body: { markets: [kalshiMarketPayload], cursor: "" },
      },
      "https://kalshi.example.test/trade-api/v2/markets/KX-FEDCUT-26JUN/orderbook": {
        status: 200,
        body: kalshiBookPayload,
      },
    });

    const polymarketRef = expectOk(
      await polymarket.resolveMarket({
        providerId: "polymarket",
        marketId: "pm-market-1",
        outcomeId: "pm-token-yes",
      }),
    ).data;
    const kalshiRef = expectOk(
      await kalshi.resolveMarket({
        providerId: "kalshi",
        marketId: "KX-FEDCUT-26JUN",
        outcomeId: "yes",
      }),
    ).data;
    const polymarketBook = expectOk(await polymarket.getOrderBook(polymarketRef)).data;
    const kalshiBook = expectOk(await kalshi.getOrderBook(kalshiRef)).data;

    expect(polymarketBook.marketRef.providerId).toBe("polymarket");
    expect(kalshiBook.marketRef.providerId).toBe("kalshi");
    expect(buildLadderRows(polymarketBook)).toEqual(buildLadderRows(kalshiBook));
    expect(polymarketBook.providerMetadata?.sourceShape).toBe("polymarket_clob_book");
    expect(kalshiBook.providerMetadata?.sourceShape).toBe("kalshi_yes_no_book");
  });

  it("discovers open markets without treating provider-specific payloads as domain objects", async () => {
    const polymarket = polymarketAdapter({
      "https://gamma.example.test/markets?active=true&closed=false&limit=10": {
        status: 200,
        body: [polymarketMarketPayload],
      },
    });
    const kalshi = kalshiAdapter({
      "https://kalshi.example.test/trade-api/v2/markets?limit=10&status=open": {
        status: 200,
        body: { markets: [kalshiMarketPayload], cursor: "next" },
      },
    });

    const polymarketSearch = expectOk(
      await polymarket.searchMarkets({ query: "fed", limit: 10 }),
    );
    const kalshiSearch = expectOk(await kalshi.searchMarkets({ query: "fed", limit: 10 }));

    expect(polymarketSearch.connectionMode).toBe("polling_fallback");
    expect(kalshiSearch.connectionMode).toBe("polling_fallback");
    expect(
      polymarketSearch.data.markets[0]?.outcomes.map((outcome) => outcome.outcomeId),
    ).toEqual(["pm-token-yes", "pm-token-no"]);
    expect(kalshiSearch.data.markets[0]?.outcomes.map((outcome) => outcome.outcomeId)).toEqual([
      "yes",
      "no",
    ]);
    expect(polymarketSearch.data.markets[0]?.providerMetadata?.sourceShape).toBe(
      "polymarket_gamma_market",
    );
    expect(kalshiSearch.data.markets[0]?.providerMetadata?.sourceShape).toBe(
      "kalshi_market",
    );
  });

  it("keeps configured real-market fallback as a resolve request, not a provider success", () => {
    const result = expectOk(
      createConfiguredMarketResolveRequest({
        providerId: "kalshi",
        marketId: "KX-FEDCUT-26JUN",
        outcomeId: "yes",
        outcomeLabel: "Yes",
        configKey: "MARKET_FALLBACK_MARKET_ID",
      }),
    );

    expect(result.source.kind).toBe("configured_real_market");
    expect(result.freshness).toBeUndefined();
    expect(result.connectionMode).toBeUndefined();
    expect(result.data).toEqual({
      providerId: "kalshi",
      marketId: "KX-FEDCUT-26JUN",
      outcomeId: "yes",
      providerMetadata: { outcomeLabel: "Yes" },
    });
  });

  it("maps malformed provider payloads to explicit invalid-payload errors", async () => {
    const adapter = polymarketAdapter({
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 200,
        body: {
          ...polymarketBookPayload,
          bids: [{ price: "bad", size: "12.00" }],
        },
      },
    });

    expectError(await adapter.getOrderBook(createPolymarketRef()), "invalid_payload");
  });

  it("marks stale provider snapshots explicitly instead of returning them as success", async () => {
    const adapter = polymarketAdapter({
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 200,
        body: { ...polymarketBookPayload, timestamp: staleTimestamp },
      },
    });

    expect(DEFAULT_MARKET_DATA_STALE_THRESHOLD_MS).toBe(10_000);
    expectError(await adapter.getOrderBook(createPolymarketRef()), "stale_data");
  });

  it("rejects empty depth without inventing ladder liquidity", async () => {
    const adapter = polymarketAdapter({
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 200,
        body: { ...polymarketBookPayload, bids: [], asks: [] },
      },
    });

    expectError(await adapter.getOrderBook(createPolymarketRef()), "empty_liquidity");
  });

  it("rejects unsupported or closed markets during resolution", async () => {
    const adapter = polymarketAdapter({
      "https://gamma.example.test/markets/pm-market-1": {
        status: 200,
        body: {
          ...polymarketMarketPayload,
          active: false,
          closed: true,
          enableOrderBook: false,
        },
      },
    });

    expectError(
      await adapter.resolveMarket({
        providerId: "polymarket",
        marketId: "pm-market-1",
        outcomeId: "pm-token-yes",
      }),
      "unsupported_market",
    );
  });

  it("does not treat Kalshi markets with missing status as open", async () => {
    const adapter = kalshiAdapter({
      "https://kalshi.example.test/trade-api/v2/markets?tickers=KX-FEDCUT-26JUN&limit=1&status=open": {
        status: 200,
        body: {
          markets: [{ ...kalshiMarketPayload, status: undefined }],
          cursor: "",
        },
      },
    });

    expectError(
      await adapter.resolveMarket({
        providerId: "kalshi",
        marketId: "KX-FEDCUT-26JUN",
        outcomeId: "yes",
      }),
      "unsupported_market",
    );
  });

  it("rejects missing outcomes and invalid tick sizes before creating tradable refs", async () => {
    const missingOutcomeAdapter = polymarketAdapter({
      "https://gamma.example.test/markets/pm-market-1": {
        status: 200,
        body: polymarketMarketPayload,
      },
    });
    const invalidTickAdapter = polymarketAdapter({
      "https://gamma.example.test/markets/pm-market-1": {
        status: 200,
        body: polymarketMarketPayload,
      },
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 200,
        body: { ...polymarketBookPayload, tick_size: "0" },
      },
    });

    expectError(
      await missingOutcomeAdapter.resolveMarket({
        providerId: "polymarket",
        marketId: "pm-market-1",
        outcomeId: "missing-token",
      }),
      "outcome_not_found",
    );
    expectError(
      await invalidTickAdapter.resolveMarket({
        providerId: "polymarket",
        marketId: "pm-market-1",
        outcomeId: "pm-token-yes",
      }),
      "invalid_tick_size",
    );
  });

  it("keeps provider network and official-access failures explicit", async () => {
    const networkAdapter = polymarketAdapter({
      "https://clob.example.test/book?token_id=pm-token-yes": async () => {
        throw new Error("offline");
      },
    });
    const providerErrorAdapter = polymarketAdapter({
      "https://clob.example.test/book?token_id=pm-token-yes": {
        status: 503,
        body: { error: "service unavailable" },
      },
    });
    const kalshiCredentialAdapter = kalshiAdapter({
      "https://kalshi.example.test/trade-api/v2/markets/KX-FEDCUT-26JUN/orderbook": {
        status: 401,
        body: { error: "credential required" },
      },
    });

    expectError(await networkAdapter.getOrderBook(createPolymarketRef()), "network_error");
    expectError(
      await providerErrorAdapter.getOrderBook(createPolymarketRef()),
      "provider_status_unknown",
    );
    expectError(
      await kalshiCredentialAdapter.getOrderBook(createKalshiRef()),
      "provider_credentials_required",
    );
  });
});

describe("official provider WebSocket streaming runtime", () => {
  it("normalizes Polymarket WebSocket book and price-change messages", () => {
    const marketRef = createPolymarketRef();
    const book = expectOk(
      normalizePolymarketWebSocketMessage(
        {
          event_type: "book",
          asset_id: "pm-token-yes",
          market: "condition-1",
          bids: [
            { price: ".49", size: "7.00" },
            { price: ".50", size: "12.00" },
          ],
          asks: [
            { price: ".53", size: "8.00" },
            { price: ".52", size: "5.00" },
          ],
          timestamp: String(Date.parse(freshTimestamp)),
          hash: "stream-book-hash",
        },
        marketRef,
        { now: () => now },
      ),
    );

    expect(book.updateType).toBe("snapshot");
    expect(book.snapshot?.connectionMode).toBe("streaming");
    expect(book.snapshot?.bids[0]).toEqual({ price: "0.5", size: "12" });
    expect(book.snapshot?.asks[0]).toEqual({ price: "0.52", size: "5" });

    const next = expectOk(
      normalizePolymarketWebSocketMessage(
        {
          event_type: "price_change",
          market: "condition-1",
          timestamp: String(Date.parse("2026-06-03T10:00:06.000Z")),
          price_changes: [
            {
              asset_id: "pm-token-yes",
              price: "0.51",
              size: "4.00",
              side: "BUY",
            },
          ],
        },
        marketRef,
        {
          previousSnapshot: requireSnapshot(book),
          now: () => new Date("2026-06-03T10:00:07.000Z"),
        },
      ),
    );

    expect(next.updateType).toBe("incremental");
    expect(next.snapshot?.bids[0]).toEqual({ price: "0.51", size: "4" });
  });

  it("normalizes Kalshi WebSocket snapshots and deltas when credentials are already gated ready", () => {
    const marketRef = createKalshiRef();
    const snapshot = expectOk(
      normalizeKalshiWebSocketMessage(
        {
          type: "orderbook_snapshot",
          sid: 2,
          seq: 2,
          msg: {
            market_ticker: "KX-FEDCUT-26JUN",
            market_id: "kalshi-market-id",
            yes_dollars_fp: [
              ["0.4900", "7.00"],
              ["0.5000", "12.00"],
            ],
            no_dollars_fp: [
              ["0.4800", "5.00"],
              ["0.4700", "8.00"],
            ],
          },
        },
        marketRef,
        { now: () => now },
      ),
    );

    expect(snapshot.updateType).toBe("snapshot");
    expect(snapshot.snapshot?.providerMetadata?.kalshiSeq).toBe(2);
    expect(snapshot.snapshot?.bids[0]).toEqual({ price: "0.5", size: "12" });
    expect(snapshot.snapshot?.asks[0]).toEqual({ price: "0.52", size: "5" });

    const delta = expectOk(
      normalizeKalshiWebSocketMessage(
        {
          type: "orderbook_delta",
          sid: 2,
          seq: 3,
          msg: {
            market_ticker: "KX-FEDCUT-26JUN",
            market_id: "kalshi-market-id",
            price_dollars: "0.5100",
            delta_fp: "3.00",
            side: "yes",
            ts_ms: Date.parse("2026-06-03T10:00:06.000Z"),
          },
        },
        marketRef,
        {
          previousSnapshot: requireSnapshot(snapshot),
          now: () => new Date("2026-06-03T10:00:07.000Z"),
        },
      ),
    );

    expect(delta.updateType).toBe("incremental");
    expect(delta.snapshot?.providerMetadata?.kalshiSeq).toBe(3);
    expect(delta.snapshot?.bids[0]).toEqual({ price: "0.51", size: "3" });
  });

  it("treats Kalshi WebSocket authentication as a credential gate", () => {
    const state = createKalshiWebSocketHandshakeState(
      { status: "missing", reason: "No local Kalshi credential provider is configured." },
      () => now,
    );
    const error = normalizeKalshiWebSocketMessage(
      {
        type: "error",
        msg: { code: 9, msg: "Authentication required" },
      },
      createKalshiRef(),
    );

    expect(state.status).toBe("credentials-required");
    expect(state.freshness).toBe("disconnected");
    expectError(error, "provider_credentials_required");
  });

  it("ignores out-of-order stream updates without mutating the current book", () => {
    const previousSnapshot = createPolymarketStreamSnapshot();
    const result = expectOk(
      normalizePolymarketWebSocketMessage(
        {
          event_type: "price_change",
          market: "condition-1",
          timestamp: String(Date.parse("2026-06-03T09:59:59.000Z")),
          price_changes: [
            {
              asset_id: "pm-token-yes",
              price: "0.55",
              size: "99.00",
              side: "BUY",
            },
          ],
        },
        createPolymarketRef(),
        { previousSnapshot, now: () => now },
      ),
    );

    expect(result.updateType).toBe("ignored_out_of_order");
    expect(result.snapshot).toEqual(previousSnapshot);
  });

  it("models reconnect and stale stream states explicitly", () => {
    const connectedState: MarketDataStreamState = {
      providerId: "polymarket",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      message: "stream connected",
      lastMessageAt: freshTimestamp,
      snapshot: createPolymarketStreamSnapshot(),
    };
    const stale = markStreamStateIfStale(
      connectedState,
      () => new Date("2026-06-03T10:00:11.000Z"),
      10_000,
    );
    const reconnecting = markStreamStateReconnecting(stale, () => now);

    expect(stale.status).toBe("stale");
    expect(stale.freshness).toBe("stale");
    expect(reconnecting.status).toBe("reconnecting");
    expect(reconnecting.nextRetryAt).toBe("2026-06-03T10:00:06.000Z");
  });

  it("maps stale and malformed stream messages to deterministic errors", () => {
    expectError(
      normalizePolymarketWebSocketMessage(
        {
          event_type: "book",
          asset_id: "pm-token-yes",
          market: "condition-1",
          bids: [{ price: "0.50", size: "12.00" }],
          asks: [{ price: "0.52", size: "5.00" }],
          timestamp: String(Date.parse(staleTimestamp)),
        },
        createPolymarketRef(),
        { now: () => now },
      ),
      "stale_data",
    );
    expectError(
      normalizePolymarketWebSocketMessage("{not json", createPolymarketRef()),
      "invalid_payload",
    );
  });

  it("keeps Kalshi malformed stream errors attached to Kalshi for renderer state", () => {
    const result = normalizeKalshiWebSocketMessage("{not json", createKalshiRef());

    expectError(result, "invalid_payload");

    if (result.ok) {
      throw new Error("Expected malformed Kalshi stream message to fail");
    }

    expect(result.error.providerMetadata?.providerId).toBe("kalshi");

    const rendererUpdate = toRendererMarketDataUpdate({
      ok: false,
      error: result.error,
    });
    const serialized = JSON.stringify(rendererUpdate);

    expect(rendererUpdate.providerId).toBe("kalshi");
    expect(rendererUpdate.status).toBe("invalid");
    expect(serialized).not.toContain("providerMetadata");
  });

  it("recovers from stream interruption through REST snapshot fallback", async () => {
    const marketRef = createPolymarketRef();
    const snapshot = createPolymarketStreamSnapshot();
    const adapter: MarketDataAdapter = {
      providerId: "polymarket",
      getOrderBook: async () => ({
        ok: true,
        value: {
          data: snapshot,
          source: { kind: "official_live", fetchedAt: now.toISOString() },
          freshness: "fresh",
          connectionMode: "snapshot",
        },
      }),
    };
    const recovered = await recoverStreamWithRestSnapshot(
      {
        providerId: "polymarket",
        status: "reconnecting",
        freshness: "stale",
        connectionMode: "streaming",
        message: "stream interrupted",
      },
      adapter,
      marketRef,
      () => now,
    );

    expect(recovered.status).toBe("connected");
    expect(recovered.connectionMode).toBe("polling_fallback");
    expect(recovered.snapshot?.connectionMode).toBe("polling_fallback");
  });

  it("projects only normalized secret-free market data to the renderer", () => {
    const update: NormalizedStreamUpdate = {
      providerId: "polymarket",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "snapshot",
      message: "stream update",
      snapshot: {
        ...createPolymarketStreamSnapshot(),
        marketRef: {
          ...createPolymarketStreamSnapshot().marketRef,
          providerMetadata: {
            apiKey: "must-not-cross",
            secret: "must-not-cross",
          },
        },
        providerMetadata: {
          authHeader: "must-not-cross",
          sourceShape: "polymarket_wss_book",
        },
      },
      providerMetadata: {
        passphrase: "must-not-cross",
      },
    };
    const rendererUpdate = toRendererMarketDataUpdate(update);
    const serialized = JSON.stringify(rendererUpdate);

    expect(rendererUpdate.orderBook?.marketRef.providerId).toBe("polymarket");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("authHeader");
    expect(serialized).not.toContain("passphrase");
    expect(serialized).toContain("bids");
    expect(serialized).toContain("asks");
  });
});

function createPolymarketRef(): TradableMarketRef {
  return {
    providerId: "polymarket",
    marketId: "pm-market-1",
    outcomeId: "pm-token-yes",
    currency: "USDC",
    tickSize: "0.01",
    marketStatus: "open",
    freshness: "fresh",
    providerMetadata: { conditionId: "condition-1" },
  };
}

function createPolymarketStreamSnapshot(): NormalizedOrderBookSnapshot {
  return {
    marketRef: createPolymarketRef(),
    capturedAt: freshTimestamp,
    bids: [
      { price: "0.5", size: "12" },
      { price: "0.49", size: "7" },
    ],
    asks: [
      { price: "0.52", size: "5" },
      { price: "0.53", size: "8" },
    ],
    tickSize: "0.01",
    freshness: "fresh",
    connectionMode: "streaming",
    providerMetadata: {
      sourceShape: "polymarket_wss_book",
      eventType: "book",
    },
  };
}

function createKalshiRef(): TradableMarketRef {
  return {
    providerId: "kalshi",
    marketId: "KX-FEDCUT-26JUN",
    outcomeId: "yes",
    currency: "USD",
    tickSize: "0.01",
    marketStatus: "open",
    freshness: "fresh",
    providerMetadata: { selectedSide: "yes" },
  };
}

function requireSnapshot(update: NormalizedStreamUpdate): NormalizedOrderBookSnapshot {
  if (update.snapshot === undefined) {
    throw new Error(`Expected stream update to include snapshot: ${update.message}`);
  }

  return update.snapshot;
}
