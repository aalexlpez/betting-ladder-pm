import {
  compareDecimalStrings,
  createOrderIntentFromLadderClick,
  decimalAdd,
  decimalMultiply,
  type AuditEvent,
  type DecimalString,
  type ExecutionMode,
  type NormalizedOrder,
  type OrderIntent,
  type OrderRejectionReason,
  type OrderSafetyDecision,
  type OrderSafetyPolicyInput,
  type C1ApprovalStatus,
  type ProviderId,
  type RiskClass,
  type PositionStatus,
  type SubmissionRoute,
} from "@prediction-ladder/core";
import type { RendererOrderBookSnapshot } from "@prediction-ladder/market-data";
import {
  processOrderIntent,
  type AuditEventFactory,
  type AuditLog,
} from "@prediction-ladder/execution";

import type { MarketDataWorkflowState } from "./marketDataWorkflow";

export type DesktopOrderExecutionMode = ExecutionMode | "live_blocked";
export type LadderIntentColumn = "ask" | "bid";

export type OrderEntryState = {
  executionMode: DesktopOrderExecutionMode;
  selectedStakeAmount: DecimalString;
  selectedStakeConfigured: boolean;
  maxStakePerOrder: DecimalString;
  maxMarketExposure: DecimalString;
  oneClickArmed: false;
  killSwitchActive: boolean;
  auditLogEnabled: boolean;
  legalGateStatus: "approved" | "not_approved" | "missing";
  geoGateStatus: "approved" | "blocked" | "unknown";
  credentialStatus: "ready" | "missing";
  localApprovalStatus: "approved" | "not_approved" | "missing";
  firstLiveAck: boolean;
  accountMetricsSourceStatus: "ready" | "missing";
  availableFunds: DecimalString | "unknown";
  providerExposure: Record<ProviderId, DecimalString | "unknown">;
  marketExposure: Record<string, DecimalString | "unknown">;
  riskClasses: readonly RiskClass[];
  c1ApprovalStatus: C1ApprovalStatus;
  positionStatus: PositionStatus;
  liveProviderAdapterConfigured: boolean;
  latestIntent: OrderIntent | null;
  validation: OrderSafetyDecision | null;
  validationReasons: readonly OrderRejectionReason[];
  openOrders: readonly NormalizedOrder[];
  auditEvents: readonly AuditEvent[];
  lastAction:
    | "idle"
    | "intent_created"
    | "validation_passed"
    | "validation_failed"
    | "paper_order_created"
    | "dry_run_checked"
    | "live_blocked";
  intentSequence: number;
};

export function createInitialOrderEntryState(): OrderEntryState {
  return {
    executionMode: "disabled",
    selectedStakeAmount: "5",
    selectedStakeConfigured: true,
    maxStakePerOrder: "5",
    maxMarketExposure: "25",
    oneClickArmed: false,
    killSwitchActive: false,
    auditLogEnabled: true,
    legalGateStatus: "not_approved",
    geoGateStatus: "unknown",
    credentialStatus: "missing",
    localApprovalStatus: "missing",
    firstLiveAck: false,
    accountMetricsSourceStatus: "missing",
    availableFunds: "unknown",
    providerExposure: createUnknownProviderExposure(),
    marketExposure: {},
    riskClasses: [],
    c1ApprovalStatus: "missing",
    positionStatus: "unknown",
    liveProviderAdapterConfigured: false,
    latestIntent: null,
    validation: null,
    validationReasons: [],
    openOrders: [],
    auditEvents: [],
    lastAction: "idle",
    intentSequence: 0,
  };
}

export function selectOrderEntryExecutionMode(
  state: OrderEntryState,
  executionMode: DesktopOrderExecutionMode,
): OrderEntryState {
  return {
    ...state,
    executionMode,
    latestIntent: null,
    validation: null,
    validationReasons: [],
    lastAction: "idle",
  };
}

export function selectOrderEntryStakePreset(
  state: OrderEntryState,
  selectedStakeAmount: DecimalString,
): OrderEntryState {
  return selectOrderEntryStakeAmount(state, selectedStakeAmount);
}

export function selectOrderEntryStakeAmount(
  state: OrderEntryState,
  selectedStakeAmount: DecimalString,
): OrderEntryState {
  const nextStakeAmount = selectedStakeAmount.trim();

  return {
    ...state,
    selectedStakeAmount: nextStakeAmount,
    selectedStakeConfigured: nextStakeAmount !== "",
    latestIntent: null,
    validation: null,
    validationReasons: [],
    lastAction: "idle",
  };
}

export async function previewOrderFromLadderCell(input: {
  orderEntry: OrderEntryState;
  workflow: MarketDataWorkflowState;
  column: LadderIntentColumn;
  price: DecimalString;
  auditLog: AuditLog;
  eventFactory?: AuditEventFactory;
  now?: string;
}): Promise<OrderEntryState> {
  const orderBook = getExecutableOrderBook(input.workflow);

  if (orderBook === null) {
    const reason = getMissingOrderBookReason(input.workflow);

    return {
      ...input.orderEntry,
      latestIntent: null,
      validation: createRejectedDecision([reason]),
      lastAction: "validation_failed",
      validationReasons: [reason],
      auditEvents: await input.auditLog.listRecent(),
    };
  }

  const nextSequence = input.orderEntry.intentSequence + 1;

  if (!input.orderEntry.selectedStakeConfigured) {
    return {
      ...input.orderEntry,
      intentSequence: nextSequence,
      latestIntent: null,
      validation: createRejectedDecision(["stake_not_configured"]),
      lastAction: "validation_failed",
      validationReasons: ["stake_not_configured"],
      auditEvents: await input.auditLog.listRecent(),
    };
  }

  const intentResult = createOrderIntentFromLadderClick({
    id: `intent-${nextSequence}`,
    marketRef: orderBook.marketRef,
    column: input.column,
    price: input.price,
    stakeAmount: {
      amount: input.orderEntry.selectedStakeAmount,
      currency: orderBook.marketRef.currency,
    },
    ...bestPrices(orderBook),
    oneClickArmed: input.orderEntry.oneClickArmed,
    createdAt: input.now ?? new Date().toISOString(),
  });

  if (!intentResult.ok) {
    const reason = mapIntentRejectionToOrderRejection(intentResult.error.reason);

    return {
      ...input.orderEntry,
      intentSequence: nextSequence,
      latestIntent: null,
      validation: createRejectedDecision([reason]),
      lastAction: "validation_failed",
      validationReasons: [reason],
      auditEvents: await input.auditLog.listRecent(),
    };
  }

  const intent: OrderIntent = {
    ...intentResult.value,
    submissionRoute: "preview",
  };
  const safetyInput = createOrderSafetyInput({
    intent,
    orderBook,
    orderEntry: input.orderEntry,
    submissionRoute: "preview",
  });
  const processInput = {
    intent,
    safetyInput,
    action: "preview",
    auditLog: input.auditLog,
    ...(input.eventFactory === undefined ? {} : { eventFactory: input.eventFactory }),
  } as const;
  const result = await processOrderIntent(processInput);
  const validation = result.ok
    ? result.value.safetyDecision
    : result.error.safetyDecision;

  return {
    ...input.orderEntry,
    intentSequence: nextSequence,
    latestIntent: intent,
    validation,
    validationReasons: validation.status === "rejected" ? validation.reasons : [],
    auditEvents: await input.auditLog.listRecent(),
    lastAction: result.ok ? "validation_passed" : "validation_failed",
  };
}

export async function submitOrderEntryPreview(input: {
  orderEntry: OrderEntryState;
  workflow: MarketDataWorkflowState;
  auditLog: AuditLog;
  eventFactory?: AuditEventFactory;
}): Promise<OrderEntryState> {
  const orderBook = getExecutableOrderBook(input.workflow);
  const latestIntent = input.orderEntry.latestIntent;

  if (orderBook === null || latestIntent === null) {
    const reason =
      latestIntent === null ? "order_intent_missing" : getMissingOrderBookReason(input.workflow);

    return {
      ...input.orderEntry,
      latestIntent: null,
      validation: createRejectedDecision([reason]),
      lastAction: "validation_failed",
      validationReasons: [reason],
      auditEvents: await input.auditLog.listRecent(),
    };
  }

  const intent: OrderIntent = {
    ...latestIntent,
    submissionRoute: "confirm",
  };
  const safetyInput = createOrderSafetyInput({
    intent,
    orderBook,
    orderEntry: input.orderEntry,
    submissionRoute: "confirm",
  });
  const processInput = {
    intent,
    safetyInput,
    action: "submit",
    auditLog: input.auditLog,
    ...(input.eventFactory === undefined ? {} : { eventFactory: input.eventFactory }),
  } as const;
  const result = await processOrderIntent(processInput);
  const validation = result.ok
    ? result.value.safetyDecision
    : result.error.safetyDecision;
  const order = result.ok ? result.value.order : undefined;
  const dryRun = result.ok ? result.value.dryRun : undefined;

  return {
    ...input.orderEntry,
    latestIntent: intent,
    validation,
    validationReasons: validation.status === "rejected" ? validation.reasons : [],
    openOrders: order === undefined ? input.orderEntry.openOrders : [order, ...input.orderEntry.openOrders],
    auditEvents: await input.auditLog.listRecent(),
    lastAction:
      order !== undefined
        ? "paper_order_created"
        : dryRun !== undefined
          ? "dry_run_checked"
          : result.ok
            ? "validation_passed"
            : input.orderEntry.executionMode === "live_blocked"
              ? "live_blocked"
              : "validation_failed",
  };
}

function createRejectedDecision(
  reasons: readonly OrderRejectionReason[],
): OrderSafetyDecision {
  return {
    status: "rejected",
    reasons: [...reasons],
  };
}

function getMissingOrderBookReason(
  workflow: MarketDataWorkflowState,
): OrderRejectionReason {
  return workflow.selected === null || workflow.selected === undefined
    ? "market_not_selected"
    : "order_book_not_fresh";
}

function createOrderSafetyInput(input: {
  intent: OrderIntent;
  orderBook: RendererOrderBookSnapshot;
  orderEntry: OrderEntryState;
  submissionRoute: SubmissionRoute;
}): OrderSafetyPolicyInput {
  return {
    executionMode: toCoreExecutionMode(input.orderEntry.executionMode),
    actionClass: "risk_increasing",
    submissionRoute: input.submissionRoute,
    orderIntent: input.intent,
    selectedMarket: input.orderBook.marketRef,
    orderBookFreshness: input.orderBook.freshness,
    stakeConfigured: input.orderEntry.selectedStakeConfigured,
    legalGateStatus: input.orderEntry.legalGateStatus,
    geoGateStatus: input.orderEntry.geoGateStatus,
    credentialStatus: input.orderEntry.credentialStatus,
    localApprovalStatus: input.orderEntry.localApprovalStatus,
    oneClickArmed: input.orderEntry.oneClickArmed,
    firstLiveAck: input.orderEntry.firstLiveAck,
    killSwitchActive: input.orderEntry.killSwitchActive,
    maxStakePerOrder: input.orderEntry.maxStakePerOrder,
    maxMarketExposure: input.orderEntry.maxMarketExposure,
    currentMarketExposure: "0",
    openOrderExposure: calculateOpenOrderExposure(input.orderEntry.openOrders),
    availableFunds: input.orderEntry.availableFunds,
    providerExposure: input.orderEntry.providerExposure,
    marketExposure: {
      [input.intent.marketRef.marketId]:
        input.orderEntry.marketExposure[input.intent.marketRef.marketId] ??
        "unknown",
    },
    riskClasses: [...input.orderEntry.riskClasses],
    c1ApprovalStatus: input.orderEntry.c1ApprovalStatus,
    marketableOrderApproved: false,
    paidRoutingEnabled: false,
    feeDisclosureAccepted: false,
    auditLogEnabled: input.orderEntry.auditLogEnabled,
    positionStatus: input.orderEntry.positionStatus,
  };
}

function getExecutableOrderBook(
  workflow: MarketDataWorkflowState,
): RendererOrderBookSnapshot | null {
  if (
    workflow.orderBook?.sourceKind !== "official_live" ||
    workflow.orderBook.orderBook === undefined
  ) {
    return null;
  }

  return workflow.orderBook.orderBook;
}

function bestPrices(orderBook: RendererOrderBookSnapshot): {
  bestAsk?: DecimalString;
  bestBid?: DecimalString;
} {
  const bestBid = orderBook.bids
    .map((level) => level.price)
    .sort((left, right) => compareDecimalStrings(right, left))[0];
  const bestAsk = orderBook.asks
    .map((level) => level.price)
    .sort(compareDecimalStrings)[0];

  return {
    ...(bestAsk === undefined ? {} : { bestAsk }),
    ...(bestBid === undefined ? {} : { bestBid }),
  };
}

function toCoreExecutionMode(mode: DesktopOrderExecutionMode): ExecutionMode {
  return mode === "live_blocked" ? "live" : mode;
}

function createUnknownProviderExposure(): Record<ProviderId, "unknown"> {
  return {
    kalshi: "unknown",
    polymarket: "unknown",
  };
}

function calculateOpenOrderExposure(
  openOrders: readonly NormalizedOrder[],
): DecimalString {
  return openOrders.reduce(
    (total, order) =>
      order.side === "BUY"
        ? decimalAdd(total, decimalMultiply(order.price, order.remainingQuantity))
        : total,
    "0" as DecimalString,
  );
}

function mapIntentRejectionToOrderRejection(
  reason:
    | "currency_mismatch"
    | "invalid_price"
    | "invalid_stake"
    | "price_column_has_no_order_intent",
): OrderRejectionReason {
  switch (reason) {
    case "invalid_price":
      return "invalid_price";
    case "invalid_stake":
      return "invalid_stake";
    case "currency_mismatch":
      return "invalid_stake";
    case "price_column_has_no_order_intent":
      return "order_intent_missing";
  }
}
