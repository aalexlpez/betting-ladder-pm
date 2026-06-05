import { describe, expect, it } from "vitest";

import type {
  OrderIntent,
  OrderSafetyPolicyInput,
  OrderSafetyDecision,
  TradableMarketRef,
} from "@prediction-ladder/core";

import {
  createDeterministicAuditEventFactory,
  createExecutionBootstrapStatus,
  createInMemoryAuditLog,
  createStaticCredentialProvider,
  createStaticLocalApprovalGateProvider,
  GatedLiveExecutionAdapter,
  PaperExecutionAdapter,
  processOrderIntent,
  type AccountStateAdapter,
  type AccountStateSnapshot,
  type ExecutionAdapter,
  type LiveProviderExecutionAdapter,
} from "./index";

const marketRef: TradableMarketRef = {
  providerId: "polymarket",
  marketId: "pm-election-2026",
  outcomeId: "pm-token-yes",
  currency: "USDC",
  tickSize: "0.01",
  marketStatus: "open",
  freshness: "fresh",
};

const intent: OrderIntent = {
  id: "intent-1",
  providerId: "polymarket",
  marketRef,
  side: "BUY",
  type: "limit",
  timeInForce: "GTC",
  price: "0.5",
  stakeAmount: { amount: "5", currency: "USDC" },
  quantity: "10",
  estimatedCost: { amount: "5", currency: "USDC" },
  marketable: false,
  submissionRoute: "confirm",
  createdAt: "2026-06-03T10:00:00.000Z",
};

const approvedDecision: OrderSafetyDecision = {
  status: "approved",
  projectedMarketExposure: "5",
  newOrderExposure: "5",
};

function baseSafetyInput(
  overrides: Partial<OrderSafetyPolicyInput> = {},
): OrderSafetyPolicyInput {
  return {
    executionMode: "paper",
    actionClass: "risk_increasing",
    submissionRoute: "confirm",
    orderIntent: intent,
    selectedMarket: marketRef,
    orderBookFreshness: "fresh",
    stakeConfigured: true,
    legalGateStatus: "approved",
    geoGateStatus: "approved",
    credentialStatus: "ready",
    localApprovalStatus: "approved",
    oneClickArmed: false,
    firstLiveAck: true,
    killSwitchActive: false,
    maxStakePerOrder: "5",
    maxMarketExposure: "25",
    currentMarketExposure: "0",
    openOrderExposure: "0",
    availableFunds: "100",
    providerExposure: { polymarket: "0", kalshi: "0" },
    marketExposure: { "pm-election-2026": "0" },
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

function eventFactory() {
  return createDeterministicAuditEventFactory({
    idPrefix: "test-audit",
    timestamp: "2026-06-03T10:00:00.000Z",
  });
}

describe("execution bootstrap status", () => {
  it("states that live execution belongs behind execution ports", () => {
    expect(createExecutionBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/execution",
      boundary: "paper, live-dry-run, and gated live execution ports",
      boundaryReady: true,
      implementationStatus: "contracts_ready",
    });
  });
});

describe("execution and account ports", () => {
  it("keeps place/cancel ports explicit without implementing live submission", async () => {
    const adapter: ExecutionAdapter = {
      providerId: "polymarket",
      mode: "disabled",
      placeOrder: async () => ({
        ok: false,
        error: {
          reason: "execution_not_configured",
          message: "Goal 04A defines contracts only; Goal 05/06 wire execution.",
        },
      }),
      cancelOrder: async () => ({
        ok: false,
        error: {
          reason: "cancel_unavailable",
          message: "No provider execution adapter is configured.",
        },
      }),
    };

    expect(await adapter.placeOrder({ intent, safetyDecision: approvedDecision })).toEqual({
      ok: false,
      error: {
        reason: "execution_not_configured",
        message: "Goal 04A defines contracts only; Goal 05/06 wire execution.",
      },
    });
    expect(await adapter.cancelOrder({ orderId: "order-1" })).toEqual({
      ok: false,
      error: {
        reason: "cancel_unavailable",
        message: "No provider execution adapter is configured.",
      },
    });
  });

  it("rejects disabled risk-increasing orders with audited reasons", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "disabled" }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.reason).toBe("execution_not_configured");
      expect(result.error.safetyDecision.status).toBe("rejected");
    }

    expect(events.map((event) => event.type)).toEqual([
      "intent_created",
      "mode_gate_status",
      "validation_failed",
      "rejected",
    ]);
    expect(events[2]?.reason).toContain("execution_disabled");
  });

  it("creates paper orders only after local validation passes", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "paper" }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.order?.id).toBe("paper-intent-1");
      expect(result.value.order?.state).toBe("open");
      expect(result.value.order?.providerMetadata).toEqual({
        executionMode: "paper",
        submittedExternally: false,
      });
      expect(result.value.dryRun).toBeUndefined();
    }

    expect(events.map((event) => event.type)).toEqual([
      "intent_created",
      "mode_gate_status",
      "validation_passed",
      "paper_order_created",
    ]);
  });

  it("runs live-dry-run checks without creating provider orders", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "live_dry_run" }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.order).toBeUndefined();
      expect(result.value.dryRun).toEqual({
        providerId: "polymarket",
        intentId: "intent-1",
        checkedAt: "2026-06-03T10:00:00.000Z",
        wouldSubmitExternally: false,
        message:
          "Live dry-run validation completed locally; no provider order was submitted.",
      });
    }

    expect(events.map((event) => event.type)).toContain("dry_run_checked");
  });

  it("keeps live mode blocked even if validation gates pass", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "live" }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.reason).toBe("not_implemented");
      expect(result.error.message).toContain("Real live provider submission");
      expect(result.error.safetyDecision.status).toBe("approved");
    }

    expect(events.map((event) => event.type)).toEqual([
      "intent_created",
      "mode_gate_status",
      "validation_passed",
      "rejected",
    ]);
  });

  it("audits kill-switch blocks before any adapter can create an order", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ killSwitchActive: true }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(false);
    expect(events.map((event) => event.type)).toContain("kill_switch_blocked");
    expect(JSON.stringify(events)).toContain(
      "kill_switch_active_for_risk_increasing_action",
    );
  });

  it("rejects live-style handling when the audit gate is disabled and still records the blocker", async () => {
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({
        executionMode: "live_dry_run",
        auditLogEnabled: false,
      }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
    });
    const events = await auditLog.listRecent();

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.reason).toBe("audit_log_unavailable");
      expect(result.error.safetyDecision.status).toBe("rejected");
    }

    expect(events.map((event) => event.type)).toContain("validation_failed");
    expect(JSON.stringify(events)).toContain("audit_log_not_enabled");
  });

  it("allows local paper cancellation under the kill-switch policy", async () => {
    const adapter = new PaperExecutionAdapter("polymarket");
    const result = await adapter.cancelOrder({ orderId: "paper-intent-1" });

    expect(result).toEqual({
      ok: true,
      value: {
        orderId: "paper-intent-1",
        state: "cancel_requested",
        auditEvents: [],
        providerMetadata: { submittedExternally: false },
      },
    });
  });

  it("redacts secret-like metadata before audit events are stored", async () => {
    const auditLog = createInMemoryAuditLog();
    const factory = eventFactory();

    await auditLog.append(
      factory({
        type: "mode_gate_status",
        executionMode: "paper",
        status: "ok",
        metadata: {
          publicValue: "kept",
          apiSecret: "must-not-log",
          nested: {
            authHeader: "Bearer must-not-log",
          },
        },
      }),
    );

    const serialized = JSON.stringify(await auditLog.listRecent());

    expect(serialized).toContain("kept");
    expect(serialized).not.toContain("must-not-log");
    expect(serialized).toContain("[redacted]");
  });

  it("represents credential-required account state without fake balances", async () => {
    const snapshot: AccountStateSnapshot = {
      providerId: "kalshi",
      capturedAt: "2026-06-03T10:00:00.000Z",
      balances: [
        {
          providerId: "kalshi",
          currency: "USD",
          available: { status: "unknown", reason: "credentials required" },
          total: { status: "unknown", reason: "credentials required" },
          capturedAt: "2026-06-03T10:00:00.000Z",
        },
      ],
      positions: [
        {
          providerId: "kalshi",
          marketId: "KX-FED-2026",
          outcomeId: "yes",
          quantity: { status: "unknown", reason: "portfolio credentials required" },
          exposure: { status: "unknown", reason: "portfolio credentials required" },
          settlement: {
            status: "unknown",
            reason: "portfolio credentials required",
          },
        },
      ],
      openOrders: [],
      fills: [],
      fees: [],
      metrics: {
        timestamp: "2026-06-03T10:00:00.000Z",
        global: [
          {
            realizedPnl: { status: "unknown", reason: "credentials required" },
            unrealizedPnl: { status: "unknown", reason: "credentials required" },
            totalPnl: { status: "unknown", reason: "credentials required" },
            availableFunds: { status: "unknown", reason: "credentials required" },
            openOrderAmount: { status: "unknown", reason: "credentials required" },
            exposure: { status: "unknown", reason: "credentials required" },
          },
        ],
        byProvider: [],
        byMarket: [],
      },
    };
    const accountAdapter: AccountStateAdapter = {
      providerId: "kalshi",
      getAccountState: async () => ({ ok: true, value: snapshot }),
    };
    const result = await accountAdapter.getAccountState();

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.balances[0]?.available).toEqual({
        status: "unknown",
        reason: "credentials required",
      });
      expect(result.value.positions[0]?.settlement.status).toBe("unknown");
    }
  });
});

describe("gated live execution adapter", () => {
  it("rejects live placement when credentials are missing", async () => {
    const adapter = createGatedLiveAdapter({
      credentialStatus: {
        providerId: "polymarket",
        status: "missing",
        reason: "no approved local credential source",
      },
    });

    const result = await adapter.placeOrder({
      intent,
      safetyDecision: approvedDecision,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        reason: "blocked_by_credentials",
        message: "Credential source is not ready for polymarket live execution.",
      },
    });
  });

  it("rejects live placement when the non-committed local approval gate is missing", async () => {
    const adapter = createGatedLiveAdapter({
      localApprovalStatus: {
        providerId: "polymarket",
        status: "missing",
        reason: ".local/legal-gate.local.json was not loaded",
      },
    });

    const result = await adapter.placeOrder({
      intent,
      safetyDecision: approvedDecision,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        reason: "blocked_by_local_approval",
        message:
          "A non-committed approved local legal gate is required for polymarket live execution.",
      },
    });
  });

  it("rejects live placement when domain gates fail before provider submission", async () => {
    const provider = createMockLiveProviderAdapter();
    const adapter = createGatedLiveAdapter({ provider });
    const result = await adapter.placeOrder({
      intent,
      safetyDecision: {
        status: "rejected",
        reasons: ["kill_switch_active_for_risk_increasing_action"],
      },
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.reason).toBe("blocked_by_risk_policy");
      expect(result.error.message).toContain(
        "kill_switch_active_for_risk_increasing_action",
      );
    }

    expect(provider.placeLimitOrderCalls).toBe(0);
  });

  it("places a mocked BUY live limit order only after every gate passes", async () => {
    const provider = createMockLiveProviderAdapter();
    const adapter = createGatedLiveAdapter({ provider });
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "live" }),
      action: "submit",
      auditLog: createInMemoryAuditLog(),
      eventFactory: eventFactory(),
      adapterFactory: () => adapter,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.order?.id).toBe("pm-live-order-1");
      expect(result.value.order?.providerMetadata).toEqual({
        providerOrderId: "pm-live-order-1",
        submittedExternally: true,
      });
    }

    expect(provider.placeLimitOrderCalls).toBe(1);
  });

  it("cancels a mocked provider order through the live adapter even when kill switch policy would block new risk", async () => {
    const provider = createMockLiveProviderAdapter();
    const adapter = createGatedLiveAdapter({ provider });
    const result = await adapter.cancelOrder({
      orderId: "pm-live-order-1",
      marketRef,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        orderId: "pm-live-order-1",
        state: "cancelled",
        auditEvents: [],
        providerMetadata: {
          providerOrderId: "pm-live-order-1",
          submittedExternally: true,
        },
      },
    });
    expect(provider.cancelOrderCalls).toBe(1);
  });

  it("maps provider rejections without leaking provider-specific payloads", async () => {
    const adapter = createGatedLiveAdapter({
      provider: createMockLiveProviderAdapter({
        placeResult: {
          ok: false,
          error: {
            reason: "provider_rejected",
            message: "Provider rejected the order.",
            providerMetadata: {
              providerCode: "PRICE_TOO_AGGRESSIVE",
              signedPayload: "must-not-render",
            },
          },
        },
      }),
    });
    const auditLog = createInMemoryAuditLog();
    const result = await processOrderIntent({
      intent,
      safetyInput: baseSafetyInput({ executionMode: "live" }),
      action: "submit",
      auditLog,
      eventFactory: eventFactory(),
      adapterFactory: () => adapter,
    });
    const serialized = JSON.stringify(await auditLog.listRecent());

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.reason).toBe("provider_rejected");
    }

    expect(serialized).toContain("provider_rejected");
    expect(serialized).not.toContain("must-not-render");
    expect(serialized).toContain("[redacted]");
  });

  it("maps provider network failures as explicit network_error results", async () => {
    const adapter = createGatedLiveAdapter({
      provider: createMockLiveProviderAdapter({
        placeResult: {
          ok: false,
          error: {
            reason: "network_error",
            message: "Provider network request failed before a response.",
          },
        },
      }),
    });
    const result = await adapter.placeOrder({
      intent,
      safetyDecision: approvedDecision,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        reason: "network_error",
        message: "Provider network request failed before a response.",
      },
    });
  });
});

function createGatedLiveAdapter(input: {
  credentialStatus?: Awaited<
    ReturnType<ReturnType<typeof createStaticCredentialProvider>["getCredentialStatus"]>
  >;
  localApprovalStatus?: Awaited<
    ReturnType<ReturnType<typeof createStaticLocalApprovalGateProvider>["loadLocalApproval"]>
  >;
  provider?: MockLiveProviderExecutionAdapter;
} = {}): GatedLiveExecutionAdapter {
  return new GatedLiveExecutionAdapter({
    providerId: "polymarket",
    credentialProvider: createStaticCredentialProvider(
      input.credentialStatus ?? {
        providerId: "polymarket",
        status: "ready",
        source: "explicit_local_provider",
      },
    ),
    localApprovalGateProvider: createStaticLocalApprovalGateProvider(
      input.localApprovalStatus ?? {
        providerId: "polymarket",
        status: "approved",
        targetJurisdiction: "approved-smoke-test-jurisdiction",
        operatorIdentity: "approved local operator",
        approver: "business owner",
        c0Review: "PASS",
        c1RiskAcceptance: "APPROVED_OR_NOT_REQUIRED",
        maxStakeFirstOrder: "5",
        maxMarketExposure: "25",
        geoblockResult: "PASS",
        credentialSource: "explicit_local_provider",
        auditLog: "enabled",
        approvedAt: "2026-06-04T09:00:00.000Z",
      },
    ),
    providerAdapter: input.provider ?? createMockLiveProviderAdapter(),
  });
}

type MockLiveProviderExecutionAdapter = LiveProviderExecutionAdapter & {
  placeLimitOrderCalls: number;
  cancelOrderCalls: number;
};

function createMockLiveProviderAdapter(input: {
  placeResult?: Awaited<
    ReturnType<LiveProviderExecutionAdapter["placeLimitOrder"]>
  >;
} = {}): MockLiveProviderExecutionAdapter {
  return {
    providerId: "polymarket",
    placeLimitOrderCalls: 0,
    cancelOrderCalls: 0,
    async placeLimitOrder(request) {
      this.placeLimitOrderCalls += 1;

      return (
        input.placeResult ?? {
          ok: true,
          value: {
            providerOrderId: "pm-live-order-1",
            order: {
              id: "pm-live-order-1",
              providerId: "polymarket",
              marketRef,
              side: "BUY",
              type: "limit",
              timeInForce: "GTC",
              state: "open",
              price: request.intent.price,
              originalQuantity: request.intent.quantity,
              filledQuantity: "0",
              remainingQuantity: request.intent.quantity,
              createdAt: request.intent.createdAt,
              fees: [],
              providerMetadata: {
                providerOrderId: "pm-live-order-1",
                submittedExternally: true,
              },
            },
            fills: [],
            providerMetadata: {
              providerOrderId: "pm-live-order-1",
              submittedExternally: true,
            },
          },
        }
      );
    },
    async cancelOrder(request) {
      this.cancelOrderCalls += 1;

      return {
        ok: true,
        value: {
          providerOrderId: request.providerOrderId,
          state: "cancelled",
          providerMetadata: {
            providerOrderId: request.providerOrderId,
            submittedExternally: true,
          },
        },
      };
    },
  };
}
