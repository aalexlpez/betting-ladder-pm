import { describe, expect, it } from "vitest";

import { PROVIDER_IDS, type NormalizedOrderBookSnapshot } from "@prediction-ladder/core";
import {
  createFixtureMarketDataSource,
  type MarketDataResult,
} from "@prediction-ladder/market-data";

import {
  canSubmitOrders,
  createDesktopTerminalState,
  desktopExecutionModeIds,
  desktopMarketConnectionStateIds,
  getDesktopShellSafetyEvidence,
  providerIds,
  requiredLadderStateIds,
} from "./appConfig";

describe("desktop terminal shell model", () => {
  it("keeps Polymarket and Kalshi in the provider-ready surface list", () => {
    expect(providerIds).toEqual(["polymarket", "kalshi"]);
    expect(providerIds).toBe(PROVIDER_IDS);

    const state = createDesktopTerminalState();

    expect(state.providers.map((provider) => provider.id)).toEqual([
      "polymarket",
      "kalshi",
    ]);
    expect(state.providers.every((provider) => provider.adapterStatus)).toBe(true);
    expect(state.providers.every((provider) => provider.connectionStatus)).toBe(true);
  });

  it("defaults to disabled execution and one-click off", () => {
    const state = createDesktopTerminalState();

    expect(desktopExecutionModeIds).toEqual([
      "disabled",
      "paper",
      "live_dry_run",
      "live",
    ]);
    expect(state.execution.currentMode).toBe("disabled");
    expect(state.execution.oneClick.armed).toBe(false);
    expect(state.execution.oneClick.canArm).toBe(false);
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("describes Goal 05 paper and dry-run modes as implemented local harnesses", () => {
    const state = createDesktopTerminalState();
    const paper = state.execution.modes.find((mode) => mode.id === "paper");
    const dryRun = state.execution.modes.find(
      (mode) => mode.id === "live_dry_run",
    );
    const combinedCopy = [
      paper?.summary,
      dryRun?.summary,
      state.risk.summary,
      ...state.gates.map((gate) => gate.summary),
    ].join(" ");

    expect(paper?.canRunLocalHarness).toBe(true);
    expect(dryRun?.canRunLocalHarness).toBe(true);
    expect(paper?.summary).toContain("local paper order records");
    expect(dryRun?.summary).toContain("without external provider submission");
    expect(combinedCopy).not.toMatch(/pending Goal 05|later Goal 05|Goal 05 validation path/u);
  });

  it("models the required honest ladder states", () => {
    const state = createDesktopTerminalState();

    expect(requiredLadderStateIds).toEqual([
      "no_market",
      "loading",
      "fresh",
      "empty",
      "stale",
      "disconnected",
      "error",
    ]);
    expect(state.ladder.states.map((ladderState) => ladderState.id)).toEqual([
      "no_market",
      "loading",
      "fresh",
      "empty",
      "stale",
      "disconnected",
      "error",
    ]);
    expect(state.ladder.currentState).toBe("no_market");
    expect(state.ladder.rows.every((row) => row.price === null)).toBe(true);
  });

  it("models the required provider runtime connection states", () => {
    const state = createDesktopTerminalState();
    const evidence = getDesktopShellSafetyEvidence(state);

    expect(desktopMarketConnectionStateIds).toEqual([
      "connecting",
      "connected",
      "reconnecting",
      "stale",
      "disconnected",
      "invalid",
      "blocked",
      "credentials-required",
      "unavailable",
      "provider-error",
    ]);
    expect(evidence.modeledConnectionStates).toEqual(desktopMarketConnectionStateIds);
  });

  it("keeps live, risk, gate, and account placeholders explicit and fake-free", () => {
    const state = createDesktopTerminalState();
    const evidence = getDesktopShellSafetyEvidence(state);
    const liveGate = state.gates.find((gate) => gate.id === "live");

    expect(evidence.allMetricsUnknown).toBe(true);
    expect(evidence.noProviderMarketSearchCalls).toBe(true);
    expect(evidence.noOpenOrdersLoaded).toBe(true);
    expect(evidence.noAuditEventsLoaded).toBe(true);
    expect(evidence.noOrderSubmissionPath).toBe(true);
    expect(evidence.rendererPrivilegeFree).toBe(true);
    expect(state.gates.find((gate) => gate.id === "audit")?.blocksLive).toBe(false);
    expect(state.gates.find((gate) => gate.id === "live")?.blocksLive).toBe(true);
    expect(state.gates.map((gate) => gate.id)).toEqual([
      "legal",
      "geo",
      "credential",
      "local_approval",
      "acknowledgement",
      "account_metrics",
      "audit",
      "live",
    ]);
    expect(liveGate?.reasons).toContain("local_approval_missing");
    expect(liveGate?.reasons).toContain("first_live_ack_missing");
    expect(liveGate?.reasons).toContain("account_metrics_source_missing");
    expect(liveGate?.reasons).toContain("available_funds_unknown");
    expect(liveGate?.reasons).toContain("provider_live_adapter_not_configured");
    expect(state.execution.liveAcknowledgement.acknowledged).toBe(false);
    expect(state.orderPreview.canSubmit).toBe(false);
    expect(state.boundary.liveExecutionPathExposed).toBe(false);
  });

  it("projects Tauri onboarding and preflight blockers without enabling React live bypass", () => {
    const state = createDesktopTerminalState({
      providerOnboardingStatus: createOnboardingStatus(),
      livePreflightStatus: createBlockedPreflightStatus(),
    });
    const serialized = JSON.stringify(state);

    expect(state.providers.find((provider) => provider.id === "polymarket")?.credentialStatus).toBe(
      "ready",
    );
    expect(
      state.providers.find((provider) => provider.id === "polymarket")?.accountMetricsStatus,
    ).toBe("missing");
    expect(state.gates.find((gate) => gate.id === "account_metrics")?.reasons).toContain(
      "account_metrics_network_error",
    );
    expect(
      state.providerOnboarding.providers.find((provider) => provider.providerId === "kalshi")
        ?.reasons,
    ).toContain("kalshi_key_file_missing");
    expect(state.gates.find((gate) => gate.id === "credential")?.reasons).toContain(
      "credentials_missing",
    );
    expect(canSubmitOrders(state)).toBe(false);
    expect(state.boundary.rendererCredentialAccess).toBe(false);
    expect(serialized).not.toMatch(
      /apiSecret|authHeader|signedPayload|seedPhrase|walletAddress|PRIVATE KEY|C:\\\\keys/u,
    );
  });

  it("uses Tauri legal approval status instead of placeholder legal blockers", () => {
    const state = createDesktopTerminalState({
      liveGateStatus: createLegalApprovedLiveGateStatus(),
      livePreflightStatus: createReadyMetricsPreflightStatus(),
    });

    expect(state.gates.find((gate) => gate.id === "legal")).toMatchObject({
      state: "approved",
      blocksLive: false,
      reasons: [],
    });
    expect(state.gates.find((gate) => gate.id === "local_approval")).toMatchObject({
      state: "approved",
      blocksLive: false,
      reasons: [],
    });
    expect(state.gates.find((gate) => gate.id === "geo")).toMatchObject({
      state: "approved",
      blocksLive: false,
      reasons: [],
    });
    expect(state.gates.find((gate) => gate.id === "live")?.reasons).toContain(
      "provider_live_adapter_not_configured",
    );
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("labels market setup blockers separately from base live gate blockers", () => {
    const state = createDesktopTerminalState({
      liveGateStatus: createReadyLiveGateStatus(),
      livePreflightStatus: createMarketSetupPreflightStatus(),
    });
    const liveMode = state.execution.modes.find((mode) => mode.id === "live");

    expect(liveMode?.availability).toBe("needs_market");
    expect(liveMode?.availability).not.toBe("blocked_by_gates");
    expect(liveMode?.blockingReasons).toEqual([
      "selected_market_missing",
      "fresh_official_order_book_missing",
    ]);
    expect(state.gates.find((gate) => gate.id === "legal")).toMatchObject({
      state: "approved",
      blocksLive: false,
      reasons: [],
    });
  });

  it("renders Tauri-owned account metrics only when preflight marks them ready", () => {
    const state = createDesktopTerminalState({
      livePreflightStatus: createReadyMetricsPreflightStatus(),
    });
    const providerMetrics = state.metrics.find((group) => group.scope === "provider");
    const marketMetrics = state.metrics.find((group) => group.scope === "market");

    expect(providerMetrics?.metrics.find((metric) => metric.key === "available_funds")).toMatchObject({
      status: "ready",
      displayValue: "100 USDC",
    });
    expect(providerMetrics?.metrics.find((metric) => metric.key === "exposure")).toMatchObject({
      status: "ready",
      displayValue: "5 USDC",
    });
    expect(providerMetrics?.metrics.find((metric) => metric.key === "open_order_amount")).toMatchObject({
      status: "ready",
      displayValue: "3 USDC",
    });
    expect(marketMetrics?.metrics.find((metric) => metric.key === "exposure")).toMatchObject({
      status: "ready",
      displayValue: "2 USDC",
    });
    expect(marketMetrics?.metrics.find((metric) => metric.key === "open_order_amount")).toMatchObject({
      status: "ready",
      displayValue: "3 USDC",
    });
    expect(providerMetrics?.metrics.find((metric) => metric.key === "pnl")?.status).toBe(
      "unknown",
    );
  });

  it("consumes a normalized live snapshot without enabling order submission", () => {
    const state = createDesktopTerminalState({
      marketDataResult: createLiveSnapshotResult(),
      selectedMarketTitle: "Fed cut in June 2026",
    });

    expect(state.selectedProviderId).toBe("kalshi");
    expect(state.selectedMarket?.title).toBe("Fed cut in June 2026");
    expect(state.dataFreshness).toBe("fresh");
    expect(state.marketData.connectionStatus).toBe("connected");
    expect(state.ladder.currentState).toBe("fresh");
    expect(state.ladder.rows).toEqual([
      {
        level: 1,
        price: "0.53",
        askSize: "8",
        status: "provider_snapshot",
        isBestBid: false,
        isBestAsk: false,
      },
      {
        level: 2,
        price: "0.52",
        askSize: "5",
        status: "provider_snapshot",
        isBestBid: false,
        isBestAsk: true,
      },
      {
        level: 3,
        price: "0.5",
        bidSize: "12",
        status: "provider_snapshot",
        isBestBid: true,
        isBestAsk: false,
      },
      {
        level: 4,
        price: "0.49",
        bidSize: "7",
        status: "provider_snapshot",
        isBestBid: false,
        isBestAsk: false,
      },
    ]);
    expect(canSubmitOrders(state)).toBe(false);
    expect(state.execution.oneClick.armed).toBe(false);
    expect(state.execution.currentMode).toBe("disabled");
  });

  it("blocks fixture snapshots from appearing as live provider data", () => {
    const liveResult = createLiveSnapshotResult();

    if (!liveResult.ok) {
      throw new Error("Expected live fixture helper to return ok");
    }

    const state = createDesktopTerminalState({
      marketDataResult: {
        ...liveResult,
        value: {
          ...liveResult.value,
          source: createFixtureMarketDataSource("kalshi-orderbook"),
        },
      },
    });

    expect(state.marketData.status).toBe("non_live_fixture");
    expect(state.dataFreshness).toBe("invalid");
    expect(state.ladder.currentState).toBe("error");
    expect(state.ladder.rows.every((row) => row.price === null)).toBe(true);
    expect(canSubmitOrders(state)).toBe(false);
  });

  it("keeps provider-specific error states on the correct venue", () => {
    const state = createDesktopTerminalState({
      marketDataResult: {
        ok: false,
        error: {
          reason: "provider_credentials_required",
          message: "Kalshi WebSocket authentication is required.",
          providerMetadata: { providerId: "kalshi" },
        },
      },
    });

    expect(state.selectedProviderId).toBe("kalshi");
    expect(state.marketData.status).toBe("credentials-required");
    expect(state.marketData.connectionStatus).toBe("credentials-required");
    expect(state.providers.find((provider) => provider.id === "kalshi")?.connectionStatus).toBe(
      "credentials-required",
    );
    expect(state.providers.find((provider) => provider.id === "polymarket")?.connectionStatus).toBe(
      "disconnected",
    );
    expect(canSubmitOrders(state)).toBe(false);
  });
});

function createLiveSnapshotResult(): MarketDataResult<NormalizedOrderBookSnapshot> {
  const marketRef = {
    providerId: "kalshi",
    marketId: "KX-FEDCUT-26JUN",
    outcomeId: "yes",
    currency: "USD",
    tickSize: "0.01",
    marketStatus: "open",
    freshness: "fresh",
  } as const;

  return {
    ok: true,
    value: {
      data: {
        marketRef,
        capturedAt: "2026-06-03T10:00:00.000Z",
        bids: [
          { price: "0.49", size: "7" },
          { price: "0.50", size: "12" },
        ],
        asks: [
          { price: "0.53", size: "8" },
          { price: "0.52", size: "5" },
        ],
        tickSize: "0.01",
        freshness: "fresh",
        connectionMode: "snapshot",
        providerMetadata: { sourceShape: "kalshi_yes_no_book" },
      },
      source: {
        kind: "official_live",
        fetchedAt: "2026-06-03T10:00:05.000Z",
      },
      freshness: "fresh",
      connectionMode: "snapshot",
    },
  };
}

function createOnboardingStatus() {
  return {
    command: "provider_onboarding_status" as const,
    status: "partial" as const,
    message: "1/2 provider credential profiles are ready for secret-free preflight.",
    secretFree: true as const,
    providers: [
      {
        providerId: "polymarket" as const,
        label: "Polymarket",
        credential: {
          status: "ready",
          source: "explicit_local_provider",
          message: "Polymarket local signer is available to Tauri.",
          reasons: [],
          maskedIdentifier: "local-signer:configured",
          checkedAt: "2026-06-04T10:00:00.000Z",
        },
        accountMetrics: {
          status: "missing",
          source: "provider_owned_account_metrics",
          message: "Polymarket account metrics request failed before a confirmed provider response.",
          reasons: ["account_metrics_network_error"],
          checkedAt: "2026-06-04T10:00:00.000Z",
        },
        liveAdapterStatus: "not_configured",
        readyForPreflight: false,
        reasons: [
          "account_metrics_network_error",
          "provider_live_adapter_not_configured",
        ],
      },
      {
        providerId: "kalshi" as const,
        label: "Kalshi",
        credential: {
          status: "missing",
          source: "explicit_local_provider",
          message: "Kalshi local .key file is not configured.",
          reasons: ["kalshi_key_file_missing"],
          checkedAt: "2026-06-04T10:00:00.000Z",
        },
        accountMetrics: {
          status: "missing",
          source: "provider_owned_account_metrics",
          message: "Kalshi account metrics require credentials.",
          reasons: ["credentials_missing"],
          checkedAt: "2026-06-04T10:00:00.000Z",
        },
        liveAdapterStatus: "not_configured",
        readyForPreflight: false,
        reasons: ["kalshi_key_file_missing", "provider_live_adapter_not_configured"],
      },
    ],
  };
}

function createBlockedPreflightStatus() {
  return {
    command: "live_preflight_status" as const,
    status: "blocked" as const,
    message: "Live preflight is blocked; 0/2 providers are ready.",
    secretFree: true as const,
    ready: false,
    providers: [
      {
        providerId: "polymarket" as const,
        status: "blocked",
        ready: false,
        reasons: [
          "account_metrics_network_error",
          "provider_live_adapter_not_configured",
        ],
        message:
          "Polymarket preflight is blocked by: account_metrics_network_error, provider_live_adapter_not_configured.",
        credential: createOnboardingStatus().providers[0]!.credential,
        accountMetrics: createOnboardingStatus().providers[0]!.accountMetrics,
        gates: [],
      },
      {
        providerId: "kalshi" as const,
        status: "blocked",
        ready: false,
        reasons: ["kalshi_key_file_missing", "provider_live_adapter_not_configured"],
        message:
          "Kalshi preflight is blocked by: kalshi_key_file_missing, provider_live_adapter_not_configured.",
        credential: createOnboardingStatus().providers[1]!.credential,
        accountMetrics: createOnboardingStatus().providers[1]!.accountMetrics,
        gates: [],
      },
    ],
  };
}

function createLegalApprovedLiveGateStatus() {
  return {
    command: "live_gate_status" as const,
    providerId: "polymarket" as const,
    status: "blocked" as const,
    message:
      "Live is blocked by: credential_source_missing, provider_live_adapter_not_configured.",
    secretFree: true as const,
    ready: false,
    reasons: [
      "credential_source_missing",
      "provider_live_adapter_not_configured",
    ],
    localApprovalLoaded: true,
    credentialSourceReady: false,
    accountMetricsSourceReady: true,
    liveTradingEnabled: true,
    legalGateStatus: "APPROVED",
  };
}

function createReadyLiveGateStatus() {
  return {
    command: "live_gate_status" as const,
    providerId: "polymarket" as const,
    status: "ready" as const,
    message: "Live gate is ready for Polymarket.",
    secretFree: true as const,
    ready: true,
    reasons: [],
    localApprovalLoaded: true,
    credentialSourceReady: true,
    accountMetricsSourceReady: true,
    liveTradingEnabled: true,
    legalGateStatus: "APPROVED",
  };
}

function createMarketSetupPreflightStatus() {
  const readyOnboarding = createOnboardingStatus().providers[0]!;

  return {
    command: "live_preflight_status" as const,
    status: "blocked" as const,
    message: "Live preflight is waiting for a selected fresh market.",
    secretFree: true as const,
    ready: false,
    providers: [
      {
        providerId: "polymarket" as const,
        status: "blocked",
        ready: false,
        reasons: [
          "selected_market_missing",
          "fresh_official_order_book_missing",
        ],
        message:
          "Polymarket preflight is blocked by: selected_market_missing, fresh_official_order_book_missing.",
        credential: {
          ...readyOnboarding.credential,
          status: "ready",
          reasons: [],
        },
        accountMetrics: {
          status: "ready",
          source: "provider_owned_account_metrics",
          message: "Authenticated account metrics loaded.",
          reasons: [],
          checkedAt: "2026-06-04T10:00:00.000Z",
          availableFunds: { amount: "5", currency: "USDC" },
          providerExposure: { amount: "0", currency: "USDC" },
          marketExposure: { amount: "0", currency: "USDC" },
          openOrderAmount: { amount: "0", currency: "USDC" },
          positionExposure: { amount: "0", currency: "USDC" },
        },
        gates: [],
      },
    ],
  };
}

function createReadyMetricsPreflightStatus() {
  return {
    command: "live_preflight_status" as const,
    status: "blocked" as const,
    message: "Live preflight is blocked; account metrics are loaded for display.",
    secretFree: true as const,
    ready: false,
    providers: [
      {
        providerId: "polymarket" as const,
        status: "blocked",
        ready: false,
        reasons: ["provider_live_adapter_not_configured"],
        message:
          "Polymarket preflight is blocked by: provider_live_adapter_not_configured.",
        credential: {
          status: "ready",
          source: "explicit_local_provider",
          message: "Polymarket credential profile is ready.",
          reasons: [],
          checkedAt: "2026-06-04T10:00:00.000Z",
        },
        accountMetrics: {
          status: "ready",
          source: "provider_owned_account_metrics",
          message: "Authenticated account metrics loaded.",
          reasons: [],
          checkedAt: "2026-06-04T10:00:00.000Z",
          availableFunds: { amount: "100", currency: "USDC" },
          providerExposure: { amount: "5", currency: "USDC" },
          marketExposure: { amount: "2", currency: "USDC" },
          openOrderAmount: { amount: "3", currency: "USDC" },
          positionExposure: { amount: "2", currency: "USDC" },
        },
        gates: [],
      },
      {
        providerId: "kalshi" as const,
        status: "blocked",
        ready: false,
        reasons: ["selected_market_missing"],
        message: "Kalshi is not selected.",
        credential: createOnboardingStatus().providers[1]!.credential,
        accountMetrics: createOnboardingStatus().providers[1]!.accountMetrics,
        gates: [],
      },
    ],
  };
}
