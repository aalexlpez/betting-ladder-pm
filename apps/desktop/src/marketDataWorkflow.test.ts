import { describe, expect, it } from "vitest";

import {
  canSubmitOrders,
  createDesktopTerminalState,
} from "./appConfig";
import type {
  MarketDataCommandClient,
  MarketGetOrderBookCommandResponse,
  MarketSearchCommandRequest,
  MarketSearchCommandResponse,
  MarketSubscribeCommandResponse,
  RendererMarketSearchResult,
} from "./marketDataCommands";
import {
  beginLoadMoreMarketSearch,
  beginMarketSelection,
  canLoadMoreMarketSearch,
  createInitialMarketDataWorkflowState,
  runLoadMoreMarketSearch,
  loadSelectedMarketWorkflow,
  runMarketSearch,
  selectOutcomeFromMarket,
} from "./marketDataWorkflow";

describe("unified desktop market-data workflow", () => {
  it("treats an empty market search as the all-markets browse path", async () => {
    const calls: string[] = [];
    const workflow = await runMarketSearch(
      createCommandClient({ calls, searchResponse: createSearchResponse([polymarketMarket]) }),
      createInitialMarketDataWorkflowState(),
      "   ",
    );
    const state = createDesktopTerminalState({ workflow });

    expect(calls).toEqual(["market_search::all:50:0:"]);
    expect(workflow.query).toBe("");
    expect(workflow.providerFilter).toBe("all");
    expect(state.marketSearch.results).toHaveLength(1);
    expect(state.marketSearch.status).toBe("connected");
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("passes direct provider filters through the Tauri command request", async () => {
    const calls: string[] = [];
    const workflow = await runMarketSearch(
      createCommandClient({ calls, searchResponse: createSearchResponse([kalshiMarket]) }),
      createInitialMarketDataWorkflowState(),
      "fed",
      "kalshi",
    );
    const state = createDesktopTerminalState({ workflow });

    expect(calls).toEqual(["market_search:fed:kalshi:50:0:"]);
    expect(workflow.providerFilter).toBe("kalshi");
    expect(state.marketSearch.providerFilter).toBe("kalshi");
    expect(state.marketSearch.results.map((market) => market.providerId)).toEqual(["kalshi"]);
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("calls market_search and represents one unified multi-venue result list", async () => {
    const calls: string[] = [];
    const client = createCommandClient({
      calls,
      searchResponse: createSearchResponse([polymarketMarket, kalshiMarket]),
    });

    const workflow = await runMarketSearch(
      client,
      createInitialMarketDataWorkflowState(),
      "fed",
    );
    const state = createDesktopTerminalState({ workflow });

    expect(calls).toEqual(["market_search:fed:all:50:0:"]);
    expect(state.marketSearch.canQueryExternalApis).toBe(false);
    expect(state.marketSearch.canInvokeTauriCommands).toBe(true);
    expect(state.marketSearch.results.map((market) => market.providerId)).toEqual([
      "polymarket",
      "kalshi",
    ]);
    expect(state.marketSearch.results.every((market) => market.outcomes.length > 0)).toBe(
      true,
    );
  });

  it("preserves per-venue search diagnostics for partial provider blockers", async () => {
    const response: MarketSearchCommandResponse = {
      ...createSearchResponse([polymarketMarket], {
        hasMore: true,
        nextOffset: 50,
        nextCursorByProvider: { kalshi: "cursor-2" },
      }),
      message:
        "Unified read-only search returned 1 provider-backed markets from 1/2 connected venues; blocked venues: kalshi disconnected.",
      providerStates: [
        {
          providerId: "polymarket",
          status: "connected",
          freshness: "fresh",
          connectionMode: "polling_fallback",
          message: "Polymarket public REST search available.",
          hasMore: true,
        },
        {
          providerId: "kalshi",
          status: "disconnected",
          freshness: "disconnected",
          connectionMode: "polling_fallback",
          message:
            "Kalshi provider TLS/certificate validation failed before a response. Check DNS/proxy/network filtering and retry.",
          errorReason: "network_error",
          hasMore: true,
          nextCursor: "cursor-2",
        },
      ],
    };
    const workflow = await runMarketSearch(
      createCommandClient({ searchResponse: response }),
      createInitialMarketDataWorkflowState(),
      "",
    );
    const state = createDesktopTerminalState({ workflow });

    expect(state.marketSearch.summary).toContain("blocked venues: kalshi disconnected");
    expect(state.marketSearch.canLoadMore).toBe(true);
    expect(state.marketSearch.providerStates).toContainEqual(response.providerStates[1]);
    expect(state.providers.find((provider) => provider.id === "kalshi")?.connectionStatus).toBe(
      "disconnected",
    );
    expect(state.providers.find((provider) => provider.id === "kalshi")?.summary).toContain(
      "TLS/certificate validation failed",
    );
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("loads more markets with offset and provider cursors without clearing the selected ladder", async () => {
    const calls: string[] = [];
    const firstPage = await runMarketSearch(
      createCommandClient({
        calls,
        searchResponse: createSearchResponse([polymarketMarket], {
          hasMore: true,
          nextOffset: 50,
          nextCursorByProvider: { kalshi: "cursor-1" },
        }),
      }),
      createInitialMarketDataWorkflowState(),
      "",
    );
    const selected = beginMarketSelection(
      firstPage,
      expectSelection(selectOutcomeFromMarket(polymarketMarket, "pm-token-yes")),
    );
    const pending = beginLoadMoreMarketSearch(selected);
    const loaded = await runLoadMoreMarketSearch(
      createCommandClient({
        calls,
        searchResponse: createSearchResponse([kalshiMarket], {
          hasMore: false,
        }),
      }),
      selected,
    );
    const state = createDesktopTerminalState({ workflow: loaded });

    expect(canLoadMoreMarketSearch(firstPage)).toBe(true);
    expect(pending.search.markets).toHaveLength(1);
    expect(calls).toEqual([
      "market_search::all:50:0:",
      "market_search::all:50:50:cursor-1",
    ]);
    expect(loaded.search.markets.map((market) => market.providerId)).toEqual([
      "polymarket",
      "kalshi",
    ]);
    expect(loaded.selected?.market.marketId).toBe("pm-market-1");
    expect(state.marketSearch.canLoadMore).toBe(false);
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("calls market_get_order_book after outcome selection and renders Polymarket through the shared ladder", async () => {
    const calls: string[] = [];
    const searched = await runMarketSearch(
      createCommandClient({
        calls,
        searchResponse: createSearchResponse([polymarketMarket]),
      }),
      createInitialMarketDataWorkflowState(),
      "fed",
    );
    const selection = expectSelection(
      selectOutcomeFromMarket(searched.search.markets[0]!, "pm-token-yes"),
    );
    const client = createCommandClient({
      calls,
      orderBookResponse: createOrderBookResponse("polymarket"),
      subscribeResponse: createSubscribeResponse("polymarket", "unavailable"),
    });

    const workflow = await loadSelectedMarketWorkflow(client, searched, selection);
    const state = createDesktopTerminalState({ workflow });

    expect(calls).toEqual([
      "market_search:fed:all:50:0:",
      "market_get_order_book:polymarket:pm-market-1:pm-token-yes",
      "market_subscribe:polymarket:pm-market-1:pm-token-yes",
    ]);
    expect(state.selectedMarket?.providerId).toBe("polymarket");
    expect(state.ladder.currentState).toBe("fresh");
    expect(state.ladder.rows).toContainEqual({
      level: 3,
      price: "0.5",
      bidSize: "12",
      status: "provider_snapshot",
      isBestBid: true,
      isBestAsk: false,
    });
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("makes Kalshi credentials-required subscription state visible without faking connection", async () => {
    const selection = expectSelection(selectOutcomeFromMarket(kalshiMarket, "yes"));
    const workflow = await loadSelectedMarketWorkflow(
      createCommandClient({
        orderBookResponse: createOrderBookResponse("kalshi"),
        subscribeResponse: createSubscribeResponse("kalshi", "credentials-required"),
      }),
      beginMarketSelection(createInitialMarketDataWorkflowState(), selection),
      selection,
    );
    const state = createDesktopTerminalState({ workflow });

    expect(state.subscription.status).toBe("credentials-required");
    expect(state.providers.find((provider) => provider.id === "kalshi")?.connectionStatus).toBe(
      "connected",
    );
    expect(state.providers.find((provider) => provider.id === "kalshi")?.summary).toContain(
      "Stream state:",
    );
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("renders unavailable, provider-error, stale, and invalid states without enabling orders", () => {
    const cases: Array<MarketGetOrderBookCommandResponse["status"]> = [
      "unavailable",
      "provider-error",
      "stale",
      "invalid",
    ];

    for (const status of cases) {
      const workflow = {
        ...createInitialMarketDataWorkflowState(),
        selected: expectSelection(selectOutcomeFromMarket(polymarketMarket, "pm-token-yes")),
        orderBook:
          status === "stale"
            ? createOrderBookResponse("polymarket", "stale")
            : createOrderBookErrorResponse("polymarket", status),
        subscription: createSubscribeResponse("polymarket", "unavailable"),
      };
      const state = createDesktopTerminalState({ workflow });

      expect(state.ladder.rows.length).toBeGreaterThan(0);
      expect(canSubmitOrders(state)).toBe(false);
    }
  });

  it("blocks fixture or leaky data from appearing as provider success", () => {
    const workflow = {
      ...createInitialMarketDataWorkflowState(),
      selected: expectSelection(selectOutcomeFromMarket(polymarketMarket, "pm-token-yes")),
      orderBook: {
        ...createOrderBookResponse("polymarket"),
        sourceKind: "official_fixture",
        orderBook: {
          ...createOrderBookResponse("polymarket").orderBook,
          providerMetadata: { authHeader: "must-not-cross" },
          marketRef: {
            ...createOrderBookResponse("polymarket").orderBook?.marketRef,
            providerMetadata: { apiSecret: "must-not-cross" },
          },
        },
      } as unknown as MarketGetOrderBookCommandResponse,
      subscription: createSubscribeResponse("polymarket", "unavailable"),
    };
    const state = createDesktopTerminalState({ workflow });
    const serialized = JSON.stringify(state);

    expect(state.marketData.status).toBe("non_live_fixture");
    expect(state.ladder.rows.every((row) => row.status === "no_book_loaded")).toBe(true);
    expect(serialized).not.toContain("providerMetadata");
    expect(serialized).not.toContain("authHeader");
    expect(serialized).not.toContain("apiSecret");
    expect(canSubmitOrders(state)).toBe(false);
  });
});

function createCommandClient(input: {
  calls?: string[];
  searchResponse?: MarketSearchCommandResponse;
  orderBookResponse?: MarketGetOrderBookCommandResponse;
  subscribeResponse?: MarketSubscribeCommandResponse;
}): MarketDataCommandClient {
  return {
    async marketSearch(request: MarketSearchCommandRequest) {
      input.calls?.push(
        `market_search:${request.query}:${request.providerId ?? "all"}:${request.limit ?? ""}:${request.offset ?? 0}:${request.cursorByProvider?.kalshi ?? ""}`,
      );
      return input.searchResponse ?? createSearchResponse([]);
    },
    async marketGetOrderBook(request) {
      input.calls?.push(
        `market_get_order_book:${request.providerId}:${request.marketId}:${request.outcomeId}`,
      );
      return input.orderBookResponse ?? createOrderBookResponse(request.providerId);
    },
    async marketSubscribe(request) {
      input.calls?.push(
        `market_subscribe:${request.providerId}:${request.marketId}:${request.outcomeId}`,
      );
      return input.subscribeResponse ?? createSubscribeResponse(request.providerId, "unavailable");
    },
  };
}

function createSearchResponse(
  markets: readonly RendererMarketSearchResult[],
  pagination: {
    hasMore?: boolean;
    nextOffset?: number;
    nextCursorByProvider?: MarketSearchCommandResponse["nextCursorByProvider"];
  } = {},
): MarketSearchCommandResponse {
  return {
    command: "market_search",
    status: markets.length > 0 ? "connected" : "unavailable",
    freshness: markets.length > 0 ? "fresh" : "disconnected",
    connectionMode: "polling_fallback",
    message: "Unified read-only market search returned normalized results.",
    secretFree: true,
    markets,
    providerStates: [
      {
        providerId: "polymarket",
        status: "connected",
        freshness: "fresh",
        connectionMode: "polling_fallback",
        message: "Polymarket public REST search available.",
        hasMore: pagination.hasMore ?? false,
      },
      {
        providerId: "kalshi",
        status: "credentials-required",
        freshness: "disconnected",
        connectionMode: "polling_fallback",
        message: "Kalshi returned credentials-required for this command.",
        errorReason: "provider_credentials_required",
        hasMore: pagination.hasMore ?? false,
        ...(pagination.nextCursorByProvider?.kalshi === undefined
          ? {}
          : { nextCursor: pagination.nextCursorByProvider.kalshi }),
      },
    ],
    providerIds: ["polymarket", "kalshi"],
    hasMore: pagination.hasMore ?? false,
    ...(pagination.nextOffset === undefined ? {} : { nextOffset: pagination.nextOffset }),
    ...(pagination.nextCursorByProvider === undefined
      ? {}
      : { nextCursorByProvider: pagination.nextCursorByProvider }),
  };
}

function createOrderBookResponse(
  providerId: "polymarket" | "kalshi",
  freshness: "fresh" | "stale" = "fresh",
): MarketGetOrderBookCommandResponse {
  const marketId = providerId === "polymarket" ? "pm-market-1" : "KX-FEDCUT-26JUN";
  const outcomeId = providerId === "polymarket" ? "pm-token-yes" : "yes";

  return {
    command: "market_get_order_book",
    providerId,
    marketId,
    outcomeId,
    status: freshness === "fresh" ? "connected" : "stale",
    freshness,
    connectionMode: "snapshot",
    message: "Normalized official provider snapshot loaded.",
    secretFree: true,
    sourceKind: "official_live",
    orderBook: {
      marketRef: {
        providerId,
        marketId,
        outcomeId,
        currency: providerId === "polymarket" ? "USDC" : "USD",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      },
      capturedAt: "2026-06-03T10:00:00.000Z",
      bids: [
        { price: "0.49", size: "7" },
        { price: "0.50", size: "12" },
      ],
      asks: [
        { price: "0.52", size: "5" },
        { price: "0.53", size: "8" },
      ],
      tickSize: "0.01",
      freshness,
      connectionMode: "snapshot",
    },
  };
}

function createOrderBookErrorResponse(
  providerId: "polymarket" | "kalshi",
  status: MarketGetOrderBookCommandResponse["status"],
): MarketGetOrderBookCommandResponse {
  return {
    command: "market_get_order_book",
    providerId,
    marketId: providerId === "polymarket" ? "pm-market-1" : "KX-FEDCUT-26JUN",
    outcomeId: providerId === "polymarket" ? "pm-token-yes" : "yes",
    status,
    freshness: status === "invalid" ? "invalid" : "disconnected",
    connectionMode: "snapshot",
    message: `${status} state returned by command.`,
    secretFree: true,
    errorReason:
      status === "provider-error"
        ? "provider_status_unknown"
        : status === "invalid"
          ? "invalid_payload"
          : "not_implemented",
  };
}

function createSubscribeResponse(
  providerId: "polymarket" | "kalshi",
  status: MarketSubscribeCommandResponse["status"],
): MarketSubscribeCommandResponse {
  return {
    command: "market_subscribe",
    providerId,
    marketId: providerId === "polymarket" ? "pm-market-1" : "KX-FEDCUT-26JUN",
    outcomeId: providerId === "polymarket" ? "pm-token-yes" : "yes",
    status,
    freshness: status === "connected" ? "fresh" : "disconnected",
    connectionMode: "streaming",
    message: `${providerId} subscription state is ${status}.`,
    secretFree: true,
    ...(status === "credentials-required"
      ? { errorReason: "provider_credentials_required" as const }
      : {}),
  };
}

function expectSelection<T>(selection: T | null): T {
  expect(selection).not.toBeNull();

  if (selection === null) {
    throw new Error("Expected selection");
  }

  return selection;
}

const polymarketMarket: RendererMarketSearchResult = {
  providerId: "polymarket",
  marketId: "pm-market-1",
  title: "Will the Fed cut rates in June 2026?",
  status: "open",
  outcomes: [
    {
      providerId: "polymarket",
      marketId: "pm-market-1",
      outcomeId: "pm-token-yes",
      label: "Yes",
      status: "tradable",
    },
    {
      providerId: "polymarket",
      marketId: "pm-market-1",
      outcomeId: "pm-token-no",
      label: "No",
      status: "tradable",
    },
  ],
  volume: "12000",
  liquidity: "3400",
};

const kalshiMarket: RendererMarketSearchResult = {
  providerId: "kalshi",
  marketId: "KX-FEDCUT-26JUN",
  title: "Fed cut in June 2026?",
  status: "open",
  outcomes: [
    {
      providerId: "kalshi",
      marketId: "KX-FEDCUT-26JUN",
      outcomeId: "yes",
      label: "Yes",
      status: "tradable",
    },
    {
      providerId: "kalshi",
      marketId: "KX-FEDCUT-26JUN",
      outcomeId: "no",
      label: "No",
      status: "tradable",
    },
  ],
};
