import type {
  ConnectionMode,
  DataFreshness,
  MarketStatus,
  NormalizedOrderBookSnapshot,
  NormalizedOutcome,
  ProviderId,
  Result,
  TradableMarketRef,
} from "@prediction-ladder/core";

export type MarketDataBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "official_runtime_streaming_ready";
};

export function createMarketDataBootstrapStatus(): MarketDataBootstrapStatus {
  return {
    packageName: "@prediction-ladder/market-data",
    boundary: "provider-neutral market-data ports, adapters, and streaming runtime",
    boundaryReady: true,
    implementationStatus: "official_runtime_streaming_ready",
  };
}

export type MarketDataAdapterErrorReason =
  | "provider_not_supported"
  | "market_not_found"
  | "outcome_not_found"
  | "network_error"
  | "invalid_payload"
  | "websocket_disconnected"
  | "stale_data"
  | "invalid_tick_size"
  | "empty_liquidity"
  | "unsupported_market"
  | "provider_credentials_required"
  | "provider_status_unknown"
  | "not_implemented";

export type MarketDataAdapterError = {
  reason: MarketDataAdapterErrorReason;
  message: string;
  providerMetadata?: Record<string, unknown>;
};

export type LiveMarketDataSource = {
  kind: "official_live";
  fetchedAt: string;
};

export type FixtureMarketDataSource = {
  kind: "official_fixture";
  fixtureName: string;
};

export type ConfiguredRealMarketSource = {
  kind: "configured_real_market";
  configKey: string;
};

export type MarketDataSource =
  | LiveMarketDataSource
  | FixtureMarketDataSource
  | ConfiguredRealMarketSource;

export type MarketDataSuccess<TData> = {
  data: TData;
  source: MarketDataSource;
  freshness?: DataFreshness;
  connectionMode?: ConnectionMode;
  providerMetadata?: Record<string, unknown>;
};

export type MarketDataResult<TData> = Result<
  MarketDataSuccess<TData>,
  MarketDataAdapterError
>;

export function createFixtureMarketDataSource(
  fixtureName: string,
): FixtureMarketDataSource {
  return { kind: "official_fixture", fixtureName };
}

export function isLiveMarketDataSource(source: MarketDataSource): boolean {
  return source.kind === "official_live";
}

export type MarketSearchRequest = {
  query: string;
  providerId?: ProviderId;
  limit?: number;
};

export type MarketDiscoveryItem = {
  providerId: ProviderId;
  marketId: string;
  title: string;
  status: MarketStatus;
  outcomes: NormalizedOutcome[];
  volume?: string;
  liquidity?: string;
  providerMetadata?: Record<string, unknown>;
};

export type MarketDiscoverySnapshot = {
  providerId: ProviderId;
  capturedAt: string;
  markets: MarketDiscoveryItem[];
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  providerMetadata?: Record<string, unknown>;
};

export type MarketResolveRequest = {
  providerId: ProviderId;
  marketId: string;
  outcomeId?: string;
  providerMetadata?: Record<string, unknown>;
};

export type Unsubscribe = () => void;

export type MarketDataEvent =
  | {
      type: "snapshot";
      snapshot: NormalizedOrderBookSnapshot;
    }
  | {
      type: "stale" | "disconnected" | "invalid";
      reason: string;
      providerMetadata?: Record<string, unknown>;
    };

export interface MarketDiscoveryAdapter {
  providerId: ProviderId;
  searchMarkets(request: MarketSearchRequest): Promise<MarketDataResult<MarketDiscoverySnapshot>>;
  resolveMarket(request: MarketResolveRequest): Promise<MarketDataResult<TradableMarketRef>>;
}

export interface MarketDataAdapter {
  providerId: ProviderId;
  getOrderBook(
    marketRef: TradableMarketRef,
  ): Promise<MarketDataResult<NormalizedOrderBookSnapshot>>;
  subscribeOrderBook?(
    marketRef: TradableMarketRef,
    onEvent: (event: MarketDataEvent) => void,
  ): Unsubscribe;
}

export * from "./providerAdapters";
export * from "./streaming";
