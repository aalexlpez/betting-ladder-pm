import {
  PROVIDER_IDS,
  compareDecimalStrings,
  createTradableMarketRef,
  decimalSubtract,
  normalizeDecimalString,
  normalizeOrderBookLevels,
  validatePositiveDecimalString,
  type DataFreshness,
  type MarketStatus,
  type NormalizedOrderBookSnapshot,
  type NormalizedOutcome,
  type OrderBookLevel,
  type ProviderId,
  type TradableMarketRef,
} from "@prediction-ladder/core";

import type {
  MarketDataAdapter,
  MarketDataAdapterError,
  MarketDataAdapterErrorReason,
  MarketDataResult,
  MarketDiscoveryAdapter,
  MarketDiscoveryItem,
  MarketDiscoverySnapshot,
  MarketResolveRequest,
  MarketSearchRequest,
} from "./index";

export const DEFAULT_MARKET_DATA_STALE_THRESHOLD_MS = 10_000;
export const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
export const POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com";
export const KALSHI_BASE_URL =
  "https://external-api.kalshi.com/trade-api/v2";

export type MarketDataHttpRequest = {
  url: string;
  method?: "GET";
  headers?: Record<string, string>;
};

export type MarketDataHttpResponse = {
  status: number;
  body: unknown;
};

export type MarketDataHttpClient = (
  request: MarketDataHttpRequest,
) => Promise<MarketDataHttpResponse>;

export type ReadOnlyAdapterOptions = {
  httpClient?: MarketDataHttpClient;
  now?: () => Date;
  staleThresholdMs?: number;
};

export type PolymarketAdapterOptions = ReadOnlyAdapterOptions & {
  gammaBaseUrl?: string;
  clobBaseUrl?: string;
};

export type KalshiAdapterOptions = ReadOnlyAdapterOptions & {
  baseUrl?: string;
};

export type ConfiguredMarketFallback = {
  providerId?: ProviderId | string;
  marketId?: string;
  outcomeId?: string;
  outcomeLabel?: string;
  providerMetadata?: Record<string, unknown>;
  configKey?: string;
};

type LiveSuccessOptions = {
  fetchedAt: string;
  freshness?: DataFreshness;
  connectionMode?: "snapshot" | "polling_fallback";
  providerMetadata?: Record<string, unknown>;
};

type ProviderRuntime = {
  httpClient: MarketDataHttpClient;
  now: () => Date;
  staleThresholdMs: number;
};

type AdapterInternalResult<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; error: MarketDataAdapterError };

type PolymarketMarketMapping = {
  marketId: string;
  title: string;
  status: MarketStatus;
  outcomes: NormalizedOutcome[];
  conditionId?: string;
  enableOrderBook?: boolean;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  volume?: string;
  liquidity?: string;
  providerMetadata: Record<string, unknown>;
};

type KalshiMarketMapping = {
  marketId: string;
  title: string;
  status: MarketStatus;
  outcomes: NormalizedOutcome[];
  tickSize?: string;
  volume?: string;
  liquidity?: string;
  providerMetadata: Record<string, unknown>;
};

export class PolymarketMarketDataAdapter
  implements MarketDiscoveryAdapter, MarketDataAdapter
{
  readonly providerId = "polymarket" as const;

  private readonly gammaBaseUrl: string;
  private readonly clobBaseUrl: string;
  private readonly runtime: ProviderRuntime;

  constructor(options: PolymarketAdapterOptions = {}) {
    this.gammaBaseUrl = options.gammaBaseUrl ?? POLYMARKET_GAMMA_BASE_URL;
    this.clobBaseUrl = options.clobBaseUrl ?? POLYMARKET_CLOB_BASE_URL;
    this.runtime = createRuntime(options);
  }

  async searchMarkets(
    request: MarketSearchRequest,
  ): Promise<MarketDataResult<MarketDiscoverySnapshot>> {
    if (!supportsProviderRequest(request.providerId, this.providerId)) {
      return errorResult(
        "provider_not_supported",
        "Polymarket adapter cannot search the requested provider.",
      );
    }

    const fetchedAt = this.runtime.now().toISOString();
    const limit = normalizeLimit(request.limit);
    const url = buildProviderUrl(this.gammaBaseUrl, "/markets", {
      active: "true",
      closed: "false",
      limit: String(limit),
    });
    const payload = await loadProviderPayload(this.runtime.httpClient, url);

    if (!payload.ok) {
      return payload;
    }

    const markets = extractMarketArray(payload.value);

    if (!markets.ok) {
      return markets;
    }

    const query = request.query.trim().toLowerCase();
    const mappedMarkets = markets.value
      .map((market) => normalizePolymarketMarket(market))
      .filter((market): market is PolymarketMarketMapping => market !== undefined)
      .filter((market) => matchesQuery(market, query))
      .slice(0, limit)
      .map((market) => toDiscoveryItem(this.providerId, market));

    return successResult(
      {
        providerId: this.providerId,
        capturedAt: fetchedAt,
        markets: mappedMarkets,
        freshness: "fresh",
        connectionMode: "polling_fallback",
        providerMetadata: {
          sourceShape: "polymarket_gamma_markets",
          endpoint: "GET /markets",
        },
      },
      { fetchedAt, freshness: "fresh", connectionMode: "polling_fallback" },
    );
  }

  async resolveMarket(
    request: MarketResolveRequest,
  ): Promise<MarketDataResult<TradableMarketRef>> {
    if (request.providerId !== this.providerId) {
      return errorResult(
        "provider_not_supported",
        "Polymarket adapter cannot resolve the requested provider.",
      );
    }

    if (request.outcomeId === undefined || request.outcomeId.trim() === "") {
      return errorResult(
        "outcome_not_found",
        "A Polymarket CLOB token ID or outcome label is required.",
      );
    }

    const marketUrl = buildProviderUrl(
      this.gammaBaseUrl,
      `/markets/${encodeURIComponent(request.marketId)}`,
    );
    const payload = await loadProviderPayload(this.runtime.httpClient, marketUrl);

    if (!payload.ok) {
      return payload;
    }

    if (!isRecord(payload.value)) {
      return errorResult(
        "invalid_payload",
        "Polymarket market response was not an object.",
      );
    }

    const market = normalizePolymarketMarket(payload.value);

    if (market === undefined) {
      return errorResult(
        "invalid_payload",
        "Polymarket market response did not include usable market identifiers.",
      );
    }

    if (market.status !== "open" || market.enableOrderBook === false) {
      return errorResult(
        "unsupported_market",
        "Polymarket market is not open with an enabled CLOB order book.",
        market.providerMetadata,
      );
    }

    const selectedOutcome = findOutcome(market.outcomes, request.outcomeId);

    if (selectedOutcome === undefined) {
      return errorResult(
        "outcome_not_found",
        "Polymarket outcome token was not present in the market metadata.",
        market.providerMetadata,
      );
    }

    const bookUrl = buildProviderUrl(this.clobBaseUrl, "/book", {
      token_id: selectedOutcome.outcomeId,
    });
    const bookPayload = await loadProviderPayload(this.runtime.httpClient, bookUrl);

    if (!bookPayload.ok) {
      return bookPayload;
    }

    const bookHeader = readPolymarketBookHeader(
      bookPayload.value,
      selectedOutcome.outcomeId,
      this.runtime,
    );

    if (!bookHeader.ok) {
      return bookHeader;
    }

    const tradableRef = createTradableMarketRef({
      providerId: this.providerId,
      marketId: market.marketId,
      outcomeId: selectedOutcome.outcomeId,
      currency: "USDC",
      tickSize: bookHeader.value.tickSize,
      marketStatus: "open",
      freshness: "fresh",
      providerMetadata: {
        ...market.providerMetadata,
        ...bookHeader.value.providerMetadata,
        selectedOutcomeLabel: selectedOutcome.label,
      },
    });

    if (!tradableRef.ok) {
      return errorResult(
        mapTradableRefError(tradableRef.error.reason),
        "Polymarket market could not be converted into a tradable market ref.",
        market.providerMetadata,
      );
    }

    const fetchedAt = this.runtime.now().toISOString();

    return successResult(tradableRef.value, {
      fetchedAt,
      freshness: "fresh",
      providerMetadata: {
        sourceShape: "polymarket_gamma_market_plus_clob_header",
      },
    });
  }

  async getOrderBook(
    marketRef: TradableMarketRef,
  ): Promise<MarketDataResult<NormalizedOrderBookSnapshot>> {
    if (marketRef.providerId !== this.providerId) {
      return errorResult(
        "provider_not_supported",
        "Polymarket adapter cannot load an order book for another provider.",
      );
    }

    const url = buildProviderUrl(this.clobBaseUrl, "/book", {
      token_id: marketRef.outcomeId,
    });
    const payload = await loadProviderPayload(this.runtime.httpClient, url);

    if (!payload.ok) {
      return payload;
    }

    const snapshot = normalizePolymarketBookPayload(
      payload.value,
      marketRef,
      this.runtime,
      true,
    );

    if (!snapshot.ok) {
      return snapshot;
    }

    return successResult(snapshot.value, {
      fetchedAt: this.runtime.now().toISOString(),
      freshness: snapshot.value.freshness,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    });
  }
}

export class KalshiMarketDataAdapter
  implements MarketDiscoveryAdapter, MarketDataAdapter
{
  readonly providerId = "kalshi" as const;

  private readonly baseUrl: string;
  private readonly runtime: ProviderRuntime;

  constructor(options: KalshiAdapterOptions = {}) {
    this.baseUrl = options.baseUrl ?? KALSHI_BASE_URL;
    this.runtime = createRuntime(options);
  }

  async searchMarkets(
    request: MarketSearchRequest,
  ): Promise<MarketDataResult<MarketDiscoverySnapshot>> {
    if (!supportsProviderRequest(request.providerId, this.providerId)) {
      return errorResult(
        "provider_not_supported",
        "Kalshi adapter cannot search the requested provider.",
      );
    }

    const fetchedAt = this.runtime.now().toISOString();
    const limit = normalizeLimit(request.limit);
    const url = buildProviderUrl(this.baseUrl, "/markets", {
      limit: String(limit),
      status: "open",
    });
    const payload = await loadProviderPayload(this.runtime.httpClient, url);

    if (!payload.ok) {
      return payload;
    }

    const markets = extractKalshiMarkets(payload.value);

    if (!markets.ok) {
      return markets;
    }

    const query = request.query.trim().toLowerCase();
    const mappedMarkets = markets.value
      .map((market) => normalizeKalshiMarket(market))
      .filter((market): market is KalshiMarketMapping => market !== undefined)
      .filter((market) => matchesQuery(market, query))
      .slice(0, limit)
      .map((market) => toDiscoveryItem(this.providerId, market));

    return successResult(
      {
        providerId: this.providerId,
        capturedAt: fetchedAt,
        markets: mappedMarkets,
        freshness: "fresh",
        connectionMode: "polling_fallback",
        providerMetadata: {
          sourceShape: "kalshi_markets",
          endpoint: "GET /markets?status=open",
        },
      },
      { fetchedAt, freshness: "fresh", connectionMode: "polling_fallback" },
    );
  }

  async resolveMarket(
    request: MarketResolveRequest,
  ): Promise<MarketDataResult<TradableMarketRef>> {
    if (request.providerId !== this.providerId) {
      return errorResult(
        "provider_not_supported",
        "Kalshi adapter cannot resolve the requested provider.",
      );
    }

    const selectedSide = normalizeKalshiSide(request.outcomeId);

    if (selectedSide === undefined) {
      return errorResult(
        "outcome_not_found",
        "Kalshi market resolution requires outcomeId yes or no.",
      );
    }

    const url = buildProviderUrl(this.baseUrl, "/markets", {
      tickers: request.marketId,
      limit: "1",
      status: "open",
    });
    const payload = await loadProviderPayload(this.runtime.httpClient, url);

    if (!payload.ok) {
      return payload;
    }

    const markets = extractKalshiMarkets(payload.value);

    if (!markets.ok) {
      return markets;
    }

    const marketRecord = markets.value.find(
      (market) => isRecord(market) && getString(market, "ticker") === request.marketId,
    );

    if (marketRecord === undefined) {
      return errorResult(
        "market_not_found",
        "Kalshi market ticker was not returned by the official markets endpoint.",
      );
    }

    const market = normalizeKalshiMarket(marketRecord);

    if (market === undefined) {
      return errorResult(
        "invalid_payload",
        "Kalshi market response did not include usable market identifiers.",
      );
    }

    if (market.status !== "open") {
      return errorResult(
        "unsupported_market",
        "Kalshi market is not open for read-only ladder selection.",
        market.providerMetadata,
      );
    }

    if (market.tickSize === undefined) {
      return errorResult(
        "invalid_tick_size",
        "Kalshi market response did not include a valid price range step.",
        market.providerMetadata,
      );
    }

    const tradableRef = createTradableMarketRef({
      providerId: this.providerId,
      marketId: market.marketId,
      outcomeId: selectedSide,
      currency: "USD",
      tickSize: market.tickSize,
      marketStatus: "open",
      freshness: "fresh",
      providerMetadata: {
        ...market.providerMetadata,
        selectedSide,
      },
    });

    if (!tradableRef.ok) {
      return errorResult(
        mapTradableRefError(tradableRef.error.reason),
        "Kalshi market could not be converted into a tradable market ref.",
        market.providerMetadata,
      );
    }

    return successResult(tradableRef.value, {
      fetchedAt: this.runtime.now().toISOString(),
      freshness: "fresh",
      providerMetadata: { sourceShape: "kalshi_market" },
    });
  }

  async getOrderBook(
    marketRef: TradableMarketRef,
  ): Promise<MarketDataResult<NormalizedOrderBookSnapshot>> {
    if (marketRef.providerId !== this.providerId) {
      return errorResult(
        "provider_not_supported",
        "Kalshi adapter cannot load an order book for another provider.",
      );
    }

    const url = buildProviderUrl(
      this.baseUrl,
      `/markets/${encodeURIComponent(marketRef.marketId)}/orderbook`,
    );
    const payload = await loadProviderPayload(this.runtime.httpClient, url);

    if (!payload.ok) {
      return payload;
    }

    const snapshot = normalizeKalshiBookPayload(
      payload.value,
      marketRef,
      this.runtime,
    );

    if (!snapshot.ok) {
      return snapshot;
    }

    return successResult(snapshot.value, {
      fetchedAt: this.runtime.now().toISOString(),
      freshness: snapshot.value.freshness,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    });
  }
}

export function createReadOnlyMarketDataAdapters(
  options: {
    polymarket?: PolymarketAdapterOptions;
    kalshi?: KalshiAdapterOptions;
  } = {},
): Record<ProviderId, MarketDiscoveryAdapter & MarketDataAdapter> {
  return {
    polymarket: new PolymarketMarketDataAdapter(options.polymarket),
    kalshi: new KalshiMarketDataAdapter(options.kalshi),
  };
}

export function createConfiguredMarketResolveRequest(
  fallback: ConfiguredMarketFallback,
): MarketDataResult<MarketResolveRequest> {
  const providerId = normalizeProviderId(fallback.providerId);

  if (providerId === undefined) {
    return errorResult(
      "provider_not_supported",
      "Configured market fallback must name a supported provider.",
    );
  }

  if (fallback.marketId === undefined || fallback.marketId.trim() === "") {
    return errorResult(
      "market_not_found",
      "Configured market fallback is missing a real provider market identifier.",
    );
  }

  if (fallback.outcomeId === undefined || fallback.outcomeId.trim() === "") {
    return errorResult(
      "outcome_not_found",
      "Configured market fallback is missing a real provider outcome identifier.",
    );
  }

  const providerMetadata = {
    ...(fallback.outcomeLabel !== undefined
      ? { outcomeLabel: fallback.outcomeLabel }
      : {}),
    ...(fallback.providerMetadata ?? {}),
  };
  const data: MarketResolveRequest = {
    providerId,
    marketId: fallback.marketId,
    outcomeId: fallback.outcomeId,
    ...(Object.keys(providerMetadata).length > 0 ? { providerMetadata } : {}),
  };
  return {
    ok: true,
    value: {
      data,
      source: {
        kind: "configured_real_market",
        configKey: fallback.configKey ?? "configured_market_fallback",
      },
      providerMetadata: {
        note: "Configured fallback is a real-provider resolve request, not provider success.",
      },
    },
  };
}

export async function defaultMarketDataHttpClient(
  request: MarketDataHttpRequest,
): Promise<MarketDataHttpResponse> {
  const response = await fetch(request.url, {
    method: request.method ?? "GET",
    ...(request.headers !== undefined ? { headers: request.headers } : {}),
  });
  const body = await parseResponseBody(response);

  return {
    status: response.status,
    body,
  };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createRuntime(options: ReadOnlyAdapterOptions): ProviderRuntime {
  return {
    httpClient: options.httpClient ?? defaultMarketDataHttpClient,
    now: options.now ?? (() => new Date()),
    staleThresholdMs:
      options.staleThresholdMs ?? DEFAULT_MARKET_DATA_STALE_THRESHOLD_MS,
  };
}

async function loadProviderPayload(
  httpClient: MarketDataHttpClient,
  url: string,
): Promise<AdapterInternalResult<unknown>> {
  let response: MarketDataHttpResponse;

  try {
    response = await httpClient({ url, method: "GET" });
  } catch (error) {
    return internalErrorResult("network_error", "Provider request failed before a response.", {
      url,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  if (response.status >= 200 && response.status < 300) {
    return { ok: true, value: response.body };
  }

  return httpErrorResult(response.status, url, response.body);
}

function httpErrorResult(
  status: number,
  url: string,
  body: unknown,
): AdapterInternalResult<never> {
  if (status === 401 || status === 403) {
    return internalErrorResult(
      "provider_credentials_required",
      "Provider returned an authentication or authorization response for a read-only endpoint.",
      { status, url, body },
    );
  }

  if (status === 404) {
    return internalErrorResult("market_not_found", "Provider market endpoint returned 404.", {
      status,
      url,
      body,
    });
  }

  if (status === 400) {
    return internalErrorResult("invalid_payload", "Provider rejected the read-only request.", {
      status,
      url,
      body,
    });
  }

  if (status >= 500) {
    return internalErrorResult(
      "provider_status_unknown",
      "Provider returned a server error for a read-only market-data request.",
      { status, url, body },
    );
  }

  return internalErrorResult(
    "network_error",
    "Provider returned an unexpected HTTP status for a read-only market-data request.",
    { status, url, body },
  );
}

function normalizePolymarketMarket(
  payload: unknown,
): PolymarketMarketMapping | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const marketId = stringifyId(
    getUnknown(payload, "id") ??
      getUnknown(payload, "market") ??
      getUnknown(payload, "conditionId") ??
      getUnknown(payload, "condition_id"),
  );
  const title =
    getString(payload, "question") ??
    getString(payload, "title") ??
    getString(payload, "slug") ??
    marketId;

  if (marketId === undefined || title === undefined) {
    return undefined;
  }

  const outcomeMappings = parsePolymarketOutcomeMappings(payload);
  const status = mapPolymarketStatus(payload);
  const conditionId =
    getString(payload, "conditionId") ?? getString(payload, "condition_id");
  const enableOrderBook =
    getBoolean(payload, "enableOrderBook") ??
    getBoolean(payload, "enable_order_book");
  const active = getBoolean(payload, "active");
  const closed = getBoolean(payload, "closed");
  const archived = getBoolean(payload, "archived");
  const volume = getDecimalMetadata(payload, ["volume", "volumeNum", "volume_num"]);
  const liquidity = getDecimalMetadata(payload, [
    "liquidity",
    "liquidityNum",
    "liquidity_num",
  ]);
  const providerMetadata: Record<string, unknown> = {
    sourceShape: "polymarket_gamma_market",
    ...(conditionId !== undefined ? { conditionId } : {}),
    ...(getString(payload, "slug") !== undefined
      ? { slug: getString(payload, "slug") }
      : {}),
    ...(enableOrderBook !== undefined ? { enableOrderBook } : {}),
    ...(active !== undefined ? { active } : {}),
    ...(closed !== undefined ? { closed } : {}),
    ...(archived !== undefined ? { archived } : {}),
  };

  return {
    marketId,
    title,
    status,
    outcomes: outcomeMappings.map((mapping) => ({
      providerId: "polymarket",
      marketId,
      outcomeId: mapping.tokenId,
      label: mapping.label,
      status: status === "open" ? "tradable" : "unknown",
      providerMetadata: {
        sourceShape: "polymarket_clob_token",
        clobTokenId: mapping.tokenId,
        outcomeIndex: mapping.index,
      },
    })),
    ...(conditionId !== undefined ? { conditionId } : {}),
    ...(enableOrderBook !== undefined ? { enableOrderBook } : {}),
    ...(active !== undefined ? { active } : {}),
    ...(closed !== undefined ? { closed } : {}),
    ...(archived !== undefined ? { archived } : {}),
    ...(volume !== undefined ? { volume } : {}),
    ...(liquidity !== undefined ? { liquidity } : {}),
    providerMetadata,
  };
}

function parsePolymarketOutcomeMappings(
  payload: Record<string, unknown>,
): Array<{ tokenId: string; label: string; index: number }> {
  const labels =
    parseStringArray(getUnknown(payload, "outcomes")) ??
    parseStringArray(getUnknown(payload, "outcome_names")) ??
    [];
  const tokenIds =
    parseStringArray(getUnknown(payload, "clobTokenIds")) ??
    parseStringArray(getUnknown(payload, "clob_token_ids")) ??
    [];

  return tokenIds.map((tokenId, index) => ({
    tokenId,
    label: labels[index] ?? tokenId,
    index,
  }));
}

function mapPolymarketStatus(payload: Record<string, unknown>): MarketStatus {
  const closed = getBoolean(payload, "closed");
  const archived = getBoolean(payload, "archived");
  const active = getBoolean(payload, "active");
  const resolved =
    getBoolean(payload, "resolved") ?? getBoolean(payload, "settled");
  const enableOrderBook =
    getBoolean(payload, "enableOrderBook") ??
    getBoolean(payload, "enable_order_book");

  if (resolved === true) {
    return "resolved";
  }

  if (closed === true) {
    return "closed";
  }

  if (archived === true) {
    return "archived";
  }

  if (active === true && enableOrderBook !== false) {
    return "open";
  }

  if (active === false) {
    return "inactive";
  }

  return "unknown";
}

function readPolymarketBookHeader(
  payload: unknown,
  expectedTokenId: string,
  runtime: ProviderRuntime,
): AdapterInternalResult<{
  tickSize: string;
  capturedAt: string;
  providerMetadata: Record<string, unknown>;
}> {
  if (!isRecord(payload)) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book response was not an object.",
    );
  }

  const assetId = getString(payload, "asset_id") ?? getString(payload, "assetId");

  if (assetId !== undefined && assetId !== expectedTokenId) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book token ID did not match the requested outcome.",
      { expectedTokenId, assetId },
    );
  }

  const tickSize = getString(payload, "tick_size") ?? getString(payload, "tickSize");

  if (tickSize === undefined || !validatePositiveDecimalString(tickSize).ok) {
    return internalErrorResult(
      "invalid_tick_size",
      "Polymarket order-book response did not include a valid tick size.",
      { assetId },
    );
  }

  const capturedAt = parseProviderTimestamp(getUnknown(payload, "timestamp"));

  if (capturedAt === undefined) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book response did not include a valid timestamp.",
      { assetId },
    );
  }

  const freshness = determineFreshness(
    capturedAt,
    runtime.now(),
    runtime.staleThresholdMs,
  );

  if (freshness === "stale") {
    return internalErrorResult(
      "stale_data",
      "Polymarket order-book snapshot is older than the freshness threshold.",
      { capturedAt, thresholdMs: runtime.staleThresholdMs },
    );
  }

  return {
    ok: true,
    value: {
      tickSize: normalizeDecimalString(tickSize),
      ...(getString(payload, "min_order_size") !== undefined
        ? { minOrderSize: getString(payload, "min_order_size") }
        : {}),
      capturedAt,
      providerMetadata: {
        sourceShape: "polymarket_clob_book",
        ...(assetId !== undefined ? { clobTokenId: assetId } : {}),
        ...(getString(payload, "market") !== undefined
          ? { conditionId: getString(payload, "market") }
          : {}),
        ...(getString(payload, "hash") !== undefined
          ? { orderBookHash: getString(payload, "hash") }
          : {}),
        ...(getString(payload, "min_order_size") !== undefined
          ? { minOrderSize: getString(payload, "min_order_size") }
          : {}),
        ...(getBoolean(payload, "neg_risk") !== undefined
          ? { negRisk: getBoolean(payload, "neg_risk") }
          : {}),
        ...(getString(payload, "last_trade_price") !== undefined
          ? { lastTradePrice: getString(payload, "last_trade_price") }
          : {}),
      },
    },
  };
}

function normalizePolymarketBookPayload(
  payload: unknown,
  marketRef: TradableMarketRef,
  runtime: ProviderRuntime,
  requireLiquidity: boolean,
): AdapterInternalResult<NormalizedOrderBookSnapshot> {
  const header = readPolymarketBookHeader(payload, marketRef.outcomeId, runtime);

  if (!header.ok) {
    return header;
  }

  if (!isRecord(payload)) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book response was not an object.",
    );
  }

  const bids = parseLevelObjects(getUnknown(payload, "bids"));
  const asks = parseLevelObjects(getUnknown(payload, "asks"));

  if (bids === undefined || asks === undefined) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book response did not include valid bid/ask levels.",
      header.value.providerMetadata,
    );
  }

  if (requireLiquidity && bids.length + asks.length === 0) {
    return internalErrorResult(
      "empty_liquidity",
      "Polymarket order book has no bid or ask levels.",
      header.value.providerMetadata,
    );
  }

  const normalizedLevels = normalizeOrderBookLevels({ bids, asks });

  if (!normalizedLevels.ok) {
    return internalErrorResult(
      "invalid_payload",
      "Polymarket order-book levels contained invalid price or size values.",
      {
        ...header.value.providerMetadata,
        level: normalizedLevels.error.level,
      },
    );
  }

  const updatedRef = createTradableMarketRef({
    providerId: marketRef.providerId,
    marketId: marketRef.marketId,
    outcomeId: marketRef.outcomeId,
    currency: marketRef.currency,
    tickSize: header.value.tickSize,
    marketStatus: "open",
    freshness: "fresh",
    providerMetadata: {
      ...(marketRef.providerMetadata ?? {}),
      ...header.value.providerMetadata,
    },
  });

  if (!updatedRef.ok) {
    return internalErrorResult(
      mapTradableRefError(updatedRef.error.reason),
      "Polymarket order book could not refresh the tradable market reference.",
      header.value.providerMetadata,
    );
  }

  return {
    ok: true,
    value: {
      marketRef: updatedRef.value,
      capturedAt: header.value.capturedAt,
      bids: normalizedLevels.value.bids,
      asks: normalizedLevels.value.asks,
      tickSize: header.value.tickSize,
      freshness: "fresh",
      connectionMode: "snapshot",
      providerMetadata: header.value.providerMetadata,
    },
  };
}

function normalizeKalshiMarket(payload: unknown): KalshiMarketMapping | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const marketId = getString(payload, "ticker");
  const title =
    getString(payload, "title") ??
    getString(payload, "subtitle") ??
    getString(payload, "ticker");

  if (marketId === undefined || title === undefined) {
    return undefined;
  }

  const status = mapKalshiStatus(payload);
  const tickSize = resolveKalshiTickSize(payload);
  const volume = getDecimalMetadata(payload, ["volume_fp", "volume", "volume_24h_fp"]);
  const liquidity = getDecimalMetadata(payload, ["liquidity_dollars", "liquidity"]);
  const providerMetadata: Record<string, unknown> = {
    sourceShape: "kalshi_market",
    marketTicker: marketId,
    ...(getString(payload, "event_ticker") !== undefined
      ? { eventTicker: getString(payload, "event_ticker") }
      : {}),
    ...(getString(payload, "price_level_structure") !== undefined
      ? { priceLevelStructure: getString(payload, "price_level_structure") }
      : {}),
    ...(getUnknown(payload, "price_ranges") !== undefined
      ? { priceRanges: getUnknown(payload, "price_ranges") }
      : {}),
  };
  const yesSubtitle = getString(payload, "yes_sub_title") ?? "Yes";
  const noSubtitle = getString(payload, "no_sub_title") ?? "No";

  return {
    marketId,
    title,
    status,
    outcomes: [
      {
        providerId: "kalshi",
        marketId,
        outcomeId: "yes",
        label: yesSubtitle,
        status: status === "open" ? "tradable" : "unknown",
        providerMetadata: {
          sourceShape: "kalshi_binary_side",
          side: "yes",
        },
      },
      {
        providerId: "kalshi",
        marketId,
        outcomeId: "no",
        label: noSubtitle,
        status: status === "open" ? "tradable" : "unknown",
        providerMetadata: {
          sourceShape: "kalshi_binary_side",
          side: "no",
        },
      },
    ],
    ...(tickSize !== undefined ? { tickSize } : {}),
    ...(volume !== undefined ? { volume } : {}),
    ...(liquidity !== undefined ? { liquidity } : {}),
    providerMetadata,
  };
}

function mapKalshiStatus(payload: Record<string, unknown>): MarketStatus {
  const status = getString(payload, "status");

  if (status === "open") {
    return "open";
  }

  if (status === "closed") {
    return "closed";
  }

  if (status === "settled") {
    return "resolved";
  }

  if (status === "unopened" || status === "paused") {
    return "inactive";
  }

  return "unknown";
}

function resolveKalshiTickSize(payload: Record<string, unknown>): string | undefined {
  const explicitTick =
    getString(payload, "tick_size") ??
    getString(payload, "tick_size_dollars") ??
    getString(payload, "minimum_tick_size");

  if (explicitTick !== undefined && validatePositiveDecimalString(explicitTick).ok) {
    return normalizeDecimalString(explicitTick);
  }

  const priceRanges = getUnknown(payload, "price_ranges");

  if (!Array.isArray(priceRanges)) {
    return undefined;
  }

  for (const range of priceRanges) {
    if (!isRecord(range)) {
      continue;
    }

    const step = getString(range, "step");

    if (step !== undefined && validatePositiveDecimalString(step).ok) {
      return normalizeDecimalString(step);
    }
  }

  return undefined;
}

function normalizeKalshiBookPayload(
  payload: unknown,
  marketRef: TradableMarketRef,
  runtime: ProviderRuntime,
): AdapterInternalResult<NormalizedOrderBookSnapshot> {
  const selectedSide = normalizeKalshiSide(marketRef.outcomeId);

  if (selectedSide === undefined) {
    return internalErrorResult(
      "outcome_not_found",
      "Kalshi order-book normalization requires outcomeId yes or no.",
      { outcomeId: marketRef.outcomeId },
    );
  }

  if (!isRecord(payload)) {
    return internalErrorResult(
      "invalid_payload",
      "Kalshi order-book response was not an object.",
    );
  }

  const orderbook = getUnknown(payload, "orderbook_fp");

  if (!isRecord(orderbook)) {
    return internalErrorResult(
      "invalid_payload",
      "Kalshi order-book response did not include orderbook_fp.",
    );
  }

  const yesBids = parseTupleLevels(getUnknown(orderbook, "yes_dollars"));
  const noBids = parseTupleLevels(getUnknown(orderbook, "no_dollars"));

  if (yesBids === undefined || noBids === undefined) {
    return internalErrorResult(
      "invalid_payload",
      "Kalshi orderbook_fp did not include valid yes_dollars/no_dollars arrays.",
    );
  }

  const sourceBids = selectedSide === "yes" ? yesBids : noBids;
  const oppositeBids = selectedSide === "yes" ? noBids : yesBids;
  const asks = createKalshiImpliedAsks(oppositeBids);

  if (asks === undefined) {
    return internalErrorResult(
      "invalid_payload",
      "Kalshi binary book could not be converted into implied asks.",
      { selectedSide },
    );
  }

  if (sourceBids.length + asks.length === 0) {
    return internalErrorResult(
      "empty_liquidity",
      "Kalshi order book has no selected-side bids or implied asks.",
      { selectedSide },
    );
  }

  const normalizedLevels = normalizeOrderBookLevels({
    bids: sourceBids,
    asks,
  });

  if (!normalizedLevels.ok) {
    return internalErrorResult(
      "invalid_payload",
      "Kalshi order-book levels contained invalid price or size values.",
      { selectedSide, level: normalizedLevels.error.level },
    );
  }

  const updatedRef = createTradableMarketRef({
    providerId: marketRef.providerId,
    marketId: marketRef.marketId,
    outcomeId: selectedSide,
    currency: marketRef.currency,
    tickSize: marketRef.tickSize,
    marketStatus: "open",
    freshness: "fresh",
    providerMetadata: {
      ...(marketRef.providerMetadata ?? {}),
      selectedSide,
      sourceShape: "kalshi_yes_no_book",
    },
  });

  if (!updatedRef.ok) {
    return internalErrorResult(
      mapTradableRefError(updatedRef.error.reason),
      "Kalshi order book could not refresh the tradable market reference.",
      { selectedSide },
    );
  }

  return {
    ok: true,
    value: {
      marketRef: updatedRef.value,
      capturedAt: runtime.now().toISOString(),
      bids: normalizedLevels.value.bids,
      asks: normalizedLevels.value.asks,
      tickSize: marketRef.tickSize,
      freshness: "fresh",
      connectionMode: "snapshot",
      providerMetadata: {
        sourceShape: "kalshi_yes_no_book",
        selectedSide,
        bidSource: `${selectedSide}_dollars`,
        askSource: selectedSide === "yes" ? "no_dollars_implied" : "yes_dollars_implied",
      },
    },
  };
}

function createKalshiImpliedAsks(
  bids: OrderBookLevel[],
): OrderBookLevel[] | undefined {
  const asks: OrderBookLevel[] = [];

  for (const bid of bids) {
    if (!validatePositiveDecimalString(bid.price).ok) {
      return undefined;
    }

    if (compareDecimalStrings(bid.price, "1") >= 0) {
      return undefined;
    }

    const price = decimalSubtract("1", bid.price);

    if (!validatePositiveDecimalString(price).ok) {
      return undefined;
    }

    asks.push({
      price: normalizeDecimalString(price),
      size: bid.size,
    });
  }

  return asks;
}

function parseLevelObjects(value: unknown): OrderBookLevel[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const levels: OrderBookLevel[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return undefined;
    }

    const price = getString(item, "price");
    const size = getString(item, "size");

    if (price === undefined || size === undefined) {
      return undefined;
    }

    levels.push({ price, size });
  }

  return levels;
}

function parseTupleLevels(value: unknown): OrderBookLevel[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const levels: OrderBookLevel[] = [];

  for (const item of value) {
    if (!Array.isArray(item) || item.length < 2) {
      return undefined;
    }

    const price = stringifyId(item[0]);
    const size = stringifyId(item[1]);

    if (price === undefined || size === undefined) {
      return undefined;
    }

    levels.push({ price, size });
  }

  return levels;
}

function extractMarketArray(
  payload: unknown,
): AdapterInternalResult<unknown[]> {
  if (Array.isArray(payload)) {
    return { ok: true, value: payload };
  }

  if (isRecord(payload) && Array.isArray(payload.markets)) {
    return { ok: true, value: payload.markets };
  }

  return internalErrorResult(
    "invalid_payload",
    "Provider market search response did not include a markets array.",
  );
}

function extractKalshiMarkets(
  payload: unknown,
): AdapterInternalResult<unknown[]> {
  if (isRecord(payload) && Array.isArray(payload.markets)) {
    return { ok: true, value: payload.markets };
  }

  return internalErrorResult(
    "invalid_payload",
    "Kalshi market response did not include a markets array.",
  );
}

function toDiscoveryItem(
  providerId: ProviderId,
  market: PolymarketMarketMapping | KalshiMarketMapping,
): MarketDiscoveryItem {
  return {
    providerId,
    marketId: market.marketId,
    title: market.title,
    status: market.status,
    outcomes: market.outcomes,
    ...(market.volume !== undefined ? { volume: market.volume } : {}),
    ...(market.liquidity !== undefined ? { liquidity: market.liquidity } : {}),
    providerMetadata: market.providerMetadata,
  };
}

function matchesQuery(
  market: PolymarketMarketMapping | KalshiMarketMapping,
  query: string,
): boolean {
  if (query === "") {
    return true;
  }

  return (
    market.marketId.toLowerCase().includes(query) ||
    market.title.toLowerCase().includes(query) ||
    market.outcomes.some((outcome) => outcome.label.toLowerCase().includes(query))
  );
}

function findOutcome(
  outcomes: NormalizedOutcome[],
  requestedOutcomeId: string,
): NormalizedOutcome | undefined {
  const requested = requestedOutcomeId.trim().toLowerCase();

  return outcomes.find(
    (outcome) =>
      outcome.outcomeId.toLowerCase() === requested ||
      outcome.label.toLowerCase() === requested,
  );
}

function normalizeKalshiSide(outcomeId: string | undefined): "yes" | "no" | undefined {
  const normalized = outcomeId?.trim().toLowerCase();

  if (normalized === "yes" || normalized === "no") {
    return normalized;
  }

  return undefined;
}

function successResult<TData>(
  data: TData,
  options: LiveSuccessOptions,
): MarketDataResult<TData> {
  return {
    ok: true,
    value: {
      data,
      source: { kind: "official_live", fetchedAt: options.fetchedAt },
      ...(options.freshness !== undefined ? { freshness: options.freshness } : {}),
      connectionMode: options.connectionMode ?? "snapshot",
      ...(options.providerMetadata !== undefined
        ? { providerMetadata: options.providerMetadata }
        : {}),
    },
  };
}

function errorResult<TData = never>(
  reason: MarketDataAdapterErrorReason,
  message: string,
  providerMetadata?: Record<string, unknown>,
): MarketDataResult<TData> {
  const error: MarketDataAdapterError = {
    reason,
    message,
    ...(providerMetadata !== undefined ? { providerMetadata } : {}),
  };

  return { ok: false, error };
}

function internalErrorResult<TData = never>(
  reason: MarketDataAdapterErrorReason,
  message: string,
  providerMetadata?: Record<string, unknown>,
): AdapterInternalResult<TData> {
  const error: MarketDataAdapterError = {
    reason,
    message,
    ...(providerMetadata !== undefined ? { providerMetadata } : {}),
  };

  return { ok: false, error };
}

function buildProviderUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function determineFreshness(
  capturedAt: string,
  now: Date,
  staleThresholdMs: number,
): DataFreshness {
  const capturedAtMs = Date.parse(capturedAt);

  if (Number.isNaN(capturedAtMs)) {
    return "invalid";
  }

  return now.getTime() - capturedAtMs > staleThresholdMs ? "stale" : "fresh";
}

function parseProviderTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const rawValue = String(value).trim();

  if (rawValue === "") {
    return undefined;
  }

  if (/^\d+$/u.test(rawValue)) {
    const numeric = Number(rawValue);
    const timestampMs = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    const timestamp = new Date(timestampMs);

    if (Number.isNaN(timestamp.getTime())) {
      return undefined;
    }

    return timestamp.toISOString();
  }

  const timestamp = new Date(rawValue);

  if (Number.isNaN(timestamp.getTime())) {
    return undefined;
  }

  return timestamp.toISOString();
}

function mapTradableRefError(
  reason:
    | "outcome_required"
    | "invalid_tick_size"
    | "market_not_open"
    | "data_not_fresh",
): MarketDataAdapterErrorReason {
  switch (reason) {
    case "outcome_required":
      return "outcome_not_found";
    case "invalid_tick_size":
      return "invalid_tick_size";
    case "market_not_open":
      return "unsupported_market";
    case "data_not_fresh":
      return "stale_data";
  }
}

function supportsProviderRequest(
  requestedProviderId: ProviderId | undefined,
  adapterProviderId: ProviderId,
): boolean {
  return requestedProviderId === undefined || requestedProviderId === adapterProviderId;
}

function normalizeProviderId(providerId: ProviderId | string | undefined) {
  return PROVIDER_IDS.find((supportedProviderId) => supportedProviderId === providerId);
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 20;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 100);
}

function parseStringArray(value: unknown): string[] | undefined {
  const parsed = typeof value === "string" ? parseJson(value) : value;

  if (!Array.isArray(parsed)) {
    return undefined;
  }

  const strings: string[] = [];

  for (const item of parsed) {
    const stringValue = stringifyId(item);

    if (stringValue === undefined) {
      return undefined;
    }

    strings.push(stringValue);
  }

  return strings;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function getDecimalMetadata(
  payload: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = getUnknown(payload, key);

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function getString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = getUnknown(payload, key);

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function getBoolean(
  payload: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = getUnknown(payload, key);

  return typeof value === "boolean" ? value : undefined;
}

function getUnknown(payload: Record<string, unknown>, key: string): unknown {
  return payload[key];
}

function stringifyId(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
