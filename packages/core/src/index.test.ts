import { describe, expect, it } from "vitest";

import {
  aggregateFinancialMetrics,
  buildLadderRows,
  createCoreBootstrapStatus,
  createOrderIntentFromLadderClick,
  createTradableMarketRef,
  decimalAdd,
  decimalDivide,
  decimalMultiply,
  isPriceAlignedToTickSize,
  isTradableMarketRef,
  normalizeOrderBookLevels,
  normalizeDecimalString,
  type FinancialMetrics,
  type MarketRef,
  type MetricValue,
  type NormalizedBalance,
  type NormalizedFill,
  type NormalizedOrder,
  type NormalizedOrderBookSnapshot,
  type NormalizedPosition,
  type OrderIntent,
  type OrderRejectionReason,
  type OrderSafetyPolicyInput,
  PROVIDER_IDS,
  type Result,
  type TradableMarketRef,
  validateDecimalString,
  validateNonNegativeDecimalString,
  validateOrderSafety,
  validatePositiveDecimalString,
} from "./index";

const marketRef: MarketRef = {
  providerId: "polymarket",
  marketId: "pm-election-2026",
  outcomeId: "yes",
  currency: "USDC",
};

const tradableMarketRef: TradableMarketRef = {
  ...marketRef,
  outcomeId: "yes",
  tickSize: "0.01",
  marketStatus: "open",
  freshness: "fresh",
};

function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected ok result, got ${JSON.stringify(result.error)}`);
  }

  return result.value;
}

function money(amount: string, currency = "USDC"): MetricValue {
  return { amount, currency };
}

function unknown(reason: string): MetricValue {
  return { status: "unknown", reason };
}

function metrics(values: {
  realizedPnl?: MetricValue;
  unrealizedPnl?: MetricValue;
  totalPnl?: MetricValue;
  availableFunds?: MetricValue;
  openOrderAmount?: MetricValue;
  exposure?: MetricValue;
}, currency = "USDC"): FinancialMetrics {
  return {
    realizedPnl: values.realizedPnl ?? money("0", currency),
    unrealizedPnl: values.unrealizedPnl ?? money("0", currency),
    totalPnl: values.totalPnl ?? money("0", currency),
    availableFunds: values.availableFunds ?? money("0", currency),
    openOrderAmount: values.openOrderAmount ?? money("0", currency),
    exposure: values.exposure ?? money("0", currency),
  };
}

function getAmount(value: MetricValue): string {
  if ("amount" in value) {
    return value.amount;
  }

  throw new Error(`Expected amount metric, got ${JSON.stringify(value)}`);
}

function getReason(value: MetricValue): string {
  if ("reason" in value) {
    return value.reason;
  }

  throw new Error(`Expected status metric, got ${JSON.stringify(value)}`);
}

function baseBuyIntent(overrides: Partial<OrderIntent> = {}): OrderIntent {
  return {
    id: "intent-1",
    providerId: "polymarket",
    marketRef: tradableMarketRef,
    side: "BUY",
    type: "limit",
    timeInForce: "GTC",
    price: "0.50",
    stakeAmount: { amount: "5", currency: "USDC" },
    quantity: "10",
    estimatedCost: { amount: "5", currency: "USDC" },
    marketable: false,
    createdAt: "2026-06-03T10:00:00.000Z",
    ...overrides,
  };
}

function baseSafetyInput(
  overrides: Partial<OrderSafetyPolicyInput> = {},
): OrderSafetyPolicyInput {
  return {
    executionMode: "live",
    actionClass: "risk_increasing",
    submissionRoute: "one_click",
    orderIntent: baseBuyIntent(),
    selectedMarket: tradableMarketRef,
    orderBookFreshness: "fresh",
    stakeConfigured: true,
    legalGateStatus: "approved",
    geoGateStatus: "approved",
    credentialStatus: "ready",
    localApprovalStatus: "approved",
    oneClickArmed: true,
    firstLiveAck: true,
    killSwitchActive: false,
    maxStakePerOrder: "5",
    maxMarketExposure: "25",
    currentMarketExposure: "2",
    openOrderExposure: "3",
    availableFunds: "100",
    providerExposure: { polymarket: "5", kalshi: "0" },
    marketExposure: { "pm-election-2026": "5" },
    riskClasses: [],
    c1ApprovalStatus: "approved",
    marketableOrderApproved: false,
    paidRoutingEnabled: false,
    feeDisclosureAccepted: false,
    auditLogEnabled: true,
    positionStatus: "available",
    ...overrides,
  };
}

function expectIntentRejected(
  input: Parameters<typeof createOrderIntentFromLadderClick>[0],
  reason: "invalid_price" | "invalid_stake",
): void {
  expect(() => createOrderIntentFromLadderClick(input)).not.toThrow();

  const result = createOrderIntentFromLadderClick(input);

  expect(result.ok).toBe(false);

  if (!result.ok) {
    expect(result.error.reason).toBe(reason);
  }
}

function expectRejected(
  input: OrderSafetyPolicyInput,
  reason: OrderRejectionReason,
): void {
  const result = validateOrderSafety(input);

  expect(result.status).toBe("rejected");

  if (result.status === "rejected") {
    expect(result.reasons).toContain(reason);
  }
}

describe("core package boundary", () => {
  it("keeps the core package marked as a pure domain boundary", () => {
    expect(createCoreBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/core",
      boundary: "pure deterministic domain logic",
      boundaryReady: true,
      implementationStatus: "domain_core_complete",
    });
  });

  it("exports the required first-version provider IDs", () => {
    expect(PROVIDER_IDS).toEqual(["polymarket", "kalshi"]);
  });
});

describe("decimal string helpers", () => {
  it("validates normalized decimal strings at domain boundaries", () => {
    expect(validateDecimalString("0").ok).toBe(true);
    expect(validateDecimalString("12.3400").ok).toBe(true);
    expect(validateDecimalString("001").ok).toBe(false);
    expect(validateDecimalString("NaN").ok).toBe(false);
    expect(validateDecimalString("1e-3").ok).toBe(false);
  });

  it("uses deterministic decimal-safe arithmetic", () => {
    expect(normalizeDecimalString("12.3400")).toBe("12.34");
    expect(decimalAdd("0.1", "0.2")).toBe("0.3");
    expect(decimalAdd("0.7", "0.1")).toBe("0.8");
    expect(decimalMultiply("0.10", "0.20")).toBe("0.02");
    expect(decimalDivide("1", "4")).toBe("0.25");
  });

  it("separates syntactic decimal validation from economic validation", () => {
    expect(validateDecimalString("-1").ok).toBe(true);
    expect(validatePositiveDecimalString("0").ok).toBe(false);
    expect(validatePositiveDecimalString("-0.01").ok).toBe(false);
    expect(validatePositiveDecimalString("0.01").ok).toBe(true);
    expect(validateNonNegativeDecimalString("0").ok).toBe(true);
    expect(validateNonNegativeDecimalString("-0.01").ok).toBe(false);
  });
});

describe("order book ladder rows", () => {
  it("builds provider-neutral ladder rows with best bid and ask markers", () => {
    const rows = buildLadderRows({
      marketRef,
      capturedAt: "2026-06-03T10:00:00.000Z",
      bids: [
        { price: "0.50", size: "12" },
        { price: "0.49", size: "7" },
      ],
      asks: [
        { price: "0.52", size: "5" },
        { price: "0.53", size: "8" },
      ],
    });

    expect(rows.map((row) => row.price)).toEqual([
      "0.53",
      "0.52",
      "0.5",
      "0.49",
    ]);
    expect(rows.find((row) => row.price === "0.5")?.isBestBid).toBe(true);
    expect(rows.find((row) => row.price === "0.52")?.isBestAsk).toBe(true);
    expect(rows.find((row) => row.price === "0.53")?.askSize).toBe("8");
    expect(rows.find((row) => row.price === "0.49")?.bidSize).toBe("7");
  });
});

describe("normalized multi-venue contracts", () => {
  it("requires a tradable market ref before a ladder can become executable", () => {
    expect(
      createTradableMarketRef({
        providerId: "polymarket",
        marketId: "pm-election-2026",
        currency: "USDC",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      }),
    ).toEqual({ ok: false, error: { reason: "outcome_required" } });

    expect(
      createTradableMarketRef({
        providerId: "kalshi",
        marketId: "KX-FED-2026",
        outcomeId: "yes",
        currency: "USD",
        tickSize: "0",
        marketStatus: "open",
        freshness: "fresh",
      }),
    ).toEqual({ ok: false, error: { reason: "invalid_tick_size" } });

    expect(
      createTradableMarketRef({
        providerId: "kalshi",
        marketId: "KX-FED-2026",
        outcomeId: "yes",
        currency: "USD",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "stale",
      }),
    ).toEqual({ ok: false, error: { reason: "data_not_fresh" } });

    expectOk(
      createTradableMarketRef({
        providerId: "kalshi",
        marketId: "KX-FED-2026",
        outcomeId: "yes",
        currency: "USD",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      }),
    );
  });

  it("uses the full tradable-market validation rules in the type guard", () => {
    const validRef = expectOk(
      createTradableMarketRef({
        providerId: "polymarket",
        marketId: "pm-election-2026",
        outcomeId: "pm-token-yes",
        currency: "USDC",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      }),
    );
    const staleRef = {
      providerId: "polymarket",
      marketId: "pm-election-2026",
      outcomeId: "pm-token-yes",
      currency: "USDC",
      tickSize: "0.01",
      marketStatus: "open",
      freshness: "stale",
    } as MarketRef;

    expect(isTradableMarketRef(validRef)).toBe(true);
    expect(isTradableMarketRef(staleRef)).toBe(false);
  });

  it("normalizes Polymarket and Kalshi shaped books into the same ladder model", () => {
    const polymarketRef = expectOk(
      createTradableMarketRef({
        providerId: "polymarket",
        marketId: "pm-election-2026",
        outcomeId: "pm-token-yes",
        currency: "USDC",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
        providerMetadata: { conditionId: "condition-1", negRisk: false },
      }),
    );
    const kalshiRef = expectOk(
      createTradableMarketRef({
        providerId: "kalshi",
        marketId: "KX-FED-2026",
        outcomeId: "yes",
        currency: "USD",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
        providerMetadata: { marketTicker: "KX-FED-2026", selectedSide: "yes" },
      }),
    );
    const normalizedLevels = expectOk(
      normalizeOrderBookLevels({
        bids: [
          { price: "0.49", size: "7.00" },
          { price: "0.50", size: "12.00" },
        ],
        asks: [
          { price: "0.53", size: "8.00" },
          { price: "0.52", size: "5.00" },
        ],
      }),
    );
    const polymarketBook: NormalizedOrderBookSnapshot = {
      marketRef: polymarketRef,
      capturedAt: "2026-06-03T10:00:00.000Z",
      bids: normalizedLevels.bids,
      asks: normalizedLevels.asks,
      tickSize: polymarketRef.tickSize,
      freshness: "fresh",
      connectionMode: "snapshot",
      providerMetadata: { sourceShape: "polymarket_clob" },
    };
    const kalshiBook: NormalizedOrderBookSnapshot = {
      ...polymarketBook,
      marketRef: kalshiRef,
      providerMetadata: { sourceShape: "kalshi_yes_no_book" },
    };

    expect(normalizedLevels.bids.map((level) => level.price)).toEqual([
      "0.5",
      "0.49",
    ]);
    expect(normalizedLevels.asks.map((level) => level.price)).toEqual([
      "0.52",
      "0.53",
    ]);
    expect(buildLadderRows(polymarketBook)).toEqual(buildLadderRows(kalshiBook));
  });

  it("represents unknown account state without inventing balances or positions", () => {
    const marketRef = expectOk(
      createTradableMarketRef({
        providerId: "kalshi",
        marketId: "KX-FED-2026",
        outcomeId: "yes",
        currency: "USD",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      }),
    );
    const balance: NormalizedBalance = {
      providerId: "kalshi",
      currency: "USD",
      available: { status: "unknown", reason: "credentials required" },
      total: { status: "unknown", reason: "credentials required" },
      capturedAt: "2026-06-03T10:00:00.000Z",
    };
    const position: NormalizedPosition = {
      providerId: "kalshi",
      marketId: marketRef.marketId,
      outcomeId: marketRef.outcomeId,
      quantity: { status: "unknown", reason: "portfolio credentials required" },
      exposure: { status: "unknown", reason: "portfolio credentials required" },
      settlement: { status: "unknown", reason: "settlement status unavailable" },
    };
    const openOrder: NormalizedOrder = {
      id: "order-1",
      providerId: "kalshi",
      marketRef,
      side: "BUY",
      type: "limit",
      timeInForce: "GTC",
      state: "unknown",
      price: "0.5",
      originalQuantity: "10",
      filledQuantity: "0",
      remainingQuantity: "10",
      createdAt: "2026-06-03T10:00:00.000Z",
      fees: [],
    };
    const fill: NormalizedFill = {
      id: "fill-1",
      providerId: "kalshi",
      orderId: openOrder.id,
      marketRef,
      price: "0.5",
      quantity: "0",
      fee: { status: "unknown", reason: "fee endpoint credentials required" },
      filledAt: "2026-06-03T10:00:00.000Z",
    };

    expect(balance.available).toEqual({
      status: "unknown",
      reason: "credentials required",
    });
    expect(position.settlement.status).toBe("unknown");
    expect(openOrder.state).toBe("unknown");
    expect(fill.fee).toEqual({
      status: "unknown",
      reason: "fee endpoint credentials required",
    });
  });
});

describe("financial metrics aggregation", () => {
  it("aggregates metrics by global, provider, and market without crossing currencies", () => {
    const snapshot = aggregateFinancialMetrics({
      timestamp: "2026-06-03T10:00:00.000Z",
      entries: [
        {
          providerId: "polymarket",
          marketId: "pm-election-2026",
          outcomeId: "yes",
          metrics: metrics({
            totalPnl: money("1.25", "USDC"),
            availableFunds: money("20", "USDC"),
            openOrderAmount: money("3", "USDC"),
            exposure: money("5", "USDC"),
          }),
        },
        {
          providerId: "kalshi",
          marketId: "ks-fed-2026",
          metrics: metrics(
            {
              totalPnl: money("2.50", "USD"),
              availableFunds: money("30", "USD"),
              openOrderAmount: money("4", "USD"),
              exposure: money("6", "USD"),
            },
            "USD",
          ),
        },
      ],
    });

    expect(snapshot.global).toHaveLength(2);
    expect(snapshot.global.map((item) => getAmount(item.availableFunds))).toEqual([
      "20",
      "30",
    ]);
    expect(snapshot.byProvider).toHaveLength(2);
    expect(snapshot.byMarket).toHaveLength(2);
    expect(
      getAmount(snapshot.byProvider[0]?.metrics[0]?.openOrderAmount ?? unknown("missing")),
    ).toBe("3");
    expect(getAmount(snapshot.byMarket[1]?.metrics[0]?.exposure ?? unknown("missing"))).toBe(
      "6",
    );
  });

  it("propagates unknown metrics instead of inventing account values", () => {
    const snapshot = aggregateFinancialMetrics({
      timestamp: "2026-06-03T10:00:00.000Z",
      entries: [
        {
          providerId: "polymarket",
          marketId: "pm-election-2026",
          metrics: metrics({
            totalPnl: money("0", "USDC"),
            availableFunds: unknown("authenticated account data unavailable"),
          }),
        },
      ],
    });

    expect(getReason(snapshot.global[0]?.availableFunds ?? money("0"))).toBe(
      "authenticated account data unavailable",
    );
  });
});

describe("order intent and exposure", () => {
  it("creates a BUY preview from a bid-side click while one-click is off", () => {
    const intent = expectOk(
      createOrderIntentFromLadderClick({
        id: "intent-1",
        marketRef,
        column: "bid",
        price: "0.50",
        stakeAmount: { amount: "5", currency: "USDC" },
        bestBid: "0.50",
        bestAsk: "0.60",
        oneClickArmed: false,
        createdAt: "2026-06-03T10:00:00.000Z",
      }),
    );

    expect(intent.side).toBe("BUY");
    expect(intent.submissionRoute).toBe("preview");
    expect(intent.quantity).toBe("10");
    expect(intent.estimatedCost).toEqual({ amount: "5", currency: "USDC" });
    expect(intent.marketable).toBe(false);
  });

  it("checks price alignment against venue tick size without native floats", () => {
    expect(isPriceAlignedToTickSize("0.50", "0.01")).toBe(true);
    expect(isPriceAlignedToTickSize("0.505", "0.01")).toBe(false);
    expect(isPriceAlignedToTickSize("0.3", "0.05")).toBe(true);
    expect(isPriceAlignedToTickSize("0.31", "0.05")).toBe(false);
  });

  it.each([
    { name: "zero price", price: "0", stake: "5", reason: "invalid_price" },
    { name: "negative price", price: "-0.01", stake: "5", reason: "invalid_price" },
    { name: "zero stake", price: "0.50", stake: "0", reason: "invalid_stake" },
    { name: "negative stake", price: "0.50", stake: "-1", reason: "invalid_stake" },
  ] satisfies Array<{
    name: string;
    price: string;
    stake: string;
    reason: "invalid_price" | "invalid_stake";
  }>)("rejects $name without throwing", ({ price, stake, reason }) => {
    expectIntentRejected(
      {
        id: "intent-invalid",
        marketRef,
        column: "bid",
        price,
        stakeAmount: { amount: stake, currency: "USDC" },
        bestBid: "0.50",
        bestAsk: "0.60",
        oneClickArmed: false,
        createdAt: "2026-06-03T10:00:00.000Z",
      },
      reason,
    );
  });
});

describe("order safety policy", () => {
  it("accepts a BUY order in paper mode when risk limits pass", () => {
    const result = validateOrderSafety(
      baseSafetyInput({
        executionMode: "paper",
        submissionRoute: "confirm",
        legalGateStatus: "not_approved",
        geoGateStatus: "unknown",
        credentialStatus: "missing",
        localApprovalStatus: "missing",
        firstLiveAck: false,
      }),
    );

    expect(result.status).toBe("approved");
  });

  it("accepts a live-dry-run BUY order when non-submission gates pass", () => {
    const result = validateOrderSafety(
      baseSafetyInput({
        executionMode: "live_dry_run",
        submissionRoute: "confirm",
      }),
    );

    expect(result).toEqual({
      status: "approved",
      projectedMarketExposure: "10",
      newOrderExposure: "5",
    });
  });

  it("accepts a live BUY order when all gates pass, including audit logging", () => {
    const result = validateOrderSafety(baseSafetyInput());

    expect(result).toEqual({
      status: "approved",
      projectedMarketExposure: "10",
      newOrderExposure: "5",
    });
  });

  it("allows cancellation when the kill switch is active", () => {
    const result = validateOrderSafety(
      baseSafetyInput({
        actionClass: "risk_reducing",
        killSwitchActive: true,
        orderIntent: undefined,
      }),
    );

    expect(result.status).toBe("approved");
  });

  it.each([
    {
      name: "execution disabled",
      input: baseSafetyInput({ executionMode: "disabled" }),
      reason: "execution_disabled",
    },
    {
      name: "market not selected",
      input: baseSafetyInput({ selectedMarket: null }),
      reason: "market_not_selected",
    },
    {
      name: "order book not fresh",
      input: baseSafetyInput({ orderBookFreshness: "stale" }),
      reason: "order_book_not_fresh",
    },
    {
      name: "price not aligned to tick size",
      input: baseSafetyInput({
        orderIntent: baseBuyIntent({ price: "0.505" }),
      }),
      reason: "price_not_aligned_to_tick",
    },
    {
      name: "stake not configured",
      input: baseSafetyInput({ stakeConfigured: false }),
      reason: "stake_not_configured",
    },
    {
      name: "one-click not armed",
      input: baseSafetyInput({ oneClickArmed: false }),
      reason: "one_click_not_armed",
    },
    {
      name: "first live acknowledgement missing",
      input: baseSafetyInput({ firstLiveAck: false }),
      reason: "first_live_ack_missing",
    },
    {
      name: "kill switch blocks risk-increasing orders",
      input: baseSafetyInput({ killSwitchActive: true }),
      reason: "kill_switch_active_for_risk_increasing_action",
    },
    {
      name: "stake exceeds limit",
      input: baseSafetyInput({ maxStakePerOrder: "4.99" }),
      reason: "stake_exceeds_limit",
    },
    {
      name: "exposure exceeds limit",
      input: baseSafetyInput({ maxMarketExposure: "9.99" }),
      reason: "exposure_exceeds_limit",
    },
    {
      name: "legal gate missing",
      input: baseSafetyInput({ legalGateStatus: "not_approved" }),
      reason: "legal_gate_not_approved",
    },
    {
      name: "local approval missing",
      input: baseSafetyInput({ localApprovalStatus: "missing" }),
      reason: "local_approval_missing",
    },
    {
      name: "geo blocked",
      input: baseSafetyInput({ geoGateStatus: "blocked" }),
      reason: "geo_blocked",
    },
    {
      name: "geo unknown",
      input: baseSafetyInput({ geoGateStatus: "unknown" }),
      reason: "geo_unknown",
    },
    {
      name: "credentials missing",
      input: baseSafetyInput({ credentialStatus: "missing" }),
      reason: "credentials_missing",
    },
    {
      name: "marketable order not approved",
      input: baseSafetyInput({
        orderIntent: baseBuyIntent({ marketable: true }),
        marketableOrderApproved: false,
      }),
      reason: "marketable_order_not_approved",
    },
    {
      name: "live sell position unknown",
      input: baseSafetyInput({
        orderIntent: baseBuyIntent({ side: "SELL" }),
        positionStatus: "unknown",
      }),
      reason: "position_unknown",
    },
    {
      name: "C0 risk detected",
      input: baseSafetyInput({ riskClasses: ["C0"] }),
      reason: "c0_risk_detected",
    },
    {
      name: "C1 approval missing",
      input: baseSafetyInput({
        riskClasses: ["C1"],
        c1ApprovalStatus: "missing",
      }),
      reason: "c1_approval_missing",
    },
    {
      name: "available funds unknown",
      input: baseSafetyInput({ availableFunds: "unknown" }),
      reason: "available_funds_unknown",
    },
    {
      name: "insufficient available funds",
      input: baseSafetyInput({ availableFunds: "4.99" }),
      reason: "insufficient_available_funds",
    },
    {
      name: "provider exposure unknown",
      input: baseSafetyInput({
        providerExposure: { polymarket: "unknown", kalshi: "0" },
      }),
      reason: "provider_exposure_unknown",
    },
    {
      name: "market exposure unknown",
      input: baseSafetyInput({
        marketExposure: { "pm-election-2026": "unknown" },
      }),
      reason: "market_exposure_unknown",
    },
    {
      name: "fee disclosure missing",
      input: baseSafetyInput({
        paidRoutingEnabled: true,
        feeDisclosureAccepted: false,
      }),
      reason: "fee_disclosure_missing",
    },
    {
      name: "live audit log missing",
      input: baseSafetyInput({ auditLogEnabled: false }),
      reason: "audit_log_not_enabled",
    },
    {
      name: "live-dry-run audit log missing",
      input: baseSafetyInput({
        executionMode: "live_dry_run",
        auditLogEnabled: false,
      }),
      reason: "audit_log_not_enabled",
    },
    {
      name: "negative current exposure",
      input: baseSafetyInput({ currentMarketExposure: "-0.01" }),
      reason: "invalid_exposure",
    },
    {
      name: "negative open-order exposure",
      input: baseSafetyInput({ openOrderExposure: "-0.01" }),
      reason: "invalid_exposure",
    },
    {
      name: "negative max stake limit",
      input: baseSafetyInput({ maxStakePerOrder: "-1" }),
      reason: "invalid_risk_limit",
    },
    {
      name: "negative max market exposure limit",
      input: baseSafetyInput({ maxMarketExposure: "-1" }),
      reason: "invalid_risk_limit",
    },
    {
      name: "negative available funds",
      input: baseSafetyInput({ availableFunds: "-0.01" }),
      reason: "invalid_available_funds",
    },
  ] satisfies Array<{
    name: string;
    input: OrderSafetyPolicyInput;
    reason: OrderRejectionReason;
  }>)("rejects when $name", ({ input, reason }) => {
    expectRejected(input, reason);
  });
});
