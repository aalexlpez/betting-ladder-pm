import type {
  MarketDataCommandClient,
  MarketGetOrderBookCommandResponse,
  MarketSearchCommandResponse,
  MarketSubscribeCommandResponse,
  RendererMarketSearchResult,
  RendererOutcomeView,
} from "./marketDataCommands";
import {
  createOrderBookConnectingResponse,
  createSearchConnectingResponse,
  createSubscribeConnectingResponse,
} from "./marketDataCommands";

export type MarketOutcomeSelection = {
  market: RendererMarketSearchResult;
  outcome: RendererOutcomeView;
};

export type MarketProviderFilter = "all" | RendererMarketSearchResult["providerId"];

export type MarketDataWorkflowState = {
  query: string;
  providerFilter: MarketProviderFilter;
  search: MarketSearchCommandResponse;
  selected: MarketOutcomeSelection | null;
  orderBook: MarketGetOrderBookCommandResponse | null;
  subscription: MarketSubscribeCommandResponse | null;
};

export function createInitialMarketDataWorkflowState(): MarketDataWorkflowState {
  return {
    query: "",
    providerFilter: "all",
    search: {
      command: "market_search",
      status: "disconnected",
      freshness: "disconnected",
      connectionMode: "polling_fallback",
      message:
        "Open the desktop shell to load the first page of Polymarket and Kalshi markets through the Tauri market-data boundary.",
      secretFree: true,
      markets: [],
      providerStates: [],
      providerIds: [],
      hasMore: false,
    },
    selected: null,
    orderBook: null,
    subscription: null,
  };
}

export function beginMarketSearch(
  state: MarketDataWorkflowState,
  query: string,
  providerFilter: MarketProviderFilter = state.providerFilter,
): MarketDataWorkflowState {
  const normalizedQuery = normalizeMarketSearchQuery(query);

  return {
    ...state,
    query: normalizedQuery,
    providerFilter,
    search: createSearchConnectingResponse(
      createMarketSearchRequest(normalizedQuery, providerFilter),
    ),
    selected: null,
    orderBook: null,
    subscription: null,
  };
}

export async function runMarketSearch(
  client: MarketDataCommandClient,
  state: MarketDataWorkflowState,
  query: string,
  providerFilter: MarketProviderFilter = state.providerFilter,
): Promise<MarketDataWorkflowState> {
  const normalizedQuery = normalizeMarketSearchQuery(query);

  const response = await client.marketSearch(
    createMarketSearchRequest(normalizedQuery, providerFilter),
  );

  return {
    ...state,
    query: normalizedQuery,
    providerFilter,
    search: response,
    selected: null,
    orderBook: null,
    subscription: null,
  };
}

export function canLoadMoreMarketSearch(state: MarketDataWorkflowState): boolean {
  return state.search.hasMore && state.search.status !== "connecting";
}

export function beginLoadMoreMarketSearch(
  state: MarketDataWorkflowState,
): MarketDataWorkflowState {
  if (!canLoadMoreMarketSearch(state)) {
    return state;
  }

  return {
    ...state,
    search: {
      ...state.search,
      status: "connecting",
      message: `Loading more provider-backed markets after ${state.search.markets.length} visible results.`,
    },
  };
}

export async function runLoadMoreMarketSearch(
  client: MarketDataCommandClient,
  state: MarketDataWorkflowState,
): Promise<MarketDataWorkflowState> {
  if (!canLoadMoreMarketSearch(state)) {
    return state;
  }

  const response = await client.marketSearch(
    createMarketSearchRequest(state.query, state.providerFilter, {
      offset: state.search.nextOffset ?? state.search.markets.length,
      cursorByProvider: state.search.nextCursorByProvider,
    }),
  );

  return {
    ...state,
    search: mergeMarketSearchResponses(state.search, response),
  };
}

export function beginMarketSelection(
  state: MarketDataWorkflowState,
  selection: MarketOutcomeSelection,
): MarketDataWorkflowState {
  const request = toMarketDataRequest(selection);

  return {
    ...state,
    selected: selection,
    orderBook: createOrderBookConnectingResponse(request),
    subscription: createSubscribeConnectingResponse(request),
  };
}

export async function loadSelectedMarketWorkflow(
  client: MarketDataCommandClient,
  state: MarketDataWorkflowState,
  selection: MarketOutcomeSelection,
): Promise<MarketDataWorkflowState> {
  const request = toMarketDataRequest(selection);
  const orderBook = await client.marketGetOrderBook(request);
  const subscription = await client.marketSubscribe(request);

  return {
    ...state,
    selected: selection,
    orderBook,
    subscription,
  };
}

export function selectOutcomeFromMarket(
  market: RendererMarketSearchResult,
  outcomeId: string,
): MarketOutcomeSelection | null {
  const outcome = market.outcomes.find((candidate) => candidate.outcomeId === outcomeId);

  return outcome === undefined ? null : { market, outcome };
}

function toMarketDataRequest(selection: MarketOutcomeSelection) {
  return {
    providerId: selection.market.providerId,
    marketId: selection.market.marketId,
    outcomeId: selection.outcome.outcomeId,
  };
}

function normalizeMarketSearchQuery(query: string): string {
  return query.trim();
}

function providerFilterToCommandProviderId(
  providerFilter: MarketProviderFilter,
): RendererMarketSearchResult["providerId"] | undefined {
  return providerFilter === "all" ? undefined : providerFilter;
}

function createMarketSearchRequest(
  query: string,
  providerFilter: MarketProviderFilter,
  pagination: {
    offset?: number;
    cursorByProvider?: MarketSearchCommandResponse["nextCursorByProvider"];
  } = {},
) {
  const providerId = providerFilterToCommandProviderId(providerFilter);

  return {
    query,
    limit: 50,
    ...(providerId === undefined ? {} : { providerId }),
    ...(pagination.offset === undefined ? {} : { offset: pagination.offset }),
    ...(pagination.cursorByProvider === undefined
      ? {}
      : { cursorByProvider: pagination.cursorByProvider }),
  };
}

function mergeMarketSearchResponses(
  current: MarketSearchCommandResponse,
  next: MarketSearchCommandResponse,
): MarketSearchCommandResponse {
  const markets = [...current.markets];
  const seen = new Set(markets.map((market) => marketKey(market)));

  for (const market of next.markets) {
    const key = marketKey(market);

    if (!seen.has(key)) {
      seen.add(key);
      markets.push(market);
    }
  }

  return {
    ...next,
    markets,
    message:
      next.markets.length === 0
        ? `No additional provider-backed markets were returned. ${next.message}`
        : `Loaded ${next.markets.length} more provider-backed markets; ${markets.length} are visible.`,
  };
}

function marketKey(market: RendererMarketSearchResult): string {
  return `${market.providerId}:${market.marketId}`;
}
