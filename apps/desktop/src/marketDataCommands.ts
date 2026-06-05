import { PROVIDER_IDS, type DataFreshness, type MarketStatus, type ProviderId } from "@prediction-ladder/core";
import type {
  MarketDataAdapterErrorReason,
  MarketDataConnectionStatus,
  MarketDataSource,
  RendererOrderBookSnapshot,
} from "@prediction-ladder/market-data";
import { invoke } from "@tauri-apps/api/core";

import type { ConnectionMode } from "@prediction-ladder/core";

export type RendererOutcomeView = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
  label: string;
  status: "tradable" | "closed" | "resolved" | "unknown";
};

export type RendererMarketSearchResult = {
  providerId: ProviderId;
  marketId: string;
  title: string;
  status: MarketStatus;
  outcomes: readonly RendererOutcomeView[];
  volume?: string;
  liquidity?: string;
};

export type VenueCommandState = {
  providerId: ProviderId;
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  message: string;
  errorReason?: MarketDataAdapterErrorReason;
  hasMore: boolean;
  nextCursor?: string;
};

export type MarketSearchCursorByProvider = Partial<Record<ProviderId, string>>;

type SecretFreeCommandResponse = {
  providerId?: ProviderId;
  marketId?: string;
  outcomeId?: string;
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  message: string;
  secretFree: true;
  errorReason?: MarketDataAdapterErrorReason;
};

export type MarketSearchCommandRequest = {
  query: string;
  providerId?: ProviderId;
  limit?: number;
  offset?: number;
  cursorByProvider?: MarketSearchCursorByProvider;
};

export type MarketGetOrderBookCommandRequest = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
};

export type MarketSubscribeCommandRequest = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
};

export type MarketSearchCommandResponse = SecretFreeCommandResponse & {
  command: "market_search";
  markets: readonly RendererMarketSearchResult[];
  providerStates: readonly VenueCommandState[];
  capturedAt?: string;
  providerIds: readonly ProviderId[];
  hasMore: boolean;
  nextOffset?: number;
  nextCursorByProvider?: MarketSearchCursorByProvider;
};

export type MarketGetOrderBookCommandResponse = SecretFreeCommandResponse & {
  command: "market_get_order_book";
  sourceKind?: MarketDataSource["kind"];
  orderBook?: RendererOrderBookSnapshot;
};

export type MarketSubscribeCommandResponse = SecretFreeCommandResponse & {
  command: "market_subscribe";
};

export type MarketDataCommandClient = {
  marketSearch: (
    request: MarketSearchCommandRequest,
  ) => Promise<MarketSearchCommandResponse>;
  marketGetOrderBook: (
    request: MarketGetOrderBookCommandRequest,
  ) => Promise<MarketGetOrderBookCommandResponse>;
  marketSubscribe: (
    request: MarketSubscribeCommandRequest,
  ) => Promise<MarketSubscribeCommandResponse>;
};

export const tauriMarketDataCommandClient: MarketDataCommandClient = {
  async marketSearch(request) {
    if (!isTauriInvokeAvailable()) {
      return createBrowserUnavailableSearchResponse(request);
    }

    try {
      return await invoke<MarketSearchCommandResponse>("market_search", { request });
    } catch (error) {
      return createInvokeFailedSearchResponse(request, error);
    }
  },
  async marketGetOrderBook(request) {
    if (!isTauriInvokeAvailable()) {
      return createBrowserUnavailableOrderBookResponse(request);
    }

    try {
      return await invoke<MarketGetOrderBookCommandResponse>("market_get_order_book", {
        request,
      });
    } catch (error) {
      return createInvokeFailedOrderBookResponse(request, error);
    }
  },
  async marketSubscribe(request) {
    if (!isTauriInvokeAvailable()) {
      return createBrowserUnavailableSubscribeResponse(request);
    }

    try {
      return await invoke<MarketSubscribeCommandResponse>("market_subscribe", {
        request,
      });
    } catch (error) {
      return createInvokeFailedSubscribeResponse(request, error);
    }
  },
};

export function createSearchConnectingResponse(
  request: MarketSearchCommandRequest,
): MarketSearchCommandResponse {
  const providerIds = request.providerId === undefined ? PROVIDER_IDS : [request.providerId];

  return {
    command: "market_search",
    status: "connecting",
    freshness: "disconnected",
    connectionMode: "polling_fallback",
    message:
      request.query.trim() === ""
        ? `Loading first page from ${providerIds.length === 1 ? providerIds[0] : "all venues"}.`
        : `Searching ${providerIds.length === 1 ? providerIds[0] : "all venues"} for "${request.query}".`,
    secretFree: true,
    markets: [],
    providerStates: providerIds.map((providerId) => ({
      providerId,
      status: "connecting",
      freshness: "disconnected",
      connectionMode: "polling_fallback",
      message: "Read-only market search command is in flight.",
      hasMore: false,
    })),
    providerIds,
    hasMore: false,
  };
}

export function createOrderBookConnectingResponse(
  request: MarketGetOrderBookCommandRequest,
): MarketGetOrderBookCommandResponse {
  return {
    command: "market_get_order_book",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "connecting",
    freshness: "disconnected",
    connectionMode: "snapshot",
    message: "Loading normalized read-only order book through Tauri.",
    secretFree: true,
  };
}

export function createSubscribeConnectingResponse(
  request: MarketSubscribeCommandRequest,
): MarketSubscribeCommandResponse {
  return {
    command: "market_subscribe",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "connecting",
    freshness: "disconnected",
    connectionMode: "streaming",
    message: "Requesting provider stream state through Tauri.",
    secretFree: true,
  };
}

function createBrowserUnavailableSearchResponse(
  request: MarketSearchCommandRequest,
): MarketSearchCommandResponse {
  const providerIds = request.providerId === undefined ? PROVIDER_IDS : [request.providerId];

  return {
    command: "market_search",
    status: "unavailable",
    freshness: "disconnected",
    connectionMode: "polling_fallback",
    message:
      "Tauri command bridge is unavailable in this plain browser tab. Open the Tauri desktop shell to run provider-owned market data.",
    secretFree: true,
    markets: [],
    providerStates: providerIds.map((providerId) => ({
      providerId,
      status: "unavailable",
      freshness: "disconnected",
      connectionMode: "polling_fallback",
      message: "Provider runtime is not reachable without the Tauri command bridge.",
      errorReason: "not_implemented",
      hasMore: false,
    })),
    providerIds,
    hasMore: false,
    errorReason: "not_implemented",
  };
}

function createBrowserUnavailableOrderBookResponse(
  request: MarketGetOrderBookCommandRequest,
): MarketGetOrderBookCommandResponse {
  return {
    command: "market_get_order_book",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "unavailable",
    freshness: "disconnected",
    connectionMode: "snapshot",
    message:
      "Tauri command bridge is unavailable; the renderer will not call provider APIs directly.",
    secretFree: true,
    errorReason: "not_implemented",
  };
}

function createBrowserUnavailableSubscribeResponse(
  request: MarketSubscribeCommandRequest,
): MarketSubscribeCommandResponse {
  return {
    command: "market_subscribe",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "unavailable",
    freshness: "disconnected",
    connectionMode: "streaming",
    message:
      "Tauri command bridge is unavailable; no WebSocket transport is exposed to React.",
    secretFree: true,
    errorReason: "not_implemented",
  };
}

function createInvokeFailedSearchResponse(
  request: MarketSearchCommandRequest,
  error: unknown,
): MarketSearchCommandResponse {
  const providerIds = request.providerId === undefined ? PROVIDER_IDS : [request.providerId];
  const message = `Tauri market_search failed before returning normalized state: ${formatError(error)}.`;

  return {
    command: "market_search",
    status: "provider-error",
    freshness: "disconnected",
    connectionMode: "polling_fallback",
    message,
    secretFree: true,
    markets: [],
    providerStates: providerIds.map((providerId) => ({
      providerId,
      status: "provider-error",
      freshness: "disconnected",
      connectionMode: "polling_fallback",
      message,
      errorReason: "provider_status_unknown",
      hasMore: false,
    })),
    providerIds,
    hasMore: false,
    errorReason: "provider_status_unknown",
  };
}

function createInvokeFailedOrderBookResponse(
  request: MarketGetOrderBookCommandRequest,
  error: unknown,
): MarketGetOrderBookCommandResponse {
  return {
    command: "market_get_order_book",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "provider-error",
    freshness: "disconnected",
    connectionMode: "snapshot",
    message: `Tauri market_get_order_book failed before returning normalized state: ${formatError(error)}.`,
    secretFree: true,
    errorReason: "provider_status_unknown",
  };
}

function createInvokeFailedSubscribeResponse(
  request: MarketSubscribeCommandRequest,
  error: unknown,
): MarketSubscribeCommandResponse {
  return {
    command: "market_subscribe",
    providerId: request.providerId,
    marketId: request.marketId,
    outcomeId: request.outcomeId,
    status: "provider-error",
    freshness: "disconnected",
    connectionMode: "streaming",
    message: `Tauri market_subscribe failed before returning normalized state: ${formatError(error)}.`,
    secretFree: true,
    errorReason: "provider_status_unknown",
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTauriInvokeAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
