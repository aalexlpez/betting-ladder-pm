import type { ProviderId } from "@prediction-ladder/core";
import { invoke } from "@tauri-apps/api/core";

export type ProviderMetricAmount = {
  amount: string;
  currency: string;
};

export type ProviderAccountCandidateStatus = {
  label: string;
  signatureType: string;
  configured: boolean;
  maskedIdentifier: string;
  status: "ready" | "missing" | "invalid" | "blocked" | "unknown" | string;
  reasons: readonly string[];
  publicPortfolioValue?: ProviderMetricAmount;
  tradeReadyCash?: ProviderMetricAmount;
  tradeReadyCashStatus?: "ready" | "missing" | "invalid" | "blocked" | "unknown" | string;
  tradeReadyCashReasons?: readonly string[];
  recommended?: boolean;
  recommendationReason?: string;
};

export type ProviderCredentialStatus = {
  status: "ready" | "missing" | "invalid" | "blocked" | string;
  source: string;
  message: string;
  reasons: readonly string[];
  maskedIdentifier?: string;
  checkedAt: string;
};

export type ProviderAccountMetricsStatus = {
  status: "ready" | "missing" | "invalid" | "blocked" | string;
  source: string;
  message: string;
  reasons: readonly string[];
  checkedAt: string;
  availableFunds?: ProviderMetricAmount;
  providerExposure?: ProviderMetricAmount;
  marketExposure?: ProviderMetricAmount;
  openOrderAmount?: ProviderMetricAmount;
  positionExposure?: ProviderMetricAmount;
  publicPortfolioValue?: ProviderMetricAmount;
  accountCandidates?: readonly ProviderAccountCandidateStatus[];
};

export type ProviderOnboardingProviderStatus = {
  providerId: ProviderId;
  label: string;
  credential: ProviderCredentialStatus;
  accountMetrics: ProviderAccountMetricsStatus;
  liveAdapterStatus: "configured" | "not_configured" | string;
  readyForPreflight: boolean;
  reasons: readonly string[];
};

export type ProviderOnboardingStatusCommandResponse = {
  command: "provider_onboarding_status";
  status: "ready" | "partial" | "blocked" | "unavailable" | "provider-error";
  message: string;
  secretFree: true;
  providers: readonly ProviderOnboardingProviderStatus[];
};

export type ProviderOnboardingStatusCommandRequest = {
  providerId?: ProviderId;
  marketId?: string;
};

export type ProviderCredentialReferenceId =
  | "polymarket_magic_export"
  | "polymarket_export_help"
  | "polymarket_pusd_docs"
  | "kalshi_profile"
  | "kalshi_api_keys";

export type ProviderCredentialReferenceOpenRequest = {
  providerId: ProviderId;
  referenceId: ProviderCredentialReferenceId;
};

export type ProviderCredentialReferenceOpenCommandResponse = {
  command: "provider_open_credential_reference";
  providerId: ProviderId;
  referenceId: ProviderCredentialReferenceId;
  status: "opened" | "blocked" | "unavailable" | "provider-error" | string;
  message: string;
  secretFree: true;
  openedUrl?: string;
};

export type PolymarketSignatureType =
  | "eoa"
  | "proxy"
  | "gnosis_safe"
  | "poly_1271";

export type PolymarketSignerClipboardImportRequest = {
  polymarketTradingAddress?: string;
  polymarketSignatureType: PolymarketSignatureType;
};

export type PolymarketAccountCandidateApplyRequest = {
  label: string;
  signatureType: PolymarketSignatureType;
};

export function selectPolymarketAutoApplyCandidate(
  response: ProviderOnboardingStatusCommandResponse,
): PolymarketAccountCandidateApplyRequest | null {
  const provider = response.providers.find(
    (status) => status.providerId === "polymarket",
  );
  const candidates = provider?.accountMetrics.accountCandidates ?? [];
  const eligible = candidates.filter(
    (candidate) =>
      candidate.recommended === true &&
      !candidate.configured &&
      isPolymarketSignatureType(candidate.signatureType) &&
      hasPositiveProviderMetricAmount(candidate.tradeReadyCash),
  );

  if (eligible.length !== 1) {
    return null;
  }

  const candidate = eligible[0];
  if (candidate === undefined) {
    return null;
  }

  return {
    label: candidate.label,
    signatureType: candidate.signatureType as PolymarketSignatureType,
  };
}

export function hasPositiveProviderMetricAmount(
  metric: ProviderMetricAmount | undefined,
): boolean {
  if (metric === undefined) {
    return false;
  }

  const normalized = metric.amount.trim();
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) {
    return false;
  }

  return normalized.replace(".", "").split("").some((digit) => digit !== "0");
}

function isPolymarketSignatureType(value: string): value is PolymarketSignatureType {
  return (
    value === "eoa" ||
    value === "proxy" ||
    value === "gnosis_safe" ||
    value === "poly_1271"
  );
}

export type ProviderCredentialConnectRequest =
  | {
      providerId: "polymarket";
      credentialSource: "explicit_local_provider";
      polymarketSignerFilePath: string;
      polymarketTradingAddress?: string;
      polymarketSignatureType: PolymarketSignatureType;
    }
  | {
      providerId: "kalshi";
      credentialSource: "explicit_local_provider";
      kalshiApiKeyId: string;
      kalshiKeyFilePath: string;
    };

export type LivePreflightGateStatus = {
  id: string;
  status: "ready" | "blocked" | string;
  blocksLive: boolean;
  reasons: readonly string[];
};

export type LivePreflightProviderStatus = {
  providerId: ProviderId;
  status: "ready" | "blocked" | string;
  ready: boolean;
  reasons: readonly string[];
  message: string;
  credential: ProviderCredentialStatus;
  accountMetrics: ProviderAccountMetricsStatus;
  gates: readonly LivePreflightGateStatus[];
};

export type LivePreflightStatusCommandRequest = {
  providerId?: ProviderId;
  marketId?: string;
  outcomeId?: string;
  selectedMarket: boolean;
  orderBookFreshness?: string;
  explicitLiveAck: boolean;
  auditLogEnabled: boolean;
  killSwitchActive: boolean;
  stakeAmount?: string;
  maxStakePerOrder?: string;
  maxMarketExposure?: string;
  nonMarketable: boolean;
};

export type LivePreflightStatusCommandResponse = {
  command: "live_preflight_status";
  status: "ready" | "blocked" | "unavailable" | "provider-error" | string;
  message: string;
  secretFree: true;
  ready: boolean;
  providers: readonly LivePreflightProviderStatus[];
};

export type ProviderOnboardingCommandClient = {
  status: (
    request?: ProviderOnboardingStatusCommandRequest,
  ) => Promise<ProviderOnboardingStatusCommandResponse>;
  connect: (
    request: ProviderCredentialConnectRequest,
  ) => Promise<ProviderOnboardingStatusCommandResponse>;
  openCredentialReference: (
    request: ProviderCredentialReferenceOpenRequest,
  ) => Promise<ProviderCredentialReferenceOpenCommandResponse>;
  importPolymarketSignerFromClipboard: (
    request: PolymarketSignerClipboardImportRequest,
  ) => Promise<ProviderOnboardingStatusCommandResponse>;
  applyPolymarketAccountCandidate: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<ProviderOnboardingStatusCommandResponse>;
  preflightStatus: (
    request: LivePreflightStatusCommandRequest,
  ) => Promise<LivePreflightStatusCommandResponse>;
};

export const tauriProviderOnboardingCommandClient: ProviderOnboardingCommandClient = {
  async status(request = {}) {
    if (!isTauriInvokeAvailable()) {
      return createProviderOnboardingUnavailableResponse();
    }

    try {
      return await invoke<ProviderOnboardingStatusCommandResponse>(
        "provider_onboarding_status",
        { request },
      );
    } catch {
      return createProviderOnboardingErrorResponse();
    }
  },

  async connect(request) {
    if (!isTauriInvokeAvailable()) {
      return createProviderOnboardingUnavailableResponse();
    }

    try {
      return await invoke<ProviderOnboardingStatusCommandResponse>(
        "provider_connect_account",
        { request },
      );
    } catch {
      return createProviderOnboardingErrorResponse();
    }
  },

  async openCredentialReference(request) {
    if (!isTauriInvokeAvailable()) {
      return createCredentialReferenceUnavailableResponse(request);
    }

    try {
      return await invoke<ProviderCredentialReferenceOpenCommandResponse>(
        "provider_open_credential_reference",
        { request },
      );
    } catch {
      return createCredentialReferenceErrorResponse(request);
    }
  },

  async importPolymarketSignerFromClipboard(request) {
    if (!isTauriInvokeAvailable()) {
      return createProviderOnboardingUnavailableResponse();
    }

    try {
      return await invoke<ProviderOnboardingStatusCommandResponse>(
        "provider_import_polymarket_signer_from_clipboard",
        { request },
      );
    } catch {
      return createProviderOnboardingErrorResponse();
    }
  },

  async applyPolymarketAccountCandidate(request) {
    if (!isTauriInvokeAvailable()) {
      return createProviderOnboardingUnavailableResponse();
    }

    try {
      return await invoke<ProviderOnboardingStatusCommandResponse>(
        "provider_apply_polymarket_account_candidate",
        { request },
      );
    } catch {
      return createProviderOnboardingErrorResponse();
    }
  },

  async preflightStatus(request) {
    if (!isTauriInvokeAvailable()) {
      return createLivePreflightUnavailableResponse();
    }

    try {
      return await invoke<LivePreflightStatusCommandResponse>(
        "live_preflight_status",
        { request },
      );
    } catch {
      return createLivePreflightErrorResponse();
    }
  },
};

export function createProviderOnboardingUnavailableResponse(): ProviderOnboardingStatusCommandResponse {
  return {
    command: "provider_onboarding_status",
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; provider onboarding status must come from the desktop main process.",
    secretFree: true,
    providers: [
      createUnavailableProviderStatus("polymarket"),
      createUnavailableProviderStatus("kalshi"),
    ],
  };
}

export function createLivePreflightUnavailableResponse(): LivePreflightStatusCommandResponse {
  return {
    command: "live_preflight_status",
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; live preflight readiness must come from the desktop main process.",
    secretFree: true,
    ready: false,
    providers: [
      createUnavailablePreflightProvider("polymarket"),
      createUnavailablePreflightProvider("kalshi"),
    ],
  };
}

function createCredentialReferenceUnavailableResponse(
  request: ProviderCredentialReferenceOpenRequest,
): ProviderCredentialReferenceOpenCommandResponse {
  return {
    command: "provider_open_credential_reference",
    providerId: request.providerId,
    referenceId: request.referenceId,
    status: "unavailable",
    message:
      "Tauri command bridge is unavailable; credential reference links must be opened by the desktop main process.",
    secretFree: true,
  };
}

function createProviderOnboardingErrorResponse(): ProviderOnboardingStatusCommandResponse {
  return {
    ...createProviderOnboardingUnavailableResponse(),
    status: "provider-error",
    message:
      "Provider onboarding command failed before returning a secret-free status.",
  };
}

function createCredentialReferenceErrorResponse(
  request: ProviderCredentialReferenceOpenRequest,
): ProviderCredentialReferenceOpenCommandResponse {
  return {
    ...createCredentialReferenceUnavailableResponse(request),
    status: "provider-error",
    message:
      "Credential reference command failed before returning a secret-free status.",
  };
}

function createLivePreflightErrorResponse(): LivePreflightStatusCommandResponse {
  return {
    ...createLivePreflightUnavailableResponse(),
    status: "provider-error",
    message:
      "Live preflight command failed before returning a secret-free status.",
  };
}

function createUnavailableProviderStatus(
  providerId: ProviderId,
): ProviderOnboardingProviderStatus {
  const now = new Date(0).toISOString();

  return {
    providerId,
    label: providerId === "polymarket" ? "Polymarket" : "Kalshi",
    credential: {
      status: "missing",
      source: "none",
      message: "Tauri credential provider status is unavailable.",
      reasons: ["tauri_command_bridge_unavailable"],
      checkedAt: now,
    },
    accountMetrics: {
      status: "missing",
      source: "provider_owned_account_metrics",
      message: "Tauri account metrics provider status is unavailable.",
      reasons: ["tauri_command_bridge_unavailable"],
      checkedAt: now,
    },
    liveAdapterStatus: "not_configured",
    readyForPreflight: false,
    reasons: ["tauri_command_bridge_unavailable"],
  };
}

function createUnavailablePreflightProvider(
  providerId: ProviderId,
): LivePreflightProviderStatus {
  const onboarding = createUnavailableProviderStatus(providerId);

  return {
    providerId,
    status: "blocked",
    ready: false,
    reasons: ["tauri_command_bridge_unavailable"],
    message: `${onboarding.label} preflight is unavailable outside the Tauri main process.`,
    credential: onboarding.credential,
    accountMetrics: onboarding.accountMetrics,
    gates: [
      {
        id: "runtime",
        status: "blocked",
        blocksLive: true,
        reasons: ["tauri_command_bridge_unavailable"],
      },
    ],
  };
}

function isTauriInvokeAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
