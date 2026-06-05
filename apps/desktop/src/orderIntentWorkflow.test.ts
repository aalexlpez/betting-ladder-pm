import { describe, expect, it } from "vitest";

import {
  createDeterministicAuditEventFactory,
  createInMemoryAuditLog,
} from "@prediction-ladder/execution";

import {
  canSubmitOrders,
  createLiveGateBlockers,
  createDesktopTerminalState,
  getDesktopShellSafetyEvidence,
} from "./appConfig";
import type { LiveGateStatusCommandResponse } from "./liveExecutionCommands";
import type {
  MarketGetOrderBookCommandResponse,
  MarketSearchCommandResponse,
  MarketSubscribeCommandResponse,
  RendererMarketSearchResult,
} from "./marketDataCommands";
import type { MarketDataWorkflowState } from "./marketDataWorkflow";
import {
  createInitialOrderEntryState,
  previewOrderFromLadderCell,
  selectOrderEntryExecutionMode,
  selectOrderEntryStakeAmount,
  selectOrderEntryStakePreset,
  submitOrderEntryPreview,
} from "./orderIntentWorkflow";

describe("desktop order-intent workflow", () => {
  it("creates a BUY preview from a Back ladder cell while one-click stays off", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });
    const evidence = getDesktopShellSafetyEvidence(state);

    expect(preview.oneClickArmed).toBe(false);
    expect(preview.latestIntent?.side).toBe("BUY");
    expect(preview.latestIntent?.submissionRoute).toBe("preview");
    expect(preview.validation?.status).toBe("approved");
    expect(state.orderPreview.status).toBe("validation_passed");
    expect(state.orderPreview.canSubmitLocal).toBe(true);
    expect(canSubmitOrders(state)).toBe(false);
    expect(evidence.noLiveSubmissionPath).toBe(true);
  });

  it("creates a local paper order from an accepted preview and renders audit state", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const submitted = await submitOrderEntryPreview({
      auditLog,
      eventFactory: eventFactory("submit"),
      orderEntry: preview,
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: submitted });

    expect(submitted.openOrders.map((order) => order.id)).toEqual(["paper-intent-1"]);
    expect(submitted.auditEvents.map((event) => event.type)).toContain(
      "paper_order_created",
    );
    expect(state.openOrders.rows).toHaveLength(1);
    expect(state.openOrders.rows[0]?.state).toBe("open");
    expect(state.auditLog.rows.map((event) => event.type)).toContain(
      "paper_order_created",
    );
  });

  it("clears an accepted preview when stake or mode changes", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const stakeChanged = selectOrderEntryStakePreset(preview, "10");
    const modeChanged = selectOrderEntryExecutionMode(preview, "live_dry_run");

    expect(stakeChanged.latestIntent).toBeNull();
    expect(stakeChanged.validation).toBeNull();
    expect(createDesktopTerminalState({ workflow, orderEntry: stakeChanged }).orderPreview.canSubmitLocal).toBe(false);
    expect(modeChanged.latestIntent).toBeNull();
    expect(modeChanged.validation).toBeNull();
    expect(createDesktopTerminalState({ workflow, orderEntry: modeChanged }).orderPreview.canSubmitLocal).toBe(false);
  });

  it("uses a manually entered stake amount for ladder previews", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryStakeAmount(
      selectOrderEntryExecutionMode(createInitialOrderEntryState(), "paper"),
      "1.25",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });

    expect(preview.latestIntent?.stakeAmount.amount).toBe("1.25");
    expect(preview.latestIntent?.quantity).toBe("2.5");
    expect(preview.validation?.status).toBe("approved");
    expect(state.stakeInput).toEqual({ amount: "1.25", configured: true });
    expect(state.stakePresets.every((preset) => !preset.selected)).toBe(true);
  });

  it("blocks ladder previews when manual stake is empty", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryStakeAmount(
      selectOrderEntryExecutionMode(createInitialOrderEntryState(), "paper"),
      "",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });

    expect(orderEntry.selectedStakeConfigured).toBe(false);
    expect(preview.latestIntent).toBeNull();
    expect(preview.validation).toEqual({
      status: "rejected",
      reasons: ["stake_not_configured"],
    });
  });

  it("keeps manual stake subject to the configured risk limit", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryStakeAmount(
      selectOrderEntryExecutionMode(createInitialOrderEntryState(), "paper"),
      "10",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });

    expect(preview.latestIntent?.stakeAmount.amount).toBe("10");
    expect(preview.validation?.status).toBe("rejected");
    expect(preview.validationReasons).toContain("stake_exceeds_limit");
  });

  it("clears a stale accepted preview when the next preview cannot use an executable order book", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const failedPreview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory("failed"),
      orderEntry: preview,
      price: "0.50",
      workflow: createNoSelectionWorkflow(),
    });
    const state = createDesktopTerminalState({
      workflow: createNoSelectionWorkflow(),
      orderEntry: failedPreview,
    });

    expect(failedPreview.latestIntent).toBeNull();
    expect(failedPreview.validation).toEqual({
      status: "rejected",
      reasons: ["market_not_selected"],
    });
    expect(state.orderPreview.canSubmitLocal).toBe(false);
    expect(state.orderPreview.intent).toBeNull();
  });

  it("clears a stale accepted preview when submit loses the executable order book", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const failedSubmit = await submitOrderEntryPreview({
      auditLog,
      eventFactory: eventFactory("submit"),
      orderEntry: preview,
      workflow: createSelectedWithoutBookWorkflow(),
    });
    const state = createDesktopTerminalState({
      workflow: createSelectedWithoutBookWorkflow(),
      orderEntry: failedSubmit,
    });

    expect(failedSubmit.latestIntent).toBeNull();
    expect(failedSubmit.validation).toEqual({
      status: "rejected",
      reasons: ["order_book_not_fresh"],
    });
    expect(state.orderPreview.canSubmitLocal).toBe(false);
    expect(state.orderPreview.intent).toBeNull();
  });

  it("surfaces live-dry-run account metric blockers without creating orders", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "live_dry_run",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });

    expect(preview.validation?.status).toBe("rejected");
    expect(preview.validationReasons).toContain("available_funds_unknown");
    expect(preview.openOrders).toEqual([]);
    expect(state.orderPreview.status).toBe("validation_failed");
    expect(state.orderPreview.validationReasons).toContain("available_funds_unknown");
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("keeps live submit disabled until explicit acknowledgement and every live gate pass", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const liveWithoutAck = {
      ...selectOrderEntryExecutionMode(createInitialOrderEntryState(), "live"),
      legalGateStatus: "approved" as const,
      geoGateStatus: "approved" as const,
      credentialStatus: "ready" as const,
      localApprovalStatus: "approved" as const,
      accountMetricsSourceStatus: "ready" as const,
      availableFunds: "100",
      providerExposure: { polymarket: "0", kalshi: "0" },
      marketExposure: { "pm-election-2026": "0" },
      c1ApprovalStatus: "approved" as const,
      positionStatus: "available" as const,
      liveProviderAdapterConfigured: true,
    };
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry: liveWithoutAck,
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });

    expect(preview.validation?.status).toBe("rejected");
    expect(preview.validationReasons).toContain("first_live_ack_missing");
    expect(state.execution.liveAcknowledgement.acknowledged).toBe(false);
    expect(state.orderPreview.canSubmitLive).toBe(false);
    expect(createLiveGateBlockers(preview)).toContain("first_live_ack_missing");
  });

  it("marks live submit ready only for an approved minimal BUY intent with all gates present", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const liveReady = createLiveReadyOrderEntry();
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry: liveReady,
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });

    expect(preview.validation?.status).toBe("approved");
    expect(createLiveGateBlockers(preview)).toEqual([]);
    expect(state.orderPreview.canSubmitLive).toBe(true);
    expect(state.orderPreview.canSubmitLocal).toBe(false);
    expect(state.execution.modes.find((mode) => mode.id === "live")).toMatchObject({
      availability: "ready_to_submit",
      blockingReasons: [],
    });
    expect(canSubmitOrders(state)).toBe(true);
    expect(state.gates.find((gate) => gate.id === "live")?.state).toBe("approved");
  });

  it("keeps Tauri-owned live gate status authoritative over a renderer-ready model", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "bid",
      eventFactory: eventFactory(),
      orderEntry: createLiveReadyOrderEntry(),
      price: "0.50",
      workflow,
    });
    const state = createDesktopTerminalState({
      workflow,
      orderEntry: preview,
      liveGateStatus: blockedTauriLiveGateStatus([
        "account_metrics_source_missing",
        "account_metrics_values_source_missing",
        "credential_source_missing",
      ]),
    });

    expect(preview.validation?.status).toBe("approved");
    expect(createLiveGateBlockers(preview)).toEqual([]);
    expect(
      createLiveGateBlockers(
        preview,
        blockedTauriLiveGateStatus(["credential_source_missing"]),
      ),
    ).toContain("credential_source_missing");
    expect(state.orderPreview.canSubmitLive).toBe(false);
    expect(canSubmitOrders(state)).toBe(false);
    expect(state.boundary.liveExecutionPathExposed).toBe(false);
    expect(state.gates.find((gate) => gate.id === "credential")?.reasons).toContain(
      "credential_source_missing",
    );
    expect(state.gates.find((gate) => gate.id === "account_metrics")?.reasons).toContain(
      "account_metrics_source_missing",
    );
    expect(state.gates.find((gate) => gate.id === "account_metrics")?.reasons).toContain(
      "account_metrics_values_source_missing",
    );
    expect(state.gates.find((gate) => gate.id === "live")?.reasons).toEqual([
      "account_metrics_source_missing",
      "account_metrics_values_source_missing",
      "credential_source_missing",
    ]);
  });

  it("rejects Lay previews when position availability is unknown", async () => {
    const auditLog = createInMemoryAuditLog();
    const workflow = createFreshWorkflow();
    const orderEntry = selectOrderEntryExecutionMode(
      createInitialOrderEntryState(),
      "paper",
    );
    const preview = await previewOrderFromLadderCell({
      auditLog,
      column: "ask",
      eventFactory: eventFactory(),
      orderEntry,
      price: "0.52",
      workflow,
    });
    const state = createDesktopTerminalState({ workflow, orderEntry: preview });

    expect(preview.latestIntent?.side).toBe("SELL");
    expect(preview.validation?.status).toBe("rejected");
    expect(preview.validationReasons).toContain("position_unknown");
    expect(state.orderPreview.canSubmitLocal).toBe(false);
  });

  it("redacts secret-like audit metadata before the renderer state can display it", async () => {
    const auditLog = createInMemoryAuditLog();
    const factory = eventFactory();

    await auditLog.append(
      factory({
        type: "mode_gate_status",
        executionMode: "paper",
        status: "ok",
        metadata: {
          apiSecret: "must-not-render",
          authHeader: "Bearer must-not-render",
          publicValue: "visible",
        },
      }),
    );

    const state = createDesktopTerminalState({
      workflow: createFreshWorkflow(),
      orderEntry: {
        ...createInitialOrderEntryState(),
        auditEvents: await auditLog.listRecent(),
      },
    });
    const serialized = JSON.stringify(state);

    expect(serialized).toContain("visible");
    expect(serialized).toContain("[redacted]");
    expect(serialized).not.toContain("must-not-render");
  });
});

function eventFactory(idPrefix = "intent") {
  return createDeterministicAuditEventFactory({
    idPrefix,
    timestamp: "2026-06-04T09:00:00.000Z",
  });
}

function createLiveReadyOrderEntry() {
  return {
    ...selectOrderEntryExecutionMode(createInitialOrderEntryState(), "live"),
    legalGateStatus: "approved" as const,
    geoGateStatus: "approved" as const,
    credentialStatus: "ready" as const,
    localApprovalStatus: "approved" as const,
    firstLiveAck: true,
    accountMetricsSourceStatus: "ready" as const,
    availableFunds: "100",
    providerExposure: { polymarket: "0", kalshi: "0" },
    marketExposure: { "pm-election-2026": "0" },
    c1ApprovalStatus: "approved" as const,
    positionStatus: "available" as const,
    liveProviderAdapterConfigured: true,
  };
}

function blockedTauriLiveGateStatus(
  reasons: readonly string[],
): LiveGateStatusCommandResponse {
  return {
    command: "live_gate_status",
    providerId: "polymarket",
    status: "blocked",
    message: `Live is blocked by: ${reasons.join(", ")}.`,
    secretFree: true,
    ready: false,
    reasons,
    localApprovalLoaded: true,
    credentialSourceReady: !reasons.includes("credential_source_missing"),
    accountMetricsSourceReady: !reasons.includes("account_metrics_source_missing"),
    liveTradingEnabled: true,
    legalGateStatus: "APPROVED",
  };
}

function createFreshWorkflow(): MarketDataWorkflowState {
  const market = createMarket();
  const outcome = market.outcomes[0]!;

  return {
    query: "",
    providerFilter: "all",
    search: createSearchResponse([market]),
    selected: { market, outcome },
    orderBook: createOrderBookResponse(),
    subscription: createSubscribeResponse(),
  };
}

function createNoSelectionWorkflow(): MarketDataWorkflowState {
  return {
    ...createFreshWorkflow(),
    selected: null,
    orderBook: null,
    subscription: null,
  };
}

function createSelectedWithoutBookWorkflow(): MarketDataWorkflowState {
  return {
    ...createFreshWorkflow(),
    orderBook: null,
    subscription: null,
  };
}

function createSearchResponse(
  markets: readonly RendererMarketSearchResult[],
): MarketSearchCommandResponse {
  return {
    command: "market_search",
    status: "connected",
    freshness: "fresh",
    connectionMode: "polling_fallback",
    message: "Unified read-only market search returned normalized results.",
    secretFree: true,
    markets,
    providerStates: [],
    providerIds: ["polymarket", "kalshi"],
    hasMore: false,
  };
}

function createMarket(): RendererMarketSearchResult {
  return {
    providerId: "polymarket",
    marketId: "pm-election-2026",
    title: "Will the Fed cut rates in June 2026?",
    status: "open",
    outcomes: [
      {
        providerId: "polymarket",
        marketId: "pm-election-2026",
        outcomeId: "pm-token-yes",
        label: "Yes",
        status: "tradable",
      },
    ],
  };
}

function createOrderBookResponse(): MarketGetOrderBookCommandResponse {
  return {
    command: "market_get_order_book",
    providerId: "polymarket",
    marketId: "pm-election-2026",
    outcomeId: "pm-token-yes",
    status: "connected",
    freshness: "fresh",
    connectionMode: "snapshot",
    message: "Normalized official provider snapshot loaded.",
    secretFree: true,
    sourceKind: "official_live",
    orderBook: {
      marketRef: {
        providerId: "polymarket",
        marketId: "pm-election-2026",
        outcomeId: "pm-token-yes",
        currency: "USDC",
        tickSize: "0.01",
        marketStatus: "open",
        freshness: "fresh",
      },
      capturedAt: "2026-06-04T09:00:00.000Z",
      bids: [
        { price: "0.49", size: "7" },
        { price: "0.50", size: "12" },
      ],
      asks: [
        { price: "0.52", size: "5" },
        { price: "0.53", size: "8" },
      ],
      tickSize: "0.01",
      freshness: "fresh",
      connectionMode: "snapshot",
    },
  };
}

function createSubscribeResponse(): MarketSubscribeCommandResponse {
  return {
    command: "market_subscribe",
    providerId: "polymarket",
    marketId: "pm-election-2026",
    outcomeId: "pm-token-yes",
    status: "unavailable",
    freshness: "disconnected",
    connectionMode: "streaming",
    message: "Polymarket stream unavailable in this command path.",
    secretFree: true,
    errorReason: "not_implemented",
  };
}
