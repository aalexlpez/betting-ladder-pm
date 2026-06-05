import { describe, expect, it } from "vitest";

import liveExecutionCommandsSource from "./liveExecutionCommands?raw";
import {
  createLegalApprovalUnavailableResponse,
  createLiveGateStatusUnavailableResponse,
  createLiveOrderUnavailableResponse,
  tauriLiveExecutionCommandClient,
  type LegalApprovalSubmitRequest,
  type LiveGateStatusCommandRequest,
  type LiveOrderSubmitRequest,
} from "./liveExecutionCommands";

describe("desktop live execution command client", () => {
  const request: LiveGateStatusCommandRequest = {
    providerId: "polymarket",
    explicitLiveAck: false,
    auditLogEnabled: true,
    killSwitchActive: false,
  };

  it("returns a secret-free blocked status when the Tauri bridge is unavailable", async () => {
    const response = await tauriLiveExecutionCommandClient.liveGateStatus(request);
    const serialized = JSON.stringify(response);

    expect(response.command).toBe("live_gate_status");
    expect(response.status).toBe("unavailable");
    expect(response.secretFree).toBe(true);
    expect(response.ready).toBe(false);
    expect(response.reasons).toEqual(["tauri_command_bridge_unavailable"]);
    expect(response.localApprovalLoaded).toBe(false);
    expect(response.credentialSourceReady).toBe(false);
    expect(response.accountMetricsSourceReady).toBe(false);
    expect(response.liveTradingEnabled).toBe(false);
    expect(serialized).not.toMatch(/authorization|authHeader|signedPayload|walletAddress|Bearer/u);
  });

  it("keeps renderer live execution plumbing Tauri-only and secret-free", () => {
    expect(Object.keys(tauriLiveExecutionCommandClient)).toEqual([
      "liveGateStatus",
      "legalApprovalStatus",
      "legalApprovalSubmit",
      "orderSubmitLive",
      "orderCancel",
    ]);
    expect(liveExecutionCommandsSource).toContain("live_gate_status");
    expect(liveExecutionCommandsSource).toContain("legal_approval_status");
    expect(liveExecutionCommandsSource).toContain("legal_approval_submit");
    expect(liveExecutionCommandsSource).toContain("order_submit_live");
    expect(liveExecutionCommandsSource).toContain("order_cancel");
    expect(liveExecutionCommandsSource).not.toMatch(/authorization|authHeader|signedPayload|walletAddress/u);
  });

  it("returns secret-free unavailable live submit and cancel outside Tauri", async () => {
    const submitRequest: LiveOrderSubmitRequest = {
      providerId: "polymarket",
      marketId: "pm-election-2026",
      outcomeId: "123456789",
      side: "BUY",
      orderType: "limit",
      timeInForce: "GTC",
      price: "0.50",
      stakeAmount: "5",
      stakeCurrency: "USDC",
      quantity: "10",
      marketable: false,
      explicitLiveAck: true,
      auditLogEnabled: true,
      killSwitchActive: false,
      selectedMarket: true,
      orderBookFreshness: "fresh",
      maxStakePerOrder: "5",
      maxMarketExposure: "25",
    };
    const submitted =
      await tauriLiveExecutionCommandClient.orderSubmitLive(submitRequest);
    const cancelled = await tauriLiveExecutionCommandClient.orderCancel({
      providerId: "polymarket",
      providerOrderId: "pm-live-order-1",
      marketId: "pm-election-2026",
    });
    const serialized = JSON.stringify([submitted, cancelled]);

    expect(submitted.command).toBe("order_submit_live");
    expect(cancelled.command).toBe("order_cancel");
    expect(submitted.submittedExternally).toBe(false);
    expect(cancelled.submittedExternally).toBe(false);
    expect(serialized).not.toMatch(
      /authorization|authHeader|signedPayload|walletAddress|PRIVATE KEY|apiSecret/u,
    );
  });

  it("returns secret-free unavailable legal approval outside Tauri", async () => {
    const response =
      await tauriLiveExecutionCommandClient.legalApprovalStatus({
        providerId: "polymarket",
      });
    const serialized = JSON.stringify(response);

    expect(response.command).toBe("legal_approval_status");
    expect(response.status).toBe("unavailable");
    expect(response.secretFree).toBe(true);
    expect(response.reasons).toEqual(["tauri_command_bridge_unavailable"]);
    expect(serialized).not.toMatch(
      /authorization|authHeader|signedPayload|walletAddress|PRIVATE KEY|apiSecret/u,
    );
  });

  it("keeps legal approval submit behind Tauri without exposing secrets", async () => {
    const request: LegalApprovalSubmitRequest = {
      providerId: "polymarket",
      targetJurisdiction: "approved-smoke-test-jurisdiction",
      operatorIdentity: "authorized operator",
      approver: "business owner",
      maxStakeFirstOrder: "5",
      maxMarketExposure: "25",
      checks: {
        platformEligible: true,
        realOperator: true,
        realBeneficialOwners: true,
        realAccountOwner: true,
        noGeoblockBypass: true,
        noVpnBypass: true,
        noFakeKyc: true,
        noSanctionsBypass: true,
        noCustody: true,
        c0ReviewPass: true,
        c1RiskAccepted: true,
        auditEnabled: true,
        firstLiveSmokeOnly: true,
        noDepositsOrWithdrawals: true,
        understandsRisk: true,
      },
    };
    const response =
      await tauriLiveExecutionCommandClient.legalApprovalSubmit(request);

    expect(response.command).toBe("legal_approval_status");
    expect(response.status).toBe("unavailable");
    expect(response.secretFree).toBe(true);
    expect(JSON.stringify(response)).not.toMatch(
      /authorization|authHeader|signedPayload|walletAddress|PRIVATE KEY|apiSecret/u,
    );
  });

  it("constructs the same unavailable status without invoking provider code", () => {
    expect(createLiveGateStatusUnavailableResponse(request)).toMatchObject({
      command: "live_gate_status",
      providerId: "polymarket",
      status: "unavailable",
      ready: false,
      secretFree: true,
      reasons: ["tauri_command_bridge_unavailable"],
    });
    expect(createLegalApprovalUnavailableResponse({ providerId: "kalshi" })).toMatchObject({
      command: "legal_approval_status",
      providerId: "kalshi",
      status: "unavailable",
      ready: false,
      secretFree: true,
    });
    expect(
      createLiveOrderUnavailableResponse("order_submit_live", "polymarket"),
    ).toMatchObject({
      command: "order_submit_live",
      providerId: "polymarket",
      status: "unavailable",
      submittedExternally: false,
      secretFree: true,
    });
  });
});
