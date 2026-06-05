import type { ProviderId } from "@prediction-ladder/core";
import { invoke } from "@tauri-apps/api/core";

export type LiveGateStatusCommandRequest = {
  providerId: ProviderId;
  explicitLiveAck: boolean;
  auditLogEnabled: boolean;
  killSwitchActive: boolean;
};

export type LiveGateStatusCommandResponse = {
  command: "live_gate_status";
  providerId: ProviderId;
  status: "ready" | "blocked" | "unavailable" | "provider-error";
  message: string;
  secretFree: true;
  ready: boolean;
  reasons: readonly string[];
  localApprovalLoaded: boolean;
  credentialSourceReady: boolean;
  accountMetricsSourceReady: boolean;
  liveTradingEnabled: boolean;
  legalGateStatus: string;
};

export type LegalApprovalStatusCommandRequest = {
  providerId: ProviderId;
};

export type LegalApprovalLimits = {
  maxStakeFirstOrder: string;
  maxMarketExposure: string;
};

export type LegalApprovalStatusCommandResponse = {
  command: "legal_approval_status";
  providerId: ProviderId;
  status: "ready" | "blocked" | "unavailable" | "provider-error" | string;
  message: string;
  secretFree: true;
  ready: boolean;
  reasons: readonly string[];
  localApprovalLoaded: boolean;
  legalGateStatus: string;
  approvalSource: string;
  limits?: LegalApprovalLimits;
  approvedAt?: string;
};

export type LegalApprovalSubmitRequest = {
  providerId: ProviderId;
  targetJurisdiction: string;
  operatorIdentity: string;
  approver: string;
  maxStakeFirstOrder: string;
  maxMarketExposure: string;
  checks: {
    platformEligible: boolean;
    realOperator: boolean;
    realBeneficialOwners: boolean;
    realAccountOwner: boolean;
    noGeoblockBypass: boolean;
    noVpnBypass: boolean;
    noFakeKyc: boolean;
    noSanctionsBypass: boolean;
    noCustody: boolean;
    c0ReviewPass: boolean;
    c1RiskAccepted: boolean;
    auditEnabled: boolean;
    firstLiveSmokeOnly: boolean;
    noDepositsOrWithdrawals: boolean;
    understandsRisk: boolean;
  };
};

export type LiveOrderSubmitRequest = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
  side: "BUY" | "SELL" | string;
  orderType: "limit" | string;
  timeInForce: "GTC" | string;
  price: string;
  stakeAmount: string;
  stakeCurrency: string;
  quantity: string;
  marketable: boolean;
  explicitLiveAck: boolean;
  auditLogEnabled: boolean;
  killSwitchActive: boolean;
  selectedMarket: boolean;
  orderBookFreshness: string;
  maxStakePerOrder: string;
  maxMarketExposure: string;
  minOrderSize?: string;
  availableFunds?: string;
  providerExposure?: string;
  marketExposure?: string;
};

export type CancelOrderRequest = {
  providerId: ProviderId;
  providerOrderId: string;
  marketId?: string;
};

export type LiveOrderCommandResponse = {
  command: "order_submit_live" | "order_cancel";
  providerId: ProviderId;
  status: "submitted" | "cancelled" | "blocked" | "rejected" | "failed" | "unavailable" | "provider-error" | string;
  message: string;
  secretFree: true;
  submittedExternally: boolean;
  reasons: readonly string[];
  providerOrderId?: string;
  auditEventType?: string;
};

export type LiveExecutionCommandClient = {
  liveGateStatus: (
    request: LiveGateStatusCommandRequest,
  ) => Promise<LiveGateStatusCommandResponse>;
  legalApprovalStatus: (
    request: LegalApprovalStatusCommandRequest,
  ) => Promise<LegalApprovalStatusCommandResponse>;
  legalApprovalSubmit: (
    request: LegalApprovalSubmitRequest,
  ) => Promise<LegalApprovalStatusCommandResponse>;
  orderSubmitLive: (
    request: LiveOrderSubmitRequest,
  ) => Promise<LiveOrderCommandResponse>;
  orderCancel: (
    request: CancelOrderRequest,
  ) => Promise<LiveOrderCommandResponse>;
};

export const tauriLiveExecutionCommandClient: LiveExecutionCommandClient = {
  async liveGateStatus(request) {
    if (!isTauriInvokeAvailable()) {
      return createLiveGateStatusUnavailableResponse(request);
    }

    try {
      return await invoke<LiveGateStatusCommandResponse>("live_gate_status", {
        request,
      });
    } catch {
      return createLiveGateStatusErrorResponse(request);
    }
  },

  async legalApprovalStatus(request) {
    if (!isTauriInvokeAvailable()) {
      return createLegalApprovalUnavailableResponse(request);
    }

    try {
      return await invoke<LegalApprovalStatusCommandResponse>(
        "legal_approval_status",
        { request },
      );
    } catch {
      return createLegalApprovalErrorResponse(request);
    }
  },

  async legalApprovalSubmit(request) {
    if (!isTauriInvokeAvailable()) {
      return createLegalApprovalUnavailableResponse({
        providerId: request.providerId,
      });
    }

    try {
      return await invoke<LegalApprovalStatusCommandResponse>(
        "legal_approval_submit",
        { request },
      );
    } catch {
      return createLegalApprovalErrorResponse({
        providerId: request.providerId,
      });
    }
  },

  async orderSubmitLive(request) {
    if (!isTauriInvokeAvailable()) {
      return createLiveOrderUnavailableResponse("order_submit_live", request.providerId);
    }

    try {
      return await invoke<LiveOrderCommandResponse>("order_submit_live", {
        request,
      });
    } catch {
      return createLiveOrderErrorResponse("order_submit_live", request.providerId);
    }
  },

  async orderCancel(request) {
    if (!isTauriInvokeAvailable()) {
      return createLiveOrderUnavailableResponse("order_cancel", request.providerId);
    }

    try {
      return await invoke<LiveOrderCommandResponse>("order_cancel", {
        request,
      });
    } catch {
      return createLiveOrderErrorResponse("order_cancel", request.providerId);
    }
  },
};

export function createLiveGateStatusUnavailableResponse(
  request: LiveGateStatusCommandRequest,
): LiveGateStatusCommandResponse {
  return {
    command: "live_gate_status",
    providerId: request.providerId,
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; live gate readiness must come from the desktop main process.",
    secretFree: true,
    ready: false,
    reasons: ["tauri_command_bridge_unavailable"],
    localApprovalLoaded: false,
    credentialSourceReady: false,
    accountMetricsSourceReady: false,
    liveTradingEnabled: false,
    legalGateStatus: "UNKNOWN",
  };
}

function createLiveGateStatusErrorResponse(
  request: LiveGateStatusCommandRequest,
): LiveGateStatusCommandResponse {
  return {
    command: "live_gate_status",
    providerId: request.providerId,
    status: "provider-error",
    message:
      "Tauri live_gate_status failed before returning a secret-free gate state.",
    secretFree: true,
    ready: false,
    reasons: ["tauri_live_gate_status_error"],
    localApprovalLoaded: false,
    credentialSourceReady: false,
    accountMetricsSourceReady: false,
    liveTradingEnabled: false,
    legalGateStatus: "UNKNOWN",
  };
}

export function createLegalApprovalUnavailableResponse(
  request: LegalApprovalStatusCommandRequest,
): LegalApprovalStatusCommandResponse {
  return {
    command: "legal_approval_status",
    providerId: request.providerId,
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; legal approval must be created by the desktop main process.",
    secretFree: true,
    ready: false,
    reasons: ["tauri_command_bridge_unavailable"],
    localApprovalLoaded: false,
    legalGateStatus: "UNKNOWN",
    approvalSource: "tauri_local_approval_file",
  };
}

function createLegalApprovalErrorResponse(
  request: LegalApprovalStatusCommandRequest,
): LegalApprovalStatusCommandResponse {
  return {
    ...createLegalApprovalUnavailableResponse(request),
    status: "provider-error",
    message:
      "Tauri legal approval command failed before returning a secret-free gate state.",
    reasons: ["tauri_legal_approval_error"],
  };
}

export function createLiveOrderUnavailableResponse(
  command: LiveOrderCommandResponse["command"],
  providerId: ProviderId,
): LiveOrderCommandResponse {
  return {
    command,
    providerId,
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; live order placement and cancellation must stay in the desktop main process.",
    secretFree: true,
    submittedExternally: false,
    reasons: ["tauri_command_bridge_unavailable"],
    auditEventType: "validation_failed",
  };
}

function createLiveOrderErrorResponse(
  command: LiveOrderCommandResponse["command"],
  providerId: ProviderId,
): LiveOrderCommandResponse {
  return {
    ...createLiveOrderUnavailableResponse(command, providerId),
    status: "provider-error",
    message:
      "Tauri live order command failed before returning a secret-free result.",
    reasons: ["tauri_live_order_command_error"],
  };
}

function isTauriInvokeAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
