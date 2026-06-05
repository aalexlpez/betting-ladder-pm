import {
  compareDecimalStrings,
  createTradableMarketRef,
  decimalAdd,
  decimalSubtract,
  normalizeDecimalString,
  normalizeOrderBookLevels,
  validateDecimalString,
  validatePositiveDecimalString,
  type ConnectionMode,
  type DataFreshness,
  type NormalizedOrderBookSnapshot,
  type OrderBookLevel,
  type ProviderId,
  type Result,
  type TradableMarketRef,
} from "@prediction-ladder/core";

import type {
  MarketDataAdapter,
  MarketDataAdapterError,
  MarketDataAdapterErrorReason,
  MarketDataResult,
  MarketDataSource,
  MarketDiscoveryAdapter,
  MarketDiscoveryItem,
  MarketResolveRequest,
  MarketSearchRequest,
  Unsubscribe,
} from "./index";

export const POLYMARKET_MARKET_WS_URL =
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";
export const KALSHI_TRADE_WS_URL =
  "wss://external-api-ws.kalshi.com/trade-api/ws/v2";

export type OfficialProviderClientMode =
  | "official_sdk"
  | "official_openapi_asyncapi"
  | "direct_documented_client";

export type ProviderRuntimeDocumentation = {
  providerId: ProviderId;
  selectedRuntime: "tauri_privileged_side";
  clientMode: OfficialProviderClientMode;
  sdkAvailability: string;
  websocketAccess: string;
  documentationUrls: readonly string[];
  decision: string;
};

export const GOAL_04B_PROVIDER_RUNTIME_DOCUMENTATION = [
  {
    providerId: "polymarket",
    selectedRuntime: "tauri_privileged_side",
    clientMode: "direct_documented_client",
    sdkAvailability:
      "Official TypeScript, Python, and Rust CLOB clients are documented; the market WebSocket channel is documented as a direct public WSS subscription.",
    websocketAccess:
      "Market channel uses wss://ws-subscriptions-clob.polymarket.com/ws/market and does not require auth.",
    documentationUrls: [
      "https://docs.polymarket.com/api-reference/clients-sdks",
      "https://docs.polymarket.com/market-data/websocket/overview",
      "https://docs.polymarket.com/market-data/websocket/market-channel",
    ],
    decision:
      "Use the official documented market WebSocket directly for the fresh ladder path; keep REST CLOB/Gamma reads as bootstrap and recovery.",
  },
  {
    providerId: "kalshi",
    selectedRuntime: "tauri_privileged_side",
    clientMode: "official_openapi_asyncapi",
    sdkAvailability:
      "Official Python and TypeScript SDKs are documented; Kalshi recommends OpenAPI/AsyncAPI and direct documentation as the source of truth for production clients.",
    websocketAccess:
      "Trade API WebSocket uses wss://external-api-ws.kalshi.com/trade-api/ws/v2 and requires authenticated handshake headers.",
    documentationUrls: [
      "https://docs.kalshi.com/sdks/overview",
      "https://docs.kalshi.com/getting_started/quick_start_market_data",
      "https://docs.kalshi.com/getting_started/quick_start_websockets",
      "https://docs.kalshi.com/websockets",
      "https://docs.kalshi.com/websockets/orderbook-updates",
    ],
    decision:
      "Use Kalshi official REST/OpenAPI-compatible reads for bootstrap and the official AsyncAPI/documented WebSocket shape for streaming; missing credentials are a gate, not a successful stream.",
  },
] as const satisfies readonly ProviderRuntimeDocumentation[];

export type MarketDataConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "stale"
  | "disconnected"
  | "invalid"
  | "blocked"
  | "credentials-required"
  | "unavailable"
  | "provider-error";

export type MarketDataCredentialStatus = "not_required" | "ready" | "missing";

export type NormalizedStreamUpdate = {
  providerId: ProviderId;
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  updateType:
    | "snapshot"
    | "incremental"
    | "ignored_out_of_order"
    | "status"
    | "rest_recovery";
  message: string;
  snapshot?: NormalizedOrderBookSnapshot;
  providerMetadata?: Record<string, unknown>;
};

export type StreamNormalizationResult = Result<
  NormalizedStreamUpdate,
  MarketDataAdapterError
>;

export type MarketDataStreamState = {
  providerId: ProviderId;
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  message: string;
  lastMessageAt?: string;
  retryAttempt?: number;
  nextRetryAt?: string;
  snapshot?: NormalizedOrderBookSnapshot;
  providerMetadata?: Record<string, unknown>;
};

export type RendererTradableMarketRef = Omit<
  TradableMarketRef,
  "providerMetadata"
>;

export type RendererOrderBookSnapshot = Omit<
  NormalizedOrderBookSnapshot,
  "marketRef" | "providerMetadata"
> & {
  marketRef: RendererTradableMarketRef;
};

export type RendererMarketDataUpdate = {
  providerId: ProviderId;
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  message: string;
  sourceKind?: MarketDataSource["kind"];
  orderBook?: RendererOrderBookSnapshot;
  errorReason?: MarketDataAdapterErrorReason;
};

export type MarketDataWebSocketConnectRequest = {
  providerId: ProviderId;
  url: string;
  headers?: Record<string, string>;
};

export type MarketDataWebSocketClient = {
  send(message: string): void;
  close(): void;
  onOpen(handler: () => void): void;
  onMessage(handler: (message: unknown) => void): void;
  onClose(handler: (reason?: string) => void): void;
  onError(handler: (error: unknown) => void): void;
};

export type MarketDataWebSocketFactory = (
  request: MarketDataWebSocketConnectRequest,
) => MarketDataWebSocketClient;

export type KalshiWebSocketAuthHeaders = {
  accessKey: string;
  accessSignature: string;
  accessTimestamp: string;
};

export type ProviderCredentialGate = (
  providerId: ProviderId,
) =>
  | { status: "not_required" }
  | { status: "missing"; reason: string }
  | { status: "ready"; kalshiAuthHeaders?: KalshiWebSocketAuthHeaders };

export type OfficialMarketDataRuntimeOptions = {
  adapters: Record<ProviderId, MarketDiscoveryAdapter & MarketDataAdapter>;
  socketFactory?: MarketDataWebSocketFactory;
  credentialGate?: ProviderCredentialGate;
  now?: () => Date;
  staleThresholdMs?: number;
};

export type RuntimeMarketSearchSuccess = {
  capturedAt: string;
  markets: MarketDiscoveryItem[];
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  providerIds: ProviderId[];
};

export type RuntimeOrderBookRequest = MarketResolveRequest;

export type RuntimeSubscribeRequest = {
  marketRef: TradableMarketRef;
};

export class OfficialMarketDataRuntime {
  private readonly adapters: Record<ProviderId, MarketDiscoveryAdapter & MarketDataAdapter>;
  private readonly socketFactory: MarketDataWebSocketFactory | undefined;
  private readonly credentialGate: ProviderCredentialGate;
  private readonly now: () => Date;
  private readonly staleThresholdMs: number;

  constructor(options: OfficialMarketDataRuntimeOptions) {
    this.adapters = options.adapters;
    this.socketFactory = options.socketFactory;
    this.credentialGate =
      options.credentialGate ??
      ((providerId) =>
        providerId === "kalshi"
          ? { status: "missing", reason: "Kalshi WebSocket authentication is not configured." }
          : { status: "not_required" });
    this.now = options.now ?? (() => new Date());
    this.staleThresholdMs = options.staleThresholdMs ?? 10_000;
  }

  async market_search(
    request: MarketSearchRequest,
  ): Promise<Result<RuntimeMarketSearchSuccess, MarketDataAdapterError>> {
    const providerIds = getRuntimeProviderIds(request.providerId);
    const markets: MarketDiscoveryItem[] = [];
    let lastCapturedAt = this.now().toISOString();

    for (const providerId of providerIds) {
      const result = await this.adapters[providerId].searchMarkets(request);

      if (!result.ok) {
        return {
          ok: false,
          error: withAdapterErrorProvider(result.error, providerId),
        };
      }

      lastCapturedAt = result.value.data.capturedAt;
      markets.push(...result.value.data.markets);
    }

    return {
      ok: true,
      value: {
        capturedAt: lastCapturedAt,
        markets,
        freshness: "fresh",
        connectionMode: "polling_fallback",
        providerIds,
      },
    };
  }

  async market_get_order_book(
    request: RuntimeOrderBookRequest,
  ): Promise<MarketDataResult<NormalizedOrderBookSnapshot>> {
    const adapter = this.adapters[request.providerId];
    const resolved = await adapter.resolveMarket(request);

    if (!resolved.ok) {
      return withMarketDataErrorProvider(resolved, request.providerId);
    }

    const orderBook = await adapter.getOrderBook(resolved.value.data);

    return orderBook.ok
      ? orderBook
      : withMarketDataErrorProvider(orderBook, request.providerId);
  }

  market_subscribe(
    request: RuntimeSubscribeRequest,
    onUpdate: (update: NormalizedStreamUpdate) => void,
    onError: (error: MarketDataAdapterError) => void,
  ): Unsubscribe {
    const marketRef = request.marketRef;
    const connectingState = createStreamState({
      providerId: marketRef.providerId,
      status: "connecting",
      freshness: "disconnected",
      connectionMode: "streaming",
      message: "Opening official provider WebSocket stream.",
      lastMessageAt: this.now().toISOString(),
    });

    onUpdate(streamStateToUpdate(connectingState, "status"));

    if (marketRef.providerId === "kalshi") {
      const credentialState = createKalshiWebSocketHandshakeState(
        this.credentialGate("kalshi"),
        this.now,
      );

      if (credentialState.status === "credentials-required") {
        onUpdate(streamStateToUpdate(credentialState, "status"));
        return () => undefined;
      }
    }

    if (this.socketFactory === undefined) {
      onUpdate(
        streamStateToUpdate(
          createStreamState({
            providerId: marketRef.providerId,
            status: "unavailable",
            freshness: "disconnected",
            connectionMode: "streaming",
            message:
              "No privileged WebSocket transport is configured for the Tauri provider runtime.",
            lastMessageAt: this.now().toISOString(),
          }),
          "status",
        ),
      );
      return () => undefined;
    }

    const socket = this.socketFactory(createSocketRequest(marketRef, this.credentialGate));
    let latestSnapshot: NormalizedOrderBookSnapshot | undefined;

    socket.onOpen(() => {
      socket.send(JSON.stringify(createProviderSubscriptionMessage(marketRef)));
    });
    socket.onMessage((message) => {
      const result =
        marketRef.providerId === "polymarket"
          ? normalizePolymarketWebSocketMessage(message, marketRef, {
              ...createStreamNormalizerOptions(
                latestSnapshot,
                this.now,
                this.staleThresholdMs,
              ),
            })
          : normalizeKalshiWebSocketMessage(message, marketRef, {
              ...createStreamNormalizerOptions(
                latestSnapshot,
                this.now,
                this.staleThresholdMs,
              ),
            });

      if (!result.ok) {
        onError(result.error);
        return;
      }

      if (result.value.snapshot !== undefined) {
        latestSnapshot = result.value.snapshot;
      }

      onUpdate(result.value);
    });
    socket.onClose((reason) => {
      onUpdate(
        streamStateToUpdate(
          markStreamStateReconnecting(
            createStreamState({
              providerId: marketRef.providerId,
              status: "disconnected",
              freshness: latestSnapshot === undefined ? "disconnected" : "stale",
              connectionMode: "streaming",
              message: reason ?? "Provider WebSocket closed.",
              lastMessageAt: this.now().toISOString(),
              ...(latestSnapshot !== undefined ? { snapshot: latestSnapshot } : {}),
            }),
            this.now,
          ),
          "status",
        ),
      );
    });
    socket.onError((error) => {
      onError(
        createAdapterError(
          "provider_status_unknown",
          "Provider WebSocket emitted an error.",
          {
            providerId: marketRef.providerId,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        ),
      );
    });

    return () => socket.close();
  }
}

export function createPolymarketMarketSubscriptionMessage(marketRef: TradableMarketRef) {
  return {
    assets_ids: [marketRef.outcomeId],
    type: "market",
    custom_feature_enabled: true,
  };
}

export function createKalshiOrderBookSubscriptionMessage(
  marketRef: TradableMarketRef,
  id = 1,
) {
  return {
    id,
    cmd: "subscribe",
    params: {
      channels: ["orderbook_delta"],
      market_ticker: marketRef.marketId,
    },
  };
}

export function createKalshiWebSocketHandshakeState(
  credentialState:
    | ReturnType<ProviderCredentialGate>
    | { status: "ready" | "missing" | "not_required"; reason?: string },
  now: () => Date = () => new Date(),
): MarketDataStreamState {
  if (credentialState.status !== "ready") {
    return createStreamState({
      providerId: "kalshi",
      status: "credentials-required",
      freshness: "disconnected",
      connectionMode: "streaming",
      message:
        credentialState.status === "missing"
          ? credentialState.reason ?? "Kalshi WebSocket authentication is required."
          : "Kalshi WebSocket authentication must be satisfied before connecting.",
      lastMessageAt: now().toISOString(),
      providerMetadata: {
        credentialGate: "required",
        sourceShape: "kalshi_wss_handshake",
      },
    });
  }

  return createStreamState({
    providerId: "kalshi",
    status: "connecting",
    freshness: "disconnected",
    connectionMode: "streaming",
    message: "Kalshi WebSocket credentials are present; opening authenticated stream.",
    lastMessageAt: now().toISOString(),
    providerMetadata: {
      credentialGate: "ready",
      sourceShape: "kalshi_wss_handshake",
    },
  });
}

export function normalizePolymarketWebSocketMessage(
  message: unknown,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions = {},
): StreamNormalizationResult {
  const record = parseMessageRecord(message);

  if (!record.ok) {
    return withStreamErrorProvider(record, "polymarket");
  }

  const eventType = getString(record.value, "event_type");

  if (eventType === "book") {
    return withStreamErrorProvider(
      normalizePolymarketBookStreamMessage(record.value, marketRef, options),
      "polymarket",
    );
  }

  if (eventType === "price_change") {
    return withStreamErrorProvider(
      normalizePolymarketPriceChangeMessage(record.value, marketRef, options),
      "polymarket",
    );
  }

  if (eventType === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket WebSocket message did not include event_type.",
      { providerId: "polymarket" },
    );
  }

  return {
    ok: true,
    value: {
      providerId: "polymarket",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "status",
      message: `Polymarket WebSocket ${eventType} message received without ladder depth changes.`,
      providerMetadata: {
        sourceShape: "polymarket_wss_status",
        eventType,
      },
    },
  };
}

export function normalizeKalshiWebSocketMessage(
  message: unknown,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions = {},
): StreamNormalizationResult {
  const record = parseMessageRecord(message);

  if (!record.ok) {
    return withStreamErrorProvider(record, "kalshi");
  }

  const messageType = getString(record.value, "type");

  if (messageType === "error") {
    return withStreamErrorProvider(normalizeKalshiWebSocketError(record.value), "kalshi");
  }

  if (messageType === "orderbook_snapshot") {
    return withStreamErrorProvider(
      normalizeKalshiBookStreamSnapshot(record.value, marketRef, options),
      "kalshi",
    );
  }

  if (messageType === "orderbook_delta") {
    return withStreamErrorProvider(
      normalizeKalshiBookStreamDelta(record.value, marketRef, options),
      "kalshi",
    );
  }

  if (messageType === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi WebSocket message did not include type.",
      { providerId: "kalshi" },
    );
  }

  return {
    ok: true,
    value: {
      providerId: "kalshi",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "status",
      message: `Kalshi WebSocket ${messageType} message received without ladder depth changes.`,
      providerMetadata: {
        sourceShape: "kalshi_wss_status",
        messageType,
      },
    },
  };
}

export function markStreamStateReconnecting(
  state: MarketDataStreamState,
  now: () => Date = () => new Date(),
): MarketDataStreamState {
  const retryAttempt = (state.retryAttempt ?? 0) + 1;
  const retryDelayMs = Math.min(1_000 * 2 ** (retryAttempt - 1), 30_000);
  const nextRetryAt = new Date(now().getTime() + retryDelayMs).toISOString();

  return {
    ...state,
    status: "reconnecting",
    freshness: state.snapshot === undefined ? "disconnected" : "stale",
    connectionMode: "streaming",
    message: "Provider WebSocket disconnected; reconnect is scheduled.",
    retryAttempt,
    nextRetryAt,
  };
}

export function markStreamStateIfStale(
  state: MarketDataStreamState,
  now: () => Date = () => new Date(),
  staleThresholdMs = 10_000,
): MarketDataStreamState {
  if (state.lastMessageAt === undefined || state.status !== "connected") {
    return state;
  }

  const lastMessageAt = Date.parse(state.lastMessageAt);

  if (Number.isNaN(lastMessageAt)) {
    return {
      ...state,
      status: "invalid",
      freshness: "invalid",
      message: "Stream lastMessageAt timestamp is invalid.",
    };
  }

  if (now().getTime() - lastMessageAt <= staleThresholdMs) {
    return state;
  }

  return {
    ...state,
    status: "stale",
    freshness: "stale",
    message: "Provider stream is stale beyond the configured freshness threshold.",
  };
}

export async function recoverStreamWithRestSnapshot(
  state: MarketDataStreamState,
  adapter: MarketDataAdapter,
  marketRef: TradableMarketRef,
  now: () => Date = () => new Date(),
): Promise<MarketDataStreamState> {
  const result = await adapter.getOrderBook(marketRef);

  if (!result.ok) {
    const error = withAdapterErrorProvider(result.error, marketRef.providerId);

    return {
      ...state,
      status: mapErrorToConnectionStatus(error.reason),
      freshness:
        error.reason === "invalid_payload" ? "invalid" : "disconnected",
      connectionMode: "polling_fallback",
      message: error.message,
      lastMessageAt: now().toISOString(),
      ...(error.providerMetadata !== undefined
        ? { providerMetadata: error.providerMetadata }
        : {}),
    };
  }

  return {
    providerId: marketRef.providerId,
    status: result.value.data.freshness === "fresh" ? "connected" : "stale",
    freshness: result.value.data.freshness,
    connectionMode: "polling_fallback",
    message: "REST snapshot recovered market data after stream interruption.",
    lastMessageAt: now().toISOString(),
    snapshot: {
      ...result.value.data,
      connectionMode: "polling_fallback",
      providerMetadata: {
        ...(result.value.data.providerMetadata ?? {}),
        recoverySource: "rest_snapshot",
      },
    },
    providerMetadata: {
      sourceShape: "rest_recovery_snapshot",
      sourceKind: result.value.source.kind,
    },
  };
}

export function toRendererMarketDataUpdate(
  input:
    | MarketDataResult<NormalizedOrderBookSnapshot>
    | NormalizedStreamUpdate
    | MarketDataStreamState,
): RendererMarketDataUpdate {
  if ("ok" in input) {
    if (!input.ok) {
      return {
        providerId: resolveErrorProviderId(input.error),
        status: mapErrorToConnectionStatus(input.error.reason),
        freshness:
          input.error.reason === "invalid_payload" ? "invalid" : "disconnected",
        connectionMode:
          input.error.reason === "websocket_disconnected"
            ? "streaming"
            : "polling_fallback",
        message: input.error.message,
        errorReason: input.error.reason,
      };
    }

    return {
      providerId: input.value.data.marketRef.providerId,
      status: input.value.data.freshness === "fresh" ? "connected" : "stale",
      freshness: input.value.data.freshness,
      connectionMode: input.value.connectionMode ?? input.value.data.connectionMode,
      message: "Normalized provider market data is available.",
      sourceKind: input.value.source.kind,
      orderBook: stripProviderMetadata(input.value.data),
    };
  }

  if ("updateType" in input) {
    return {
      providerId: input.providerId,
      status: input.status,
      freshness: input.freshness,
      connectionMode: input.connectionMode,
      message: input.message,
      ...(input.snapshot !== undefined
        ? { orderBook: stripProviderMetadata(input.snapshot) }
        : {}),
    };
  }

  return {
    providerId: input.providerId,
    status: input.status,
    freshness: input.freshness,
    connectionMode: input.connectionMode,
    message: input.message,
    ...(input.snapshot !== undefined
      ? { orderBook: stripProviderMetadata(input.snapshot) }
      : {}),
  };
}

export function createStreamState(
  input: MarketDataStreamState,
): MarketDataStreamState {
  return input;
}

type StreamNormalizerOptions = {
  previousSnapshot?: NormalizedOrderBookSnapshot;
  now?: () => Date;
  staleThresholdMs?: number;
};

function createStreamNormalizerOptions(
  previousSnapshot: NormalizedOrderBookSnapshot | undefined,
  now: () => Date,
  staleThresholdMs: number,
): StreamNormalizerOptions {
  return {
    ...(previousSnapshot !== undefined ? { previousSnapshot } : {}),
    now,
    staleThresholdMs,
  };
}

function normalizePolymarketBookStreamMessage(
  payload: Record<string, unknown>,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions,
): StreamNormalizationResult {
  const assetId = getString(payload, "asset_id") ?? getString(payload, "assetId");

  if (assetId !== undefined && assetId !== marketRef.outcomeId) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket WebSocket book token did not match the selected outcome.",
      { expectedTokenId: marketRef.outcomeId, assetId },
    );
  }

  const capturedAt = parseProviderTimestamp(getUnknown(payload, "timestamp"));

  if (capturedAt === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket WebSocket book message did not include a valid timestamp.",
    );
  }

  const staleCheck = checkFreshness(capturedAt, options);

  if (!staleCheck.ok) {
    return staleCheck;
  }

  const bids = parseObjectLevels(getUnknown(payload, "bids"));
  const asks = parseObjectLevels(getUnknown(payload, "asks"));

  if (bids === undefined || asks === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket WebSocket book message did not include valid bid/ask levels.",
    );
  }

  const snapshot = createNormalizedSnapshot({
    marketRef,
    capturedAt,
    bids,
    asks,
    tickSize:
      normalizeStreamDecimal(getString(payload, "tick_size") ?? marketRef.tickSize) ??
      marketRef.tickSize,
    connectionMode: "streaming",
    providerMetadata: {
      sourceShape: "polymarket_wss_book",
      eventType: "book",
      ...(assetId !== undefined ? { clobTokenId: assetId } : {}),
      ...(getString(payload, "market") !== undefined
        ? { conditionId: getString(payload, "market") }
        : {}),
      ...(getString(payload, "hash") !== undefined
        ? { orderBookHash: getString(payload, "hash") }
        : {}),
    },
  });

  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    value: {
      providerId: "polymarket",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "snapshot",
      message: "Polymarket WebSocket book snapshot normalized.",
      snapshot: snapshot.value,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    },
  };
}

function normalizePolymarketPriceChangeMessage(
  payload: Record<string, unknown>,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions,
): StreamNormalizationResult {
  const previousSnapshot = options.previousSnapshot;

  if (previousSnapshot === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket price_change requires an existing book snapshot.",
    );
  }

  const capturedAt = parseProviderTimestamp(getUnknown(payload, "timestamp"));

  if (capturedAt === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket price_change did not include a valid timestamp.",
    );
  }

  if (isOutOfOrder(capturedAt, previousSnapshot)) {
    return ignoredOutOfOrderUpdate(
      "polymarket",
      previousSnapshot,
      "Polymarket out-of-order price_change ignored.",
      { eventType: "price_change", capturedAt },
    );
  }

  const staleCheck = checkFreshness(capturedAt, options);

  if (!staleCheck.ok) {
    return staleCheck;
  }

  const changes = getUnknown(payload, "price_changes");

  if (!Array.isArray(changes)) {
    return adapterErrorResult(
      "invalid_payload",
      "Polymarket price_change did not include price_changes.",
    );
  }

  const bids = levelsToMap(previousSnapshot.bids);
  const asks = levelsToMap(previousSnapshot.asks);

  for (const change of changes) {
    if (!isRecord(change)) {
      return adapterErrorResult(
        "invalid_payload",
        "Polymarket price_change included a non-object change.",
      );
    }

    const assetId = getString(change, "asset_id") ?? getString(change, "assetId");

    if (assetId !== marketRef.outcomeId) {
      continue;
    }

    const side = getString(change, "side");
    const price = normalizeStreamDecimal(getString(change, "price"));
    const size = normalizeStreamDecimal(getString(change, "size"));

    if (
      price === undefined ||
      size === undefined ||
      (side !== "BUY" && side !== "SELL")
    ) {
      return adapterErrorResult(
        "invalid_payload",
        "Polymarket price_change included invalid side, price, or size.",
      );
    }

    updateAbsoluteLevel(side === "BUY" ? bids : asks, price, size);
  }

  const snapshot = createNormalizedSnapshot({
    marketRef,
    capturedAt,
    bids: mapToLevels(bids),
    asks: mapToLevels(asks),
    tickSize: previousSnapshot.tickSize,
    connectionMode: "streaming",
    providerMetadata: {
      ...(previousSnapshot.providerMetadata ?? {}),
      sourceShape: "polymarket_wss_price_change",
      eventType: "price_change",
    },
  });

  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    value: {
      providerId: "polymarket",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "incremental",
      message: "Polymarket WebSocket price_change applied.",
      snapshot: snapshot.value,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    },
  };
}

function normalizeKalshiWebSocketError(
  payload: Record<string, unknown>,
): StreamNormalizationResult {
  const msg = getUnknown(payload, "msg");
  const errorRecord = isRecord(msg) ? msg : {};
  const code = getNumber(errorRecord, "code");
  const message = getString(errorRecord, "msg") ?? "Kalshi WebSocket error.";

  if (code === 9 || message.toLowerCase().includes("auth")) {
    return adapterErrorResult("provider_credentials_required", message, {
      sourceShape: "kalshi_wss_error",
      code,
    });
  }

  return adapterErrorResult("provider_status_unknown", message, {
    sourceShape: "kalshi_wss_error",
    code,
  });
}

function normalizeKalshiBookStreamSnapshot(
  payload: Record<string, unknown>,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions,
): StreamNormalizationResult {
  const msg = getUnknown(payload, "msg");

  if (!isRecord(msg)) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_snapshot did not include msg.",
    );
  }

  const selectedSide = normalizeKalshiSide(marketRef.outcomeId);

  if (selectedSide === undefined) {
    return adapterErrorResult(
      "outcome_not_found",
      "Kalshi streaming requires outcomeId yes or no.",
    );
  }

  const marketTicker = getString(msg, "market_ticker");

  if (marketTicker !== marketRef.marketId) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_snapshot market ticker did not match the selected market.",
      { expectedMarketTicker: marketRef.marketId, marketTicker },
    );
  }

  const yesBids = parseTupleLevels(
    getUnknown(msg, "yes_dollars_fp") ?? getUnknown(msg, "yes_dollars"),
  );
  const noBids = parseTupleLevels(
    getUnknown(msg, "no_dollars_fp") ?? getUnknown(msg, "no_dollars"),
  );

  if (yesBids === undefined || noBids === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_snapshot did not include valid yes/no dollar levels.",
    );
  }

  const book = createKalshiSelectedSideBook(selectedSide, yesBids, noBids);

  if (!book.ok) {
    return book;
  }

  const capturedAt = (options.now ?? (() => new Date()))().toISOString();
  const seq = getNumber(payload, "seq");
  const snapshot = createNormalizedSnapshot({
    marketRef,
    capturedAt,
    bids: book.value.bids,
    asks: book.value.asks,
    tickSize: marketRef.tickSize,
    connectionMode: "streaming",
    providerMetadata: {
      sourceShape: "kalshi_wss_orderbook_snapshot",
      selectedSide,
      marketTicker,
      ...(seq !== undefined ? { kalshiSeq: seq } : {}),
    },
  });

  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    value: {
      providerId: "kalshi",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "snapshot",
      message: "Kalshi WebSocket orderbook_snapshot normalized.",
      snapshot: snapshot.value,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    },
  };
}

function normalizeKalshiBookStreamDelta(
  payload: Record<string, unknown>,
  marketRef: TradableMarketRef,
  options: StreamNormalizerOptions,
): StreamNormalizationResult {
  const previousSnapshot = options.previousSnapshot;

  if (previousSnapshot === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_delta requires an existing orderbook_snapshot.",
    );
  }

  const msg = getUnknown(payload, "msg");

  if (!isRecord(msg)) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_delta did not include msg.",
    );
  }

  const seq = getNumber(payload, "seq");
  const previousSeq = readMetadataNumber(previousSnapshot, "kalshiSeq");

  if (seq !== undefined && previousSeq !== undefined && seq <= previousSeq) {
    return ignoredOutOfOrderUpdate(
      "kalshi",
      previousSnapshot,
      "Kalshi out-of-order orderbook_delta ignored.",
      { messageType: "orderbook_delta", seq, previousSeq },
    );
  }

  const selectedSide = normalizeKalshiSide(marketRef.outcomeId);
  const deltaSide = normalizeKalshiSide(getString(msg, "side"));
  const marketTicker = getString(msg, "market_ticker");
  const price = normalizeStreamDecimal(getString(msg, "price_dollars"));
  const delta = normalizeSignedStreamDecimal(getString(msg, "delta_fp"));

  if (
    selectedSide === undefined ||
    deltaSide === undefined ||
    marketTicker !== marketRef.marketId ||
    price === undefined ||
    delta === undefined
  ) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_delta included invalid market, side, price, or delta.",
    );
  }

  const bids = levelsToMap(previousSnapshot.bids);
  const asks = levelsToMap(previousSnapshot.asks);
  const updatesSelectedSide = deltaSide === selectedSide;
  const targetPrice = updatesSelectedSide
    ? price
    : normalizeStreamDecimal(decimalSubtract("1", price));

  if (targetPrice === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi orderbook_delta could not convert opposite-side price.",
    );
  }

  updateDeltaLevel(updatesSelectedSide ? bids : asks, targetPrice, delta);

  const capturedAt =
    parseProviderTimestamp(getUnknown(msg, "ts_ms") ?? getUnknown(msg, "ts")) ??
    (options.now ?? (() => new Date()))().toISOString();
  const staleCheck = checkFreshness(capturedAt, options);

  if (!staleCheck.ok) {
    return staleCheck;
  }

  const snapshot = createNormalizedSnapshot({
    marketRef,
    capturedAt,
    bids: mapToLevels(bids),
    asks: mapToLevels(asks),
    tickSize: previousSnapshot.tickSize,
    connectionMode: "streaming",
    providerMetadata: {
      ...(previousSnapshot.providerMetadata ?? {}),
      sourceShape: "kalshi_wss_orderbook_delta",
      selectedSide,
      marketTicker,
      ...(seq !== undefined ? { kalshiSeq: seq } : {}),
    },
  });

  if (!snapshot.ok) {
    return snapshot;
  }

  return {
    ok: true,
    value: {
      providerId: "kalshi",
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "incremental",
      message: "Kalshi WebSocket orderbook_delta applied.",
      snapshot: snapshot.value,
      ...(snapshot.value.providerMetadata !== undefined
        ? { providerMetadata: snapshot.value.providerMetadata }
        : {}),
    },
  };
}

function createNormalizedSnapshot(input: {
  marketRef: TradableMarketRef;
  capturedAt: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  tickSize: string;
  connectionMode: ConnectionMode;
  providerMetadata: Record<string, unknown>;
}): Result<NormalizedOrderBookSnapshot, MarketDataAdapterError> {
  const normalizedLevels = normalizeOrderBookLevels({
    bids: input.bids,
    asks: input.asks,
  });

  if (!normalizedLevels.ok) {
    return adapterErrorResult<NormalizedOrderBookSnapshot>(
      "invalid_payload",
      "Stream order-book levels contained invalid price or size values.",
      {
        ...input.providerMetadata,
        level: normalizedLevels.error.level,
      },
    );
  }

  const updatedRef = createTradableMarketRef({
    providerId: input.marketRef.providerId,
    marketId: input.marketRef.marketId,
    outcomeId: input.marketRef.outcomeId,
    currency: input.marketRef.currency,
    tickSize: input.tickSize,
    marketStatus: "open",
    freshness: "fresh",
    providerMetadata: {
      ...(input.marketRef.providerMetadata ?? {}),
      ...input.providerMetadata,
    },
  });

  if (!updatedRef.ok) {
    return adapterErrorResult<NormalizedOrderBookSnapshot>(
      mapTradableRefError(updatedRef.error.reason),
      "Stream message could not refresh the tradable market reference.",
      input.providerMetadata,
    );
  }

  return {
    ok: true,
    value: {
      marketRef: updatedRef.value,
      capturedAt: input.capturedAt,
      bids: normalizedLevels.value.bids,
      asks: normalizedLevels.value.asks,
      tickSize: normalizeDecimalString(input.tickSize),
      freshness: "fresh",
      connectionMode: input.connectionMode,
      providerMetadata: input.providerMetadata,
    },
  };
}

function createKalshiSelectedSideBook(
  selectedSide: "yes" | "no",
  yesBids: OrderBookLevel[],
  noBids: OrderBookLevel[],
): Result<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }, MarketDataAdapterError> {
  const sourceBids = selectedSide === "yes" ? yesBids : noBids;
  const oppositeBids = selectedSide === "yes" ? noBids : yesBids;
  const asks = createKalshiImpliedAsks(oppositeBids);

  if (asks === undefined) {
    return adapterErrorResult(
      "invalid_payload",
      "Kalshi binary stream could not be converted into implied asks.",
      { selectedSide },
    );
  }

  return { ok: true, value: { bids: sourceBids, asks } };
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

    const price = normalizeStreamDecimal(decimalSubtract("1", bid.price));

    if (price === undefined) {
      return undefined;
    }

    asks.push({ price, size: bid.size });
  }

  return asks;
}

function checkFreshness(
  capturedAt: string,
  options: StreamNormalizerOptions,
): Result<true, MarketDataAdapterError> {
  const now = options.now ?? (() => new Date());
  const staleThresholdMs = options.staleThresholdMs ?? 10_000;

  if (now().getTime() - Date.parse(capturedAt) > staleThresholdMs) {
    return adapterErrorResult(
      "stale_data",
      "WebSocket stream message is older than the freshness threshold.",
      { capturedAt, thresholdMs: staleThresholdMs },
    );
  }

  return { ok: true, value: true };
}

function ignoredOutOfOrderUpdate(
  providerId: ProviderId,
  previousSnapshot: NormalizedOrderBookSnapshot,
  message: string,
  providerMetadata: Record<string, unknown>,
): StreamNormalizationResult {
  return {
    ok: true,
    value: {
      providerId,
      status: "connected",
      freshness: "fresh",
      connectionMode: "streaming",
      updateType: "ignored_out_of_order",
      message,
      snapshot: previousSnapshot,
      providerMetadata,
    },
  };
}

function streamStateToUpdate(
  state: MarketDataStreamState,
  updateType: NormalizedStreamUpdate["updateType"],
): NormalizedStreamUpdate {
  return {
    providerId: state.providerId,
    status: state.status,
    freshness: state.freshness,
    connectionMode: state.connectionMode,
    updateType,
    message: state.message,
    ...(state.snapshot !== undefined ? { snapshot: state.snapshot } : {}),
    ...(state.providerMetadata !== undefined
      ? { providerMetadata: state.providerMetadata }
      : {}),
  };
}

function createProviderSubscriptionMessage(marketRef: TradableMarketRef) {
  return marketRef.providerId === "polymarket"
    ? createPolymarketMarketSubscriptionMessage(marketRef)
    : createKalshiOrderBookSubscriptionMessage(marketRef);
}

function createSocketRequest(
  marketRef: TradableMarketRef,
  credentialGate: ProviderCredentialGate,
): MarketDataWebSocketConnectRequest {
  if (marketRef.providerId === "polymarket") {
    return {
      providerId: "polymarket",
      url: POLYMARKET_MARKET_WS_URL,
    };
  }

  const credentialState = credentialGate("kalshi");
  const headers =
    credentialState.status === "ready" && credentialState.kalshiAuthHeaders !== undefined
      ? {
          "KALSHI-ACCESS-KEY": credentialState.kalshiAuthHeaders.accessKey,
          "KALSHI-ACCESS-SIGNATURE": credentialState.kalshiAuthHeaders.accessSignature,
          "KALSHI-ACCESS-TIMESTAMP": credentialState.kalshiAuthHeaders.accessTimestamp,
        }
      : undefined;

  return {
    providerId: "kalshi",
    url: KALSHI_TRADE_WS_URL,
    ...(headers !== undefined ? { headers } : {}),
  };
}

function getRuntimeProviderIds(providerId: ProviderId | undefined): ProviderId[] {
  return providerId === undefined ? ["polymarket", "kalshi"] : [providerId];
}

function stripProviderMetadata(
  snapshot: NormalizedOrderBookSnapshot,
): RendererOrderBookSnapshot {
  return {
    marketRef: {
      providerId: snapshot.marketRef.providerId,
      marketId: snapshot.marketRef.marketId,
      outcomeId: snapshot.marketRef.outcomeId,
      currency: snapshot.marketRef.currency,
      tickSize: snapshot.marketRef.tickSize,
      marketStatus: snapshot.marketRef.marketStatus,
      freshness: snapshot.marketRef.freshness,
    },
    capturedAt: snapshot.capturedAt,
    bids: snapshot.bids,
    asks: snapshot.asks,
    tickSize: snapshot.tickSize,
    ...(snapshot.minOrderSize !== undefined
      ? { minOrderSize: snapshot.minOrderSize }
      : {}),
    freshness: snapshot.freshness,
    connectionMode: snapshot.connectionMode,
  };
}

function resolveErrorProviderId(error: MarketDataAdapterError): ProviderId {
  const providerId = error.providerMetadata?.providerId;

  return providerId === "kalshi" ? "kalshi" : "polymarket";
}

function withMarketDataErrorProvider<TData>(
  result: MarketDataResult<TData>,
  providerId: ProviderId,
): MarketDataResult<TData> {
  if (result.ok) {
    return result;
  }

  return {
    ok: false,
    error: withAdapterErrorProvider(result.error, providerId),
  };
}

function withStreamErrorProvider<TData>(
  result: Result<TData, MarketDataAdapterError>,
  providerId: ProviderId,
): Result<TData, MarketDataAdapterError> {
  if (result.ok) {
    return result;
  }

  return {
    ok: false,
    error: withAdapterErrorProvider(result.error, providerId),
  };
}

function withAdapterErrorProvider(
  error: MarketDataAdapterError,
  providerId: ProviderId,
): MarketDataAdapterError {
  return {
    ...error,
    providerMetadata: {
      ...(error.providerMetadata ?? {}),
      providerId: error.providerMetadata?.providerId ?? providerId,
    },
  };
}

function mapErrorToConnectionStatus(
  reason: MarketDataAdapterErrorReason,
): MarketDataConnectionStatus {
  switch (reason) {
    case "provider_credentials_required":
      return "credentials-required";
    case "websocket_disconnected":
    case "network_error":
      return "disconnected";
    case "stale_data":
      return "stale";
    case "invalid_payload":
    case "invalid_tick_size":
      return "invalid";
    case "provider_not_supported":
    case "unsupported_market":
      return "blocked";
    case "provider_status_unknown":
      return "provider-error";
    case "market_not_found":
    case "outcome_not_found":
    case "empty_liquidity":
    case "not_implemented":
      return "unavailable";
  }
}

function levelsToMap(levels: readonly OrderBookLevel[]): Map<string, string> {
  return new Map(levels.map((level) => [level.price, level.size]));
}

function mapToLevels(levels: Map<string, string>): OrderBookLevel[] {
  return [...levels.entries()].map(([price, size]) => ({ price, size }));
}

function updateAbsoluteLevel(
  levels: Map<string, string>,
  price: string,
  size: string,
): void {
  if (compareDecimalStrings(size, "0") === 0) {
    levels.delete(price);
    return;
  }

  levels.set(price, size);
}

function updateDeltaLevel(
  levels: Map<string, string>,
  price: string,
  delta: string,
): void {
  const previousSize = levels.get(price) ?? "0";
  const nextSize = normalizeDecimalString(decimalAdd(previousSize, delta));

  if (compareDecimalStrings(nextSize, "0") <= 0) {
    levels.delete(price);
    return;
  }

  levels.set(price, nextSize);
}

function isOutOfOrder(
  capturedAt: string,
  previousSnapshot: NormalizedOrderBookSnapshot,
): boolean {
  return Date.parse(capturedAt) <= Date.parse(previousSnapshot.capturedAt);
}

function readMetadataNumber(
  snapshot: NormalizedOrderBookSnapshot,
  key: string,
): number | undefined {
  const value = snapshot.providerMetadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseMessageRecord(
  message: unknown,
): Result<Record<string, unknown>, MarketDataAdapterError> {
  const parsed = typeof message === "string" ? parseJson(message) : message;
  const candidate =
    Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;

  if (!isRecord(candidate)) {
    return adapterErrorResult(
      "invalid_payload",
      "WebSocket message was not a JSON object.",
    );
  }

  return { ok: true, value: candidate };
}

function parseObjectLevels(value: unknown): OrderBookLevel[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const levels: OrderBookLevel[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return undefined;
    }

    const price = normalizeStreamDecimal(getString(item, "price"));
    const size = normalizeStreamDecimal(getString(item, "size"));

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

    const price = normalizeStreamDecimal(stringifyId(item[0]));
    const size = normalizeStreamDecimal(stringifyId(item[1]));

    if (price === undefined || size === undefined) {
      return undefined;
    }

    levels.push({ price, size });
  }

  return levels;
}

function normalizeStreamDecimal(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeDecimalSyntax(value);

  if (!validateDecimalString(normalized).ok) {
    return undefined;
  }

  if (compareDecimalStrings(normalized, "0") < 0) {
    return undefined;
  }

  return normalizeDecimalString(normalized);
}

function normalizeSignedStreamDecimal(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeDecimalSyntax(value);

  if (!validateDecimalString(normalized).ok) {
    return undefined;
  }

  return normalizeDecimalString(normalized);
}

function normalizeDecimalSyntax(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith(".")) {
    return `0${trimmed}`;
  }

  if (trimmed.startsWith("-.")) {
    return `-0${trimmed.slice(1)}`;
  }

  return trimmed;
}

function normalizeKalshiSide(value: string | undefined): "yes" | "no" | undefined {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "yes" || normalized === "no") {
    return normalized;
  }

  return undefined;
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

function adapterErrorResult<TData = never>(
  reason: MarketDataAdapterErrorReason,
  message: string,
  providerMetadata?: Record<string, unknown>,
): Result<TData, MarketDataAdapterError> {
  return {
    ok: false,
    error: createAdapterError(reason, message, providerMetadata),
  };
}

function createAdapterError(
  reason: MarketDataAdapterErrorReason,
  message: string,
  providerMetadata?: Record<string, unknown>,
): MarketDataAdapterError {
  return {
    reason,
    message,
    ...(providerMetadata !== undefined ? { providerMetadata } : {}),
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
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

function getNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = getUnknown(payload, key);

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
