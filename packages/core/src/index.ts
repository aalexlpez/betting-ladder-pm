import Decimal from "decimal.js";

export type BootstrapPackageStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "domain_core_complete";
};

export function createCoreBootstrapStatus(): BootstrapPackageStatus {
  return {
    packageName: "@prediction-ladder/core",
    boundary: "pure deterministic domain logic",
    boundaryReady: true,
    implementationStatus: "domain_core_complete",
  };
}

export type Result<TValue, TError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError };

export const PROVIDER_IDS = ["polymarket", "kalshi"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type ExecutionMode = "disabled" | "paper" | "live_dry_run" | "live";
export type RiskClass = "C0" | "C1" | "C2" | "C3";
export type RiskActionClass = "risk_increasing" | "risk_reducing" | "read_only";
export type DecimalString = string;
export type CurrencyCode = "USD" | "USDC" | string;

export type DecimalValidationError = {
  reason: "invalid_decimal_string";
  value: string;
};

export type EconomicDecimalValidationError = {
  reason: "invalid_decimal_string" | "not_positive" | "negative_decimal";
  value: string;
};

const decimalPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const divisionDecimalPlaces = 18;

export function validateDecimalString(
  value: string,
): Result<DecimalString, DecimalValidationError> {
  if (!decimalPattern.test(value)) {
    return { ok: false, error: { reason: "invalid_decimal_string", value } };
  }

  return { ok: true, value };
}

export function validatePositiveDecimalString(
  value: string,
): Result<DecimalString, EconomicDecimalValidationError> {
  const decimal = parseDecimal(value);

  if (!decimal.ok) {
    return { ok: false, error: decimal.error };
  }

  if (!decimal.value.gt(0)) {
    return { ok: false, error: { reason: "not_positive", value } };
  }

  return { ok: true, value };
}

export function validateNonNegativeDecimalString(
  value: string,
): Result<DecimalString, EconomicDecimalValidationError> {
  const decimal = parseDecimal(value);

  if (!decimal.ok) {
    return { ok: false, error: decimal.error };
  }

  if (!decimal.value.gte(0)) {
    return { ok: false, error: { reason: "negative_decimal", value } };
  }

  return { ok: true, value };
}

export function normalizeDecimalString(value: DecimalString): DecimalString {
  return parseValidDecimalString(value).toString();
}

export function decimalAdd(
  left: DecimalString,
  right: DecimalString,
): DecimalString {
  return parseValidDecimalString(left).plus(parseValidDecimalString(right)).toString();
}

export function decimalSubtract(
  left: DecimalString,
  right: DecimalString,
): DecimalString {
  return parseValidDecimalString(left).minus(parseValidDecimalString(right)).toString();
}

export function decimalMultiply(
  left: DecimalString,
  right: DecimalString,
): DecimalString {
  return parseValidDecimalString(left).times(parseValidDecimalString(right)).toString();
}

export function decimalDivide(
  left: DecimalString,
  right: DecimalString,
  decimalPlaces = divisionDecimalPlaces,
): DecimalString {
  const divisor = parseValidDecimalString(right);

  if (divisor.isZero()) {
    throw new Error("Cannot divide by zero DecimalString");
  }

  return parseValidDecimalString(left)
    .dividedBy(divisor)
    .toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN)
    .toString();
}

export function compareDecimalStrings(
  left: DecimalString,
  right: DecimalString,
): -1 | 0 | 1 {
  const comparison = parseValidDecimalString(left).cmp(parseValidDecimalString(right));

  if (comparison < 0) {
    return -1;
  }

  if (comparison > 0) {
    return 1;
  }

  return 0;
}

function parseDecimal(
  value: DecimalString,
): Result<Decimal, EconomicDecimalValidationError> {
  const validation = validateDecimalString(value);

  if (!validation.ok) {
    return {
      ok: false,
      error: { reason: validation.error.reason, value: validation.error.value },
    };
  }

  return { ok: true, value: new Decimal(value) };
}

function parseValidDecimalString(value: DecimalString): Decimal {
  const decimal = parseDecimal(value);

  if (!decimal.ok) {
    throw new Error(`Invalid DecimalString: ${value}`);
  }

  return decimal.value;
}

export type MarketRef = {
  providerId: ProviderId;
  marketId: string;
  outcomeId?: string;
  currency: CurrencyCode;
};

export type PriceLevel = {
  price: DecimalString;
  size: DecimalString;
};

export type OrderBookSnapshot = {
  marketRef: MarketRef;
  capturedAt: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
};

export type LadderRow = {
  price: DecimalString;
  bidSize?: DecimalString;
  askSize?: DecimalString;
  isBestBid: boolean;
  isBestAsk: boolean;
};

export function buildLadderRows(snapshot: OrderBookSnapshot): LadderRow[] {
  const bidByPrice = new Map<DecimalString, DecimalString>();
  const askByPrice = new Map<DecimalString, DecimalString>();

  for (const level of snapshot.bids) {
    bidByPrice.set(normalizeDecimalString(level.price), normalizeDecimalString(level.size));
  }

  for (const level of snapshot.asks) {
    askByPrice.set(normalizeDecimalString(level.price), normalizeDecimalString(level.size));
  }

  const prices = [...new Set([...bidByPrice.keys(), ...askByPrice.keys()])].sort(
    (left, right) => compareDecimalStrings(right, left),
  );
  const bestBid = highestPrice([...bidByPrice.keys()]);
  const bestAsk = lowestPrice([...askByPrice.keys()]);

  return prices.map((price) => {
    const bidSize = bidByPrice.get(price);
    const askSize = askByPrice.get(price);
    const row: LadderRow = {
      price,
      isBestBid: bestBid === price,
      isBestAsk: bestAsk === price,
    };

    if (bidSize !== undefined) {
      row.bidSize = bidSize;
    }

    if (askSize !== undefined) {
      row.askSize = askSize;
    }

    return row;
  });
}

function highestPrice(prices: DecimalString[]): DecimalString | undefined {
  return [...prices].sort((left, right) => compareDecimalStrings(right, left))[0];
}

function lowestPrice(prices: DecimalString[]): DecimalString | undefined {
  return [...prices].sort(compareDecimalStrings)[0];
}

export type MoneyAmount = {
  amount: DecimalString;
  currency: CurrencyCode;
};

export type MetricValue =
  | MoneyAmount
  | {
      status: "unknown" | "not_applicable";
      reason: string;
    };

export type FinancialMetrics = {
  realizedPnl: MetricValue;
  unrealizedPnl: MetricValue;
  totalPnl: MetricValue;
  availableFunds: MetricValue;
  openOrderAmount: MetricValue;
  exposure: MetricValue;
};

export type FinancialMetricsEntry = {
  providerId: ProviderId;
  marketId: string;
  outcomeId?: string;
  metrics: FinancialMetrics;
};

export type FinancialMetricsSnapshot = {
  timestamp: string;
  global: FinancialMetrics[];
  byProvider: Array<{ providerId: ProviderId; metrics: FinancialMetrics[] }>;
  byMarket: Array<{
    providerId: ProviderId;
    marketId: string;
    outcomeId?: string;
    metrics: FinancialMetrics[];
  }>;
};

type MetricField = keyof FinancialMetrics;

const metricFields = [
  "realizedPnl",
  "unrealizedPnl",
  "totalPnl",
  "availableFunds",
  "openOrderAmount",
  "exposure",
] as const satisfies readonly MetricField[];

export function aggregateFinancialMetrics(input: {
  timestamp: string;
  entries: FinancialMetricsEntry[];
}): FinancialMetricsSnapshot {
  const providerGroups = new Map<ProviderId, FinancialMetricsEntry[]>();
  const marketGroups = new Map<string, FinancialMetricsEntry[]>();

  for (const entry of input.entries) {
    providerGroups.set(entry.providerId, [
      ...(providerGroups.get(entry.providerId) ?? []),
      entry,
    ]);

    const marketKey = `${entry.providerId}:${entry.marketId}:${entry.outcomeId ?? ""}`;
    marketGroups.set(marketKey, [...(marketGroups.get(marketKey) ?? []), entry]);
  }

  return {
    timestamp: input.timestamp,
    global: aggregateMetricsGroup(input.entries),
    byProvider: [...providerGroups.entries()].map(([providerId, entries]) => ({
      providerId,
      metrics: aggregateMetricsGroup(entries),
    })),
    byMarket: [...marketGroups.values()].map((entries) => {
      const firstEntry = entries[0];

      if (firstEntry === undefined) {
        throw new Error("Financial metric market group cannot be empty");
      }

      return {
        providerId: firstEntry.providerId,
        marketId: firstEntry.marketId,
        ...(firstEntry.outcomeId !== undefined
          ? { outcomeId: firstEntry.outcomeId }
          : {}),
        metrics: aggregateMetricsGroup(entries),
      };
    }),
  };
}

function aggregateMetricsGroup(entries: FinancialMetricsEntry[]): FinancialMetrics[] {
  const currencies = new Set<CurrencyCode>();
  const unknownReasons = createMetricReasonMap();

  for (const entry of entries) {
    for (const field of metricFields) {
      const value = entry.metrics[field];

      if (isMoneyAmount(value)) {
        currencies.add(value.currency);
      } else {
        unknownReasons[field].push(value.reason);
      }
    }
  }

  if (currencies.size === 0) {
    return [buildUnknownOnlyMetrics(unknownReasons)];
  }

  return [...currencies].map((currency) =>
    Object.fromEntries(
      metricFields.map((field) => [
        field,
        aggregateMetricField(entries, field, currency, unknownReasons[field]),
      ]),
    ) as FinancialMetrics,
  );
}

function aggregateMetricField(
  entries: FinancialMetricsEntry[],
  field: MetricField,
  currency: CurrencyCode,
  reasons: string[],
): MetricValue {
  const amounts = entries
    .map((entry) => entry.metrics[field])
    .filter(
      (value): value is MoneyAmount =>
        isMoneyAmount(value) && value.currency === currency,
    )
    .map((value) => value.amount);

  if (amounts.length > 0) {
    return {
      amount: amounts.reduce(
        (total, amount) => decimalAdd(total, amount),
        "0" as DecimalString,
      ),
      currency,
    };
  }

  if (reasons.length > 0) {
    return { status: "unknown", reason: joinUniqueReasons(reasons) };
  }

  return {
    status: "not_applicable",
    reason: `No ${field} value for ${currency}`,
  };
}

function buildUnknownOnlyMetrics(
  unknownReasons: Record<MetricField, string[]>,
): FinancialMetrics {
  return Object.fromEntries(
    metricFields.map((field) => [
      field,
      unknownReasons[field].length > 0
        ? { status: "unknown", reason: joinUniqueReasons(unknownReasons[field]) }
        : { status: "not_applicable", reason: `No ${field} values available` },
    ]),
  ) as FinancialMetrics;
}

function createMetricReasonMap(): Record<MetricField, string[]> {
  return {
    realizedPnl: [],
    unrealizedPnl: [],
    totalPnl: [],
    availableFunds: [],
    openOrderAmount: [],
    exposure: [],
  };
}

function joinUniqueReasons(reasons: string[]): string {
  return [...new Set(reasons)].join("; ");
}

function isMoneyAmount(value: MetricValue): value is MoneyAmount {
  return "amount" in value;
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "limit";
export type TimeInForce = "GTC";
export type SubmissionRoute = "preview" | "confirm" | "one_click";

export type OrderIntent = {
  id: string;
  providerId: ProviderId;
  marketRef: MarketRef;
  side: OrderSide;
  type: OrderType;
  timeInForce: TimeInForce;
  price: DecimalString;
  stakeAmount: MoneyAmount;
  quantity: DecimalString;
  estimatedCost?: MoneyAmount;
  estimatedProceeds?: MoneyAmount;
  marketable: boolean;
  submissionRoute?: SubmissionRoute;
  createdAt: string;
};

export type OrderIntentRejectionReason =
  | "invalid_price"
  | "invalid_stake"
  | "currency_mismatch"
  | "price_column_has_no_order_intent";

export type LadderClickColumn = "bid" | "ask" | "price";

export function createOrderIntentFromLadderClick(input: {
  id: string;
  marketRef: MarketRef;
  column: LadderClickColumn;
  price: DecimalString;
  stakeAmount: MoneyAmount;
  bestBid?: DecimalString;
  bestAsk?: DecimalString;
  oneClickArmed: boolean;
  createdAt: string;
}): Result<OrderIntent, { reason: OrderIntentRejectionReason }> {
  if (input.column === "price") {
    return { ok: false, error: { reason: "price_column_has_no_order_intent" } };
  }

  if (!validatePositiveDecimalString(input.price).ok) {
    return { ok: false, error: { reason: "invalid_price" } };
  }

  if (!validatePositiveDecimalString(input.stakeAmount.amount).ok) {
    return { ok: false, error: { reason: "invalid_stake" } };
  }

  if (input.stakeAmount.currency !== input.marketRef.currency) {
    return { ok: false, error: { reason: "currency_mismatch" } };
  }

  const side: OrderSide = input.column === "bid" ? "BUY" : "SELL";
  const price = normalizeDecimalString(input.price);
  const stakeAmount = {
    amount: normalizeDecimalString(input.stakeAmount.amount),
    currency: input.stakeAmount.currency,
  };
  const quantity = decimalDivide(stakeAmount.amount, price);
  const estimatedValue = {
    amount: normalizeDecimalString(decimalMultiply(price, quantity)),
    currency: stakeAmount.currency,
  };

  const marketableInput = {
    side,
    price,
    ...(input.bestBid !== undefined ? { bestBid: input.bestBid } : {}),
    ...(input.bestAsk !== undefined ? { bestAsk: input.bestAsk } : {}),
  };
  const intent: OrderIntent = {
    id: input.id,
    providerId: input.marketRef.providerId,
    marketRef: input.marketRef,
    side,
    type: "limit",
    timeInForce: "GTC",
    price,
    stakeAmount,
    quantity,
    ...(side === "BUY" ? { estimatedCost: estimatedValue } : {}),
    ...(side === "SELL" ? { estimatedProceeds: estimatedValue } : {}),
    marketable: isMarketableOrder(marketableInput),
    submissionRoute: input.oneClickArmed ? "one_click" : "preview",
    createdAt: input.createdAt,
  };

  return {
    ok: true,
    value: intent,
  };
}

function isMarketableOrder(input: {
  side: OrderSide;
  price: DecimalString;
  bestBid?: DecimalString;
  bestAsk?: DecimalString;
}): boolean {
  if (input.side === "BUY" && input.bestAsk !== undefined) {
    return compareDecimalStrings(input.price, input.bestAsk) >= 0;
  }

  if (input.side === "SELL" && input.bestBid !== undefined) {
    return compareDecimalStrings(input.price, input.bestBid) <= 0;
  }

  return false;
}

export function calculateNewOrderExposure(intent: OrderIntent): MoneyAmount {
  if (intent.side === "BUY") {
    return intent.stakeAmount;
  }

  return { amount: "0", currency: intent.stakeAmount.currency };
}

export function calculateProjectedMarketExposure(input: {
  currentMarketExposure: DecimalString;
  openOrderExposure: DecimalString;
  newOrderExposure: DecimalString;
}): DecimalString {
  return decimalAdd(
    decimalAdd(input.currentMarketExposure, input.openOrderExposure),
    input.newOrderExposure,
  );
}

export type GateApprovalStatus = "approved" | "not_approved" | "missing";
export type GeoGateStatus = "approved" | "blocked" | "unknown";
export type CredentialStatus = "ready" | "missing";
export type C1ApprovalStatus = "approved" | "missing";
export type PositionStatus = "available" | "unknown";

export type OrderRejectionReason =
  | "execution_disabled"
  | "kill_switch_active_for_risk_increasing_action"
  | "legal_gate_not_approved"
  | "c1_approval_missing"
  | "geo_blocked"
  | "geo_unknown"
  | "credentials_missing"
  | "local_approval_missing"
  | "one_click_not_armed"
  | "first_live_ack_missing"
  | "stake_exceeds_limit"
  | "exposure_exceeds_limit"
  | "available_funds_unknown"
  | "insufficient_available_funds"
  | "provider_exposure_unknown"
  | "market_exposure_unknown"
  | "marketable_order_not_approved"
  | "position_unknown"
  | "c0_risk_detected"
  | "fee_disclosure_missing"
  | "order_intent_missing"
  | "audit_log_not_enabled"
  | "invalid_price"
  | "invalid_stake"
  | "invalid_exposure"
  | "invalid_available_funds"
  | "invalid_risk_limit";

export type OrderSafetyPolicyInput = {
  executionMode: ExecutionMode;
  actionClass: RiskActionClass;
  submissionRoute: SubmissionRoute;
  orderIntent?: OrderIntent | undefined;
  legalGateStatus: GateApprovalStatus;
  geoGateStatus: GeoGateStatus;
  credentialStatus: CredentialStatus;
  localApprovalStatus: GateApprovalStatus;
  oneClickArmed: boolean;
  firstLiveAck: boolean;
  killSwitchActive: boolean;
  maxStakePerOrder: DecimalString;
  maxMarketExposure: DecimalString;
  currentMarketExposure: DecimalString;
  openOrderExposure: DecimalString;
  availableFunds: DecimalString | "unknown";
  providerExposure: Record<ProviderId, DecimalString | "unknown">;
  marketExposure: Record<string, DecimalString | "unknown">;
  riskClasses: RiskClass[];
  c1ApprovalStatus: C1ApprovalStatus;
  marketableOrderApproved: boolean;
  paidRoutingEnabled: boolean;
  feeDisclosureAccepted: boolean;
  auditLogEnabled: boolean;
  positionStatus: PositionStatus;
};

export type OrderSafetyDecision =
  | {
      status: "approved";
      projectedMarketExposure?: DecimalString;
      newOrderExposure?: DecimalString;
    }
  | {
      status: "rejected";
      reasons: OrderRejectionReason[];
      projectedMarketExposure?: DecimalString;
      newOrderExposure?: DecimalString;
    };

export function validateOrderSafety(
  input: OrderSafetyPolicyInput,
): OrderSafetyDecision {
  const reasons: OrderRejectionReason[] = [];
  const riskIncreasing = input.actionClass === "risk_increasing";
  const liveLike =
    input.executionMode === "live" || input.executionMode === "live_dry_run";
  const orderIntent = input.orderIntent;
  const tentativeNewOrderExposure =
    riskIncreasing && orderIntent !== undefined
      ? calculateNewOrderExposure(orderIntent).amount
      : "0";

  if (!riskIncreasing) {
    return { status: "approved" };
  }

  pushEconomicInputReasons(input, orderIntent, tentativeNewOrderExposure, reasons);

  const canProjectExposure =
    validateNonNegativeDecimalString(input.currentMarketExposure).ok &&
    validateNonNegativeDecimalString(input.openOrderExposure).ok &&
    validateNonNegativeDecimalString(tentativeNewOrderExposure).ok;
  const projectedMarketExposure = canProjectExposure
    ? calculateProjectedMarketExposure({
        currentMarketExposure: input.currentMarketExposure,
        openOrderExposure: input.openOrderExposure,
        newOrderExposure: tentativeNewOrderExposure,
      })
    : undefined;

  if (input.executionMode === "disabled") {
    reasons.push("execution_disabled");
  }

  if (input.killSwitchActive) {
    reasons.push("kill_switch_active_for_risk_increasing_action");
  }

  if (input.riskClasses.includes("C0")) {
    reasons.push("c0_risk_detected");
  }

  if (input.submissionRoute === "one_click" && !input.oneClickArmed) {
    reasons.push("one_click_not_armed");
  }

  if (orderIntent === undefined) {
    reasons.push("order_intent_missing");
  } else {
    pushOrderLimitReasons(input, orderIntent, projectedMarketExposure, reasons);
  }

  if (liveLike) {
    pushLiveGateReasons(input, orderIntent, reasons);
  }

  if (input.riskClasses.includes("C1") && input.c1ApprovalStatus !== "approved") {
    reasons.push("c1_approval_missing");
  }

  if (input.paidRoutingEnabled && !input.feeDisclosureAccepted) {
    reasons.push("fee_disclosure_missing");
  }

  if (reasons.length > 0) {
    return {
      status: "rejected",
      reasons: [...new Set(reasons)],
      ...(projectedMarketExposure !== undefined ? { projectedMarketExposure } : {}),
      newOrderExposure: tentativeNewOrderExposure,
    };
  }

  return {
    status: "approved",
    ...(projectedMarketExposure !== undefined ? { projectedMarketExposure } : {}),
    newOrderExposure: tentativeNewOrderExposure,
  };
}

function pushEconomicInputReasons(
  input: OrderSafetyPolicyInput,
  orderIntent: OrderIntent | undefined,
  newOrderExposure: DecimalString,
  reasons: OrderRejectionReason[],
): void {
  if (!validatePositiveDecimalString(input.maxStakePerOrder).ok) {
    reasons.push("invalid_risk_limit");
  }

  if (!validatePositiveDecimalString(input.maxMarketExposure).ok) {
    reasons.push("invalid_risk_limit");
  }

  if (!validateNonNegativeDecimalString(input.currentMarketExposure).ok) {
    reasons.push("invalid_exposure");
  }

  if (!validateNonNegativeDecimalString(input.openOrderExposure).ok) {
    reasons.push("invalid_exposure");
  }

  if (!validateNonNegativeDecimalString(newOrderExposure).ok) {
    reasons.push("invalid_exposure");
  }

  if (
    input.availableFunds !== "unknown" &&
    !validateNonNegativeDecimalString(input.availableFunds).ok
  ) {
    reasons.push("invalid_available_funds");
  }

  if (orderIntent === undefined) {
    return;
  }

  if (!validatePositiveDecimalString(orderIntent.price).ok) {
    reasons.push("invalid_price");
  }

  if (!validatePositiveDecimalString(orderIntent.stakeAmount.amount).ok) {
    reasons.push("invalid_stake");
  }

  const providerExposure = input.providerExposure[orderIntent.providerId];

  if (
    providerExposure !== undefined &&
    providerExposure !== "unknown" &&
    !validateNonNegativeDecimalString(providerExposure).ok
  ) {
    reasons.push("invalid_exposure");
  }

  const marketExposure = input.marketExposure[orderIntent.marketRef.marketId];

  if (
    marketExposure !== undefined &&
    marketExposure !== "unknown" &&
    !validateNonNegativeDecimalString(marketExposure).ok
  ) {
    reasons.push("invalid_exposure");
  }
}

function pushOrderLimitReasons(
  input: OrderSafetyPolicyInput,
  orderIntent: OrderIntent,
  projectedMarketExposure: DecimalString | undefined,
  reasons: OrderRejectionReason[],
): void {
  if (
    validatePositiveDecimalString(orderIntent.stakeAmount.amount).ok &&
    validatePositiveDecimalString(input.maxStakePerOrder).ok &&
    compareDecimalStrings(orderIntent.stakeAmount.amount, input.maxStakePerOrder) > 0
  ) {
    reasons.push("stake_exceeds_limit");
  }

  if (
    projectedMarketExposure !== undefined &&
    validatePositiveDecimalString(input.maxMarketExposure).ok &&
    compareDecimalStrings(projectedMarketExposure, input.maxMarketExposure) > 0
  ) {
    reasons.push("exposure_exceeds_limit");
  }

  if (orderIntent.marketable && !input.marketableOrderApproved) {
    reasons.push("marketable_order_not_approved");
  }

  if (orderIntent.side === "SELL" && input.positionStatus !== "available") {
    reasons.push("position_unknown");
  }
}

function pushLiveGateReasons(
  input: OrderSafetyPolicyInput,
  orderIntent: OrderIntent | undefined,
  reasons: OrderRejectionReason[],
): void {
  if (input.legalGateStatus !== "approved") {
    reasons.push("legal_gate_not_approved");
  }

  if (input.geoGateStatus === "blocked") {
    reasons.push("geo_blocked");
  }

  if (input.geoGateStatus === "unknown") {
    reasons.push("geo_unknown");
  }

  if (!input.auditLogEnabled) {
    reasons.push("audit_log_not_enabled");
  }

  if (input.credentialStatus === "missing") {
    reasons.push("credentials_missing");
  }

  if (input.executionMode === "live" && input.localApprovalStatus !== "approved") {
    reasons.push("local_approval_missing");
  }

  if (input.executionMode === "live" && !input.firstLiveAck) {
    reasons.push("first_live_ack_missing");
  }

  if (input.availableFunds === "unknown") {
    reasons.push("available_funds_unknown");
  } else if (
    orderIntent !== undefined &&
    validateNonNegativeDecimalString(input.availableFunds).ok &&
    validatePositiveDecimalString(orderIntent.stakeAmount.amount).ok &&
    compareDecimalStrings(input.availableFunds, orderIntent.stakeAmount.amount) < 0
  ) {
    reasons.push("insufficient_available_funds");
  }

  if (
    orderIntent !== undefined &&
    input.providerExposure[orderIntent.providerId] === "unknown"
  ) {
    reasons.push("provider_exposure_unknown");
  }

  if (
    orderIntent !== undefined &&
    input.marketExposure[orderIntent.marketRef.marketId] === "unknown"
  ) {
    reasons.push("market_exposure_unknown");
  }
}

export type AuditEventStatus = "ok" | "blocked" | "failed";

export type AuditEvent = {
  id: string;
  timestamp: string;
  type:
    | "app_started"
    | "execution_mode_changed"
    | "legal_gate_loaded"
    | "geo_gate_checked"
    | "credentials_status_checked"
    | "order_intent_created"
    | "risk_validation_result"
    | "live_acknowledgement_confirmed"
    | "order_submitted"
    | "order_rejected"
    | "order_cancelled"
    | "kill_switch_activated"
    | "error_occurred";
  executionMode: ExecutionMode;
  marketId?: string;
  tokenId?: string;
  orderId?: string;
  status: AuditEventStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
};
