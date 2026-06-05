import {
  isTradableMarketRef,
  validateOrderSafety,
  type OrderRejectionReason,
  type OrderSafetyPolicyInput,
  AuditEvent,
  ExecutionMode,
  FinancialMetricsSnapshot,
  NormalizedBalance,
  NormalizedFee,
  NormalizedFill,
  NormalizedOrder,
  NormalizedPosition,
  OrderIntent,
  OrderSafetyDecision,
  ProviderId,
  Result,
  TradableMarketRef,
} from "@prediction-ladder/core";

export type ExecutionBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "contracts_ready";
};

export function createExecutionBootstrapStatus(): ExecutionBootstrapStatus {
  return {
    packageName: "@prediction-ladder/execution",
    boundary: "paper, live-dry-run, and gated live execution ports",
    boundaryReady: true,
    implementationStatus: "contracts_ready",
  };
}

export type ExecutionAdapterErrorReason =
  | "execution_not_configured"
  | "blocked_by_legal_gate"
  | "blocked_by_geo_gate"
  | "blocked_by_credentials"
  | "blocked_by_local_approval"
  | "blocked_by_risk_policy"
  | "provider_rejected"
  | "network_error"
  | "cancel_unavailable"
  | "unknown_state"
  | "audit_log_unavailable"
  | "not_implemented";

export type ExecutionAdapterError = {
  reason: ExecutionAdapterErrorReason;
  message: string;
  providerMetadata?: Record<string, unknown>;
};

export type PlaceOrderRequest = {
  intent: OrderIntent;
  safetyDecision: OrderSafetyDecision;
  auditEvent?: AuditEvent;
};

export type LiveDryRunCheck = {
  providerId: ProviderId;
  intentId: string;
  checkedAt: string;
  wouldSubmitExternally: false;
  message: string;
};

export type PlaceOrderSuccess = {
  order?: NormalizedOrder;
  dryRun?: LiveDryRunCheck;
  fills: NormalizedFill[];
  auditEvents: AuditEvent[];
  providerMetadata?: Record<string, unknown>;
};

export type PlaceOrderResult = Result<PlaceOrderSuccess, ExecutionAdapterError>;

export type CancelOrderRequest = {
  orderId: string;
  marketRef?: TradableMarketRef;
  auditEvent?: AuditEvent;
};

export type CancelOrderSuccess = {
  orderId: string;
  state: "cancelled" | "cancel_requested" | "already_terminal";
  auditEvents: AuditEvent[];
  providerMetadata?: Record<string, unknown>;
};

export type CancelOrderResult = Result<CancelOrderSuccess, ExecutionAdapterError>;

export interface ExecutionAdapter {
  providerId: ProviderId;
  mode: ExecutionMode;
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult>;
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResult>;
}

export type CredentialSource =
  | "local_env_dev_only"
  | "os_secure_storage"
  | "explicit_local_provider";

export type CredentialProviderSafeStatus =
  | {
      providerId: ProviderId;
      status: "ready";
      source: CredentialSource;
      checkedAt?: string;
    }
  | {
      providerId: ProviderId;
      status: "missing";
      reason: string;
      checkedAt?: string;
    };

export interface CredentialProvider {
  getCredentialStatus(providerId: ProviderId): Promise<CredentialProviderSafeStatus>;
}

export function createStaticCredentialProvider(
  status: CredentialProviderSafeStatus,
): CredentialProvider {
  return {
    async getCredentialStatus(providerId) {
      if (status.providerId !== providerId) {
        return {
          providerId,
          status: "missing",
          reason: `Credential status was supplied for ${status.providerId}, not ${providerId}.`,
        };
      }

      return status;
    },
  };
}

export type LocalApprovalGateApproved = {
  providerId: ProviderId;
  status: "approved";
  targetJurisdiction: string;
  operatorIdentity: string;
  approver: string;
  c0Review: "PASS";
  c1RiskAcceptance: "APPROVED_OR_NOT_REQUIRED";
  maxStakeFirstOrder: string;
  maxMarketExposure: string;
  geoblockResult: "PASS";
  credentialSource: CredentialSource;
  auditLog: "enabled";
  approvedAt: string;
};

export type LocalApprovalGateBlocked = {
  providerId: ProviderId;
  status: "missing" | "not_approved" | "malformed" | "stale";
  reason: string;
};

export type LocalApprovalGateStatus =
  | LocalApprovalGateApproved
  | LocalApprovalGateBlocked;

export interface LocalApprovalGateProvider {
  loadLocalApproval(providerId: ProviderId): Promise<LocalApprovalGateStatus>;
}

export function createStaticLocalApprovalGateProvider(
  status: LocalApprovalGateStatus,
): LocalApprovalGateProvider {
  return {
    async loadLocalApproval(providerId) {
      if (status.providerId !== providerId) {
        return {
          providerId,
          status: "missing",
          reason: `Local approval was supplied for ${status.providerId}, not ${providerId}.`,
        };
      }

      return status;
    },
  };
}

export type LiveProviderPlaceOrderRequest = {
  intent: OrderIntent;
  safetyDecision: Extract<OrderSafetyDecision, { status: "approved" }>;
  credentialStatus: Extract<CredentialProviderSafeStatus, { status: "ready" }>;
  localApproval: LocalApprovalGateApproved;
};

export type LiveProviderPlaceOrderSuccess = {
  providerOrderId: string;
  order: NormalizedOrder;
  fills: NormalizedFill[];
  providerMetadata?: Record<string, unknown>;
};

export type LiveProviderExecutionError = {
  reason: "provider_rejected" | "network_error";
  message: string;
  providerMetadata?: Record<string, unknown>;
};

export type LiveProviderPlaceOrderResult = Result<
  LiveProviderPlaceOrderSuccess,
  LiveProviderExecutionError
>;

export type LiveProviderCancelOrderRequest = {
  providerOrderId: string;
  marketRef?: TradableMarketRef;
  credentialStatus: Extract<CredentialProviderSafeStatus, { status: "ready" }>;
};

export type LiveProviderCancelOrderSuccess = {
  providerOrderId: string;
  state: CancelOrderSuccess["state"];
  providerMetadata?: Record<string, unknown>;
};

export type LiveProviderCancelOrderResult = Result<
  LiveProviderCancelOrderSuccess,
  LiveProviderExecutionError
>;

export interface LiveProviderExecutionAdapter {
  providerId: ProviderId;
  placeLimitOrder(
    request: LiveProviderPlaceOrderRequest,
  ): Promise<LiveProviderPlaceOrderResult>;
  cancelOrder(
    request: LiveProviderCancelOrderRequest,
  ): Promise<LiveProviderCancelOrderResult>;
}

export type ExecutionAdapterFactory = (
  providerId: ProviderId,
  mode: ExecutionMode,
) => ExecutionAdapter;

export interface AuditLog {
  append(event: AuditEvent): Promise<AuditEvent>;
  listRecent(limit?: number): Promise<readonly AuditEvent[]>;
}

export class InMemoryAuditLog implements AuditLog {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<AuditEvent> {
    const redacted = redactAuditEvent(event);
    this.events.push(redacted);

    return redacted;
  }

  async listRecent(limit = 50): Promise<readonly AuditEvent[]> {
    return this.events.slice(Math.max(0, this.events.length - limit));
  }
}

export function createInMemoryAuditLog(): AuditLog {
  return new InMemoryAuditLog();
}

export type CreateAuditEventInput = {
  type: AuditEvent["type"];
  executionMode: ExecutionMode;
  status: AuditEvent["status"];
  reason?: string;
  intent?: OrderIntent;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditEventFactory = (input: CreateAuditEventInput) => AuditEvent;

export function createDeterministicAuditEventFactory(input: {
  idPrefix?: string;
  timestamp: string | ((sequence: number) => string);
  startAt?: number;
}): AuditEventFactory {
  let sequence = input.startAt ?? 0;
  const idPrefix = input.idPrefix ?? "audit";

  return (eventInput) => {
    sequence += 1;
    const timestamp =
      typeof input.timestamp === "function"
        ? input.timestamp(sequence)
        : input.timestamp;

    return createAuditEvent({
      ...eventInput,
      id: `${idPrefix}-${sequence}`,
      timestamp,
    });
  };
}

export function createSystemAuditEventFactory(): AuditEventFactory {
  let sequence = 0;

  return (eventInput) => {
    sequence += 1;

    return createAuditEvent({
      ...eventInput,
      id: `audit-${Date.now()}-${sequence}`,
      timestamp: new Date().toISOString(),
    });
  };
}

export type OrderIntentProcessAction = "preview" | "submit";

export type OrderIntentProcessSuccess = {
  intent: OrderIntent;
  safetyDecision: OrderSafetyDecision;
  auditEvents: readonly AuditEvent[];
  order?: NormalizedOrder;
  dryRun?: LiveDryRunCheck;
};

export type OrderIntentProcessError = ExecutionAdapterError & {
  safetyDecision: OrderSafetyDecision;
  auditEvents: readonly AuditEvent[];
};

export type OrderIntentProcessResult = Result<
  OrderIntentProcessSuccess,
  OrderIntentProcessError
>;

export async function processOrderIntent(input: {
  intent: OrderIntent;
  safetyInput: OrderSafetyPolicyInput;
  action: OrderIntentProcessAction;
  auditLog: AuditLog;
  eventFactory?: AuditEventFactory;
  adapterFactory?: ExecutionAdapterFactory;
}): Promise<OrderIntentProcessResult> {
  const eventFactory = input.eventFactory ?? createSystemAuditEventFactory();
  const auditEvents: AuditEvent[] = [];
  const appendAuditEvent = async (
    eventInput: CreateAuditEventInput,
  ): Promise<AuditEvent> => {
    const stored = await input.auditLog.append(eventFactory(eventInput));
    auditEvents.push(stored);

    return stored;
  };

  await appendAuditEvent({
    type: "intent_created",
    executionMode: input.safetyInput.executionMode,
    status: "ok",
    intent: input.intent,
    metadata: intentMetadata(input.intent),
  });
  await appendAuditEvent({
    type: "mode_gate_status",
    executionMode: input.safetyInput.executionMode,
    status: "ok",
    intent: input.intent,
    metadata: modeGateStatusMetadata(input.safetyInput),
  });

  const safetyDecision = validateOrderSafety(input.safetyInput);

  if (safetyDecision.status === "rejected") {
    const reason = safetyDecision.reasons.join(",");

    await appendAuditEvent({
      type: "validation_failed",
      executionMode: input.safetyInput.executionMode,
      status: "blocked",
      reason,
      intent: input.intent,
      metadata: validationMetadata(safetyDecision),
    });

    if (safetyDecision.reasons.includes("kill_switch_active_for_risk_increasing_action")) {
      await appendAuditEvent({
        type: "kill_switch_blocked",
        executionMode: input.safetyInput.executionMode,
        status: "blocked",
        reason: "kill_switch_active_for_risk_increasing_action",
        intent: input.intent,
        metadata: validationMetadata(safetyDecision),
      });
    }

    await appendAuditEvent({
      type: "rejected",
      executionMode: input.safetyInput.executionMode,
      status: "blocked",
      reason,
      intent: input.intent,
      metadata: validationMetadata(safetyDecision),
    });

    return {
      ok: false,
      error: {
        ...mapRejectionToExecutionError(safetyDecision.reasons),
        safetyDecision,
        auditEvents,
      },
    };
  }

  await appendAuditEvent({
    type: "validation_passed",
    executionMode: input.safetyInput.executionMode,
    status: "ok",
    intent: input.intent,
    metadata: validationMetadata(safetyDecision),
  });

  if (input.action === "preview") {
    return {
      ok: true,
      value: {
        intent: input.intent,
        safetyDecision,
        auditEvents,
      },
    };
  }

  const adapter = (input.adapterFactory ?? createExecutionAdapterForMode)(
    input.intent.providerId,
    input.safetyInput.executionMode,
  );
  const result = await adapter.placeOrder({
    intent: input.intent,
    safetyDecision,
  });

  if (!result.ok) {
    const liveProviderFailure =
      input.safetyInput.executionMode === "live" &&
      (result.error.reason === "provider_rejected" ||
        result.error.reason === "network_error");

    await appendAuditEvent({
      type: liveProviderFailure
        ? result.error.reason === "network_error"
          ? "error_occurred"
          : "order_rejected"
        : "rejected",
      executionMode: input.safetyInput.executionMode,
      status: liveProviderFailure ? "failed" : "blocked",
      reason: result.error.reason,
      intent: input.intent,
      metadata: {
        message: result.error.message,
        ...(result.error.providerMetadata === undefined
          ? {}
          : { providerMetadata: result.error.providerMetadata }),
      },
    });

    return {
      ok: false,
      error: {
        ...result.error,
        safetyDecision,
        auditEvents,
      },
    };
  }

  if (result.value.order !== undefined) {
    await appendAuditEvent({
      type:
        input.safetyInput.executionMode === "live"
          ? "order_submitted"
          : "paper_order_created",
      executionMode: input.safetyInput.executionMode,
      status: "ok",
      intent: input.intent,
      orderId: result.value.order.id,
      metadata: {
        state: result.value.order.state,
        ...(input.safetyInput.executionMode === "live"
          ? { providerOrderId: result.value.order.id }
          : {}),
      },
    });
  }

  if (result.value.dryRun !== undefined) {
    await appendAuditEvent({
      type: "dry_run_checked",
      executionMode: input.safetyInput.executionMode,
      status: "ok",
      intent: input.intent,
      metadata: result.value.dryRun,
    });
  }

  return {
    ok: true,
    value: {
      intent: input.intent,
      safetyDecision,
      auditEvents,
      ...(result.value.order !== undefined ? { order: result.value.order } : {}),
      ...(result.value.dryRun !== undefined ? { dryRun: result.value.dryRun } : {}),
    },
  };
}

export class DisabledExecutionAdapter implements ExecutionAdapter {
  readonly mode = "disabled" as const;

  constructor(readonly providerId: ProviderId) {}

  async placeOrder(): Promise<PlaceOrderResult> {
    return {
      ok: false,
      error: {
        reason: "execution_not_configured",
        message: "Execution mode is disabled; risk-increasing orders are rejected.",
      },
    };
  }

  async cancelOrder(): Promise<CancelOrderResult> {
    return {
      ok: false,
      error: {
        reason: "cancel_unavailable",
        message: "No local or provider order exists to cancel in disabled mode.",
      },
    };
  }
}

export class PaperExecutionAdapter implements ExecutionAdapter {
  readonly mode = "paper" as const;

  constructor(readonly providerId: ProviderId) {}

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    if (request.safetyDecision.status === "rejected") {
      return blockedByRiskPolicy(request.safetyDecision.reasons);
    }

    if (!isTradableMarketRef(request.intent.marketRef)) {
      return {
        ok: false,
        error: {
          reason: "blocked_by_risk_policy",
          message: "Paper order requires a selected fresh tradable market reference.",
        },
      };
    }

    return {
      ok: true,
      value: {
        order: createPaperOrder(request.intent, request.intent.marketRef),
        fills: [],
        auditEvents: [],
        providerMetadata: { submittedExternally: false },
      },
    };
  }

  async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResult> {
    return {
      ok: true,
      value: {
        orderId: request.orderId,
        state: "cancel_requested",
        auditEvents: [],
        providerMetadata: { submittedExternally: false },
      },
    };
  }
}

export class LiveDryRunExecutionAdapter implements ExecutionAdapter {
  readonly mode = "live_dry_run" as const;

  constructor(readonly providerId: ProviderId) {}

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    if (request.safetyDecision.status === "rejected") {
      return blockedByRiskPolicy(request.safetyDecision.reasons);
    }

    return {
      ok: true,
      value: {
        dryRun: {
          providerId: this.providerId,
          intentId: request.intent.id,
          checkedAt: request.intent.createdAt,
          wouldSubmitExternally: false,
          message:
            "Live dry-run validation completed locally; no provider order was submitted.",
        },
        fills: [],
        auditEvents: [],
        providerMetadata: { submittedExternally: false },
      },
    };
  }

  async cancelOrder(): Promise<CancelOrderResult> {
    return {
      ok: false,
      error: {
        reason: "cancel_unavailable",
        message: "Dry-run mode does not create provider orders to cancel.",
      },
    };
  }
}

export class LiveBlockedExecutionAdapter implements ExecutionAdapter {
  readonly mode = "live" as const;

  constructor(readonly providerId: ProviderId) {}

  async placeOrder(): Promise<PlaceOrderResult> {
    return {
      ok: false,
      error: {
        reason: "not_implemented",
        message:
          "Real live provider submission is intentionally not implemented in Goal 05.",
      },
    };
  }

  async cancelOrder(): Promise<CancelOrderResult> {
    return {
      ok: false,
      error: {
        reason: "cancel_unavailable",
        message:
          "Real live cancellation is blocked until the gated live execution goal.",
      },
    };
  }
}

export class GatedLiveExecutionAdapter implements ExecutionAdapter {
  readonly mode = "live" as const;
  readonly providerId: ProviderId;

  private readonly credentialProvider: CredentialProvider;
  private readonly localApprovalGateProvider: LocalApprovalGateProvider;
  private readonly providerAdapter: LiveProviderExecutionAdapter;

  constructor(input: {
    providerId: ProviderId;
    credentialProvider: CredentialProvider;
    localApprovalGateProvider: LocalApprovalGateProvider;
    providerAdapter: LiveProviderExecutionAdapter;
  }) {
    this.providerId = input.providerId;
    this.credentialProvider = input.credentialProvider;
    this.localApprovalGateProvider = input.localApprovalGateProvider;
    this.providerAdapter = input.providerAdapter;
  }

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    if (request.safetyDecision.status === "rejected") {
      return blockedByRiskPolicy(request.safetyDecision.reasons);
    }

    const liveBasics = validateLiveSmokeOrderBasics(request.intent);

    if (!liveBasics.ok) {
      return liveBasics;
    }

    const credentialStatus = await this.credentialProvider.getCredentialStatus(
      this.providerId,
    );

    if (credentialStatus.status !== "ready") {
      return {
        ok: false,
        error: {
          reason: "blocked_by_credentials",
          message: `Credential source is not ready for ${this.providerId} live execution.`,
        },
      };
    }

    const localApproval = await this.localApprovalGateProvider.loadLocalApproval(
      this.providerId,
    );

    if (localApproval.status !== "approved") {
      return {
        ok: false,
        error: {
          reason: "blocked_by_local_approval",
          message: `A non-committed approved local legal gate is required for ${this.providerId} live execution.`,
        },
      };
    }

    const providerResult = await this.providerAdapter.placeLimitOrder({
      intent: request.intent,
      safetyDecision: request.safetyDecision,
      credentialStatus,
      localApproval,
    });

    if (!providerResult.ok) {
      return { ok: false, error: providerResult.error };
    }

    return {
      ok: true,
      value: {
        order: providerResult.value.order,
        fills: providerResult.value.fills,
        auditEvents: [],
        providerMetadata: {
          providerOrderId: providerResult.value.providerOrderId,
          submittedExternally: true,
          ...(providerResult.value.providerMetadata ?? {}),
        },
      },
    };
  }

  async cancelOrder(request: CancelOrderRequest): Promise<CancelOrderResult> {
    const credentialStatus = await this.credentialProvider.getCredentialStatus(
      this.providerId,
    );

    if (credentialStatus.status !== "ready") {
      return {
        ok: false,
        error: {
          reason: "blocked_by_credentials",
          message: `Credential source is not ready for ${this.providerId} live cancellation.`,
        },
      };
    }

    const providerResult = await this.providerAdapter.cancelOrder({
      providerOrderId: request.orderId,
      ...(request.marketRef === undefined ? {} : { marketRef: request.marketRef }),
      credentialStatus,
    });

    if (!providerResult.ok) {
      return { ok: false, error: providerResult.error };
    }

    return {
      ok: true,
      value: {
        orderId: providerResult.value.providerOrderId,
        state: providerResult.value.state,
        auditEvents: [],
        providerMetadata: {
          providerOrderId: providerResult.value.providerOrderId,
          submittedExternally: true,
          ...(providerResult.value.providerMetadata ?? {}),
        },
      },
    };
  }
}

export type AccountStateAdapterErrorReason =
  | "provider_credentials_required"
  | "provider_not_supported"
  | "account_unavailable"
  | "network_error"
  | "invalid_payload"
  | "not_implemented";

export type AccountStateAdapterError = {
  reason: AccountStateAdapterErrorReason;
  message: string;
  providerMetadata?: Record<string, unknown>;
};

export type AccountStateSnapshot = {
  providerId: ProviderId;
  capturedAt: string;
  balances: NormalizedBalance[];
  positions: NormalizedPosition[];
  openOrders: NormalizedOrder[];
  fills: NormalizedFill[];
  fees: NormalizedFee[];
  metrics: FinancialMetricsSnapshot;
  providerMetadata?: Record<string, unknown>;
};

export type AccountStateResult = Result<
  AccountStateSnapshot,
  AccountStateAdapterError
>;

export interface AccountStateAdapter {
  providerId: ProviderId;
  getAccountState(marketRef?: TradableMarketRef): Promise<AccountStateResult>;
}

function createExecutionAdapterForMode(
  providerId: ProviderId,
  mode: ExecutionMode,
): ExecutionAdapter {
  switch (mode) {
    case "disabled":
      return new DisabledExecutionAdapter(providerId);
    case "paper":
      return new PaperExecutionAdapter(providerId);
    case "live_dry_run":
      return new LiveDryRunExecutionAdapter(providerId);
    case "live":
      return new LiveBlockedExecutionAdapter(providerId);
  }
}

function createPaperOrder(
  intent: OrderIntent,
  marketRef: TradableMarketRef,
): NormalizedOrder {
  return {
    id: `paper-${intent.id}`,
    providerId: intent.providerId,
    marketRef,
    side: intent.side,
    type: intent.type,
    timeInForce: intent.timeInForce,
    state: "open",
    price: intent.price,
    originalQuantity: intent.quantity,
    filledQuantity: "0",
    remainingQuantity: intent.quantity,
    createdAt: intent.createdAt,
    fees: [],
    providerMetadata: { executionMode: "paper", submittedExternally: false },
  };
}

function createAuditEvent(
  input: CreateAuditEventInput & { id: string; timestamp: string },
): AuditEvent {
  const event: AuditEvent = {
    id: input.id,
    timestamp: input.timestamp,
    type: input.type,
    executionMode: input.executionMode,
    status: input.status,
  };

  if (input.intent !== undefined) {
    event.marketId = input.intent.marketRef.marketId;
    if (input.intent.marketRef.outcomeId !== undefined) {
      event.tokenId = input.intent.marketRef.outcomeId;
    }
  }

  if (input.orderId !== undefined) {
    event.orderId = input.orderId;
  }

  if (input.reason !== undefined) {
    event.reason = input.reason;
  }

  if (input.metadata !== undefined) {
    event.metadata = input.metadata;
  }

  return event;
}

function intentMetadata(intent: OrderIntent): Record<string, unknown> {
  return {
    providerId: intent.providerId,
    marketId: intent.marketRef.marketId,
    outcomeId: intent.marketRef.outcomeId,
    side: intent.side,
    price: intent.price,
    stakeAmount: intent.stakeAmount,
    submissionRoute: intent.submissionRoute,
    marketable: intent.marketable,
  };
}

function modeGateStatusMetadata(
  input: OrderSafetyPolicyInput,
): Record<string, unknown> {
  return {
    executionMode: input.executionMode,
    selectedMarket: input.selectedMarket === null ? "missing" : "selected",
    orderBookFreshness: input.orderBookFreshness,
    stakeConfigured: input.stakeConfigured,
    legalGateStatus: input.legalGateStatus,
    geoGateStatus: input.geoGateStatus,
    credentialStatus: input.credentialStatus,
    localApprovalStatus: input.localApprovalStatus,
    auditLogEnabled: input.auditLogEnabled,
    oneClickArmed: input.oneClickArmed,
    killSwitchActive: input.killSwitchActive,
    requiredMetrics: {
      availableFunds: input.availableFunds === "unknown" ? "unknown" : "known",
      providerExposure:
        input.orderIntent === undefined
          ? "not_checked"
          : input.providerExposure[input.orderIntent.providerId] === "unknown"
            ? "unknown"
            : "known",
      marketExposure:
        input.orderIntent === undefined
          ? "not_checked"
          : input.marketExposure[input.orderIntent.marketRef.marketId] === "unknown"
            ? "unknown"
            : "known",
    },
  };
}

function validationMetadata(decision: OrderSafetyDecision): Record<string, unknown> {
  return {
    status: decision.status,
    ...(decision.status === "rejected" ? { reasons: decision.reasons } : {}),
    ...(decision.projectedMarketExposure !== undefined
      ? { projectedMarketExposure: decision.projectedMarketExposure }
      : {}),
    ...(decision.newOrderExposure !== undefined
      ? { newOrderExposure: decision.newOrderExposure }
      : {}),
  };
}

function mapRejectionToExecutionError(
  reasons: readonly OrderRejectionReason[],
): ExecutionAdapterError {
  if (reasons.includes("execution_disabled")) {
    return {
      reason: "execution_not_configured",
      message: "Execution mode is disabled for risk-increasing orders.",
    };
  }

  if (reasons.includes("legal_gate_not_approved")) {
    return {
      reason: "blocked_by_legal_gate",
      message: "Legal gate is not approved for this order intent.",
    };
  }

  if (reasons.includes("geo_blocked") || reasons.includes("geo_unknown")) {
    return {
      reason: "blocked_by_geo_gate",
      message: "Geo/platform eligibility gate blocks this order intent.",
    };
  }

  if (reasons.includes("credentials_missing")) {
    return {
      reason: "blocked_by_credentials",
      message: "Credential gate blocks this order intent.",
    };
  }

  if (reasons.includes("audit_log_not_enabled")) {
    return {
      reason: "audit_log_unavailable",
      message: "Audit logging must be enabled before live-style order handling.",
    };
  }

  return {
    reason: "blocked_by_risk_policy",
    message: `Risk policy rejected this order intent: ${reasons.join(", ")}.`,
  };
}

function blockedByRiskPolicy(
  reasons: readonly OrderRejectionReason[],
): PlaceOrderResult {
  return {
    ok: false,
    error: {
      reason: "blocked_by_risk_policy",
      message: `Risk policy rejected this order intent: ${reasons.join(", ")}.`,
    },
  };
}

function validateLiveSmokeOrderBasics(intent: OrderIntent): PlaceOrderResult {
  const reasons: string[] = [];

  if (intent.side !== "BUY") {
    reasons.push("live_smoke_buy_only");
  }

  if (intent.type !== "limit") {
    reasons.push("limit_order_required");
  }

  if (intent.timeInForce !== "GTC") {
    reasons.push("gtc_required");
  }

  if (intent.marketable) {
    reasons.push("marketable_order_not_approved");
  }

  if (intent.submissionRoute === "one_click") {
    reasons.push("one_click_live_submit_disabled");
  }

  if (reasons.length === 0) {
    return {
      ok: true,
      value: {
        fills: [],
        auditEvents: [],
      },
    };
  }

  return {
    ok: false,
    error: {
      reason: "blocked_by_risk_policy",
      message: `Live order rejected before provider submission: ${reasons.join(", ")}.`,
    },
  };
}

function redactAuditEvent(event: AuditEvent): AuditEvent {
  if (event.metadata === undefined) {
    return event;
  }

  return {
    ...event,
    metadata: redactMetadata(event.metadata),
  };
}

function redactMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      shouldRedactKey(key) ? "[redacted]" : redactMetadataValue(entry),
    ]),
  );
}

function redactMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactMetadataValue);
  }

  if (value !== null && typeof value === "object") {
    return redactMetadata(value as Record<string, unknown>);
  }

  return value;
}

function shouldRedactKey(key: string): boolean {
  return /(?:api[_-]?key|api[_-]?secret|auth|authorization|private[_-]?key|passphrase|seed|secret|signed[_-]?payload|signature|wallet|account)/iu.test(
    key,
  );
}
