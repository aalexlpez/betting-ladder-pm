import {
  buildLadderRows,
  createCoreBootstrapStatus,
  PROVIDER_IDS,
  type AuditEvent,
  type ConnectionMode,
  type DataFreshness,
  type DecimalString,
  type NormalizedOrder,
  type NormalizedOrderBookSnapshot,
  type OrderIntent,
  type OrderRejectionReason,
  type ProviderId as CoreProviderId,
} from "@prediction-ladder/core";
import type {
  DesktopGateLabelKey,
  DesktopLadderStateLabelKey,
  ExecutionModeLabelKey,
} from "@prediction-ladder/i18n";
import {
  isLiveMarketDataSource,
  type MarketDataAdapterError,
  type MarketDataAdapterErrorReason,
  type MarketDataConnectionStatus,
  type MarketDataResult,
  type MarketDataSource,
} from "@prediction-ladder/market-data";

import type {
  MarketGetOrderBookCommandResponse,
  RendererMarketSearchResult,
  VenueCommandState,
} from "./marketDataCommands";
import type { LiveGateStatusCommandResponse } from "./liveExecutionCommands";
import type {
  LivePreflightProviderStatus,
  LivePreflightStatusCommandResponse,
  ProviderOnboardingProviderStatus,
  ProviderOnboardingStatusCommandResponse,
} from "./providerOnboardingCommands";
import type { MarketDataWorkflowState, MarketProviderFilter } from "./marketDataWorkflow";
import {
  createInitialOrderEntryState,
  type DesktopOrderExecutionMode,
  type OrderEntryState,
} from "./orderIntentWorkflow";

export const providerIds = PROVIDER_IDS;
export type ProviderId = CoreProviderId;

export const requiredLadderStateIds = [
  "no_market",
  "loading",
  "fresh",
  "empty",
  "stale",
  "disconnected",
  "error",
] as const satisfies readonly DesktopLadderStateLabelKey[];
export type LadderStateId = (typeof requiredLadderStateIds)[number];

export const desktopExecutionModeIds = [
  "disabled",
  "paper",
  "live_dry_run",
  "live",
] as const satisfies readonly ExecutionModeLabelKey[];
export type DesktopExecutionModeId = (typeof desktopExecutionModeIds)[number];

export const desktopGateIds = [
  "legal",
  "geo",
  "credential",
  "local_approval",
  "acknowledgement",
  "account_metrics",
  "audit",
  "live",
] as const satisfies readonly DesktopGateLabelKey[];
export type DesktopGateId = (typeof desktopGateIds)[number];
export type LiveGateReason =
  | OrderRejectionReason
  | "account_metrics_source_missing"
  | "account_metrics_market_mismatch"
  | "account_metrics_provider_mismatch"
  | "account_metrics_values_malformed"
  | "account_metrics_values_source_missing"
  | "account_metrics_values_stale"
  | "account_metrics_market_not_selected"
  | "account_metrics_network_error"
  | "account_metrics_payload_invalid"
  | "account_metrics_provider_rejected"
  | "account_metrics_provider_not_configured"
  | "account_metrics_provider_url_invalid"
  | "credentials_missing"
  | "credential_profile_malformed"
  | "credential_profile_unreadable"
  | "credential_profile_write_failed"
  | "credential_source_missing"
  | "credential_source_not_supported_for_onboarding"
  | "enable_live_trading_not_true"
  | "explicit_live_ack_missing"
  | "exposure_exceeds_local_approval"
  | "fresh_official_order_book_missing"
  | "gtc_required"
  | "kill_switch_active"
  | "kalshi_api_key_id_missing"
  | "kalshi_key_file_encrypted_passphrase_not_supported"
  | "kalshi_key_file_invalid"
  | "kalshi_key_file_missing"
  | "legal_approver_missing"
  | "legal_audit_not_confirmed"
  | "legal_c0_review_not_passed"
  | "legal_c1_risk_not_accepted"
  | "legal_custody_not_rejected"
  | "legal_fake_kyc_not_rejected"
  | "legal_first_live_smoke_policy_not_confirmed"
  | "legal_geoblock_bypass_not_rejected"
  | "legal_max_exposure_invalid"
  | "legal_max_stake_invalid"
  | "legal_no_deposits_withdrawals_not_confirmed"
  | "legal_operator_identity_missing"
  | "legal_operator_risk_not_acknowledged"
  | "legal_platform_eligibility_not_confirmed"
  | "legal_real_account_owner_not_confirmed"
  | "legal_real_beneficial_owners_not_confirmed"
  | "legal_real_operator_not_confirmed"
  | "legal_sanctions_bypass_not_rejected"
  | "legal_target_jurisdiction_missing"
  | "legal_vpn_bypass_not_rejected"
  | "limit_order_required"
  | "live_smoke_buy_only"
  | "local_approval_not_approved"
  | "local_approval_provider_mismatch"
  | "market_id_missing"
  | "market_min_order_size_invalid"
  | "marketable_order_blocked"
  | "max_exposure_not_configured"
  | "max_stake_not_configured"
  | "network_error"
  | "order_size_below_market_minimum"
  | "outcome_id_missing"
  | "price_invalid"
  | "provider_live_adapter_not_configured"
  | "provider_not_supported"
  | "provider_credentials_required"
  | "provider_order_id_missing"
  | "provider_protocol_error"
  | "provider_rejected"
  | "polymarket_local_signer_file_invalid"
  | "polymarket_local_signer_file_missing"
  | "estimated_order_cost_exceeds_stake_amount"
  | "quantity_invalid"
  | "selected_market_missing"
  | "seed_phrase_not_allowed"
  | "stake_currency_missing"
  | "stake_exceeds_local_approval"
  | "tauri_legal_approval_error"
  | "tauri_command_bridge_unavailable"
  | "tauri_live_gate_status_error";

export const desktopMarketConnectionStateIds = [
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
] as const satisfies readonly MarketDataConnectionStatus[];

export type ProviderSurface = {
  id: ProviderId;
  label: string;
  venueScope: "prediction_market";
  adapterStatus: "official_runtime_streaming_available";
  marketSearchStatus: "tauri_command_boundary_available";
  connectionStatus: MarketDataConnectionStatus;
  credentialStatus: "ready" | "missing" | "invalid" | "blocked" | "unknown" | string;
  accountMetricsStatus: "ready" | "missing" | "invalid" | "blocked" | "unknown" | string;
  liveExecutionStatus: "blocked" | "ready" | string;
  summary: string;
};

export type SelectedMarketView = {
  providerId: ProviderId;
  marketId: string;
  outcomeId: string;
  outcomeLabel: string;
  title: string;
  currency: string;
  tickSize: DecimalString | "unknown";
  capturedAt: string;
};

export type MarketDataViewStatus =
  | "not_configured"
  | "loading"
  | "fresh"
  | "stale"
  | "disconnected"
  | "invalid"
  | "blocked"
  | "credentials-required"
  | "unavailable"
  | "provider-error"
  | "non_live_fixture"
  | "error";

export type MarketDataView = {
  status: MarketDataViewStatus;
  selectedProviderId: ProviderId;
  selectedMarket: SelectedMarketView | null;
  dataFreshness: DataFreshness | "unknown";
  connectionStatus: MarketDataConnectionStatus;
  sourceKind?: MarketDataSource["kind"];
  errorReason?: MarketDataAdapterErrorReason;
  summary: string;
};

export type MarketSearchResultView = RendererMarketSearchResult & {
  selected: boolean;
  selectedOutcomeId: string | null;
};

export type MarketSearchView = {
  query: string;
  providerFilter: MarketProviderFilter;
  canQueryExternalApis: false;
  canInvokeTauriCommands: true;
  canLoadMore: boolean;
  hasMore: boolean;
  results: readonly MarketSearchResultView[];
  providerStates: readonly VenueCommandState[];
  status: MarketDataConnectionStatus;
  summary: string;
};

export type SubscriptionView = {
  status: MarketDataConnectionStatus;
  freshness: DataFreshness;
  connectionMode: ConnectionMode;
  summary: string;
};

export type LadderStateSummary = {
  id: LadderStateId;
  current: boolean;
  blocksOrderPreview: boolean;
  summary: string;
};

export type ExecutionModeOption = {
  id: DesktopExecutionModeId;
  current: boolean;
  canSubmitOrders: false;
  canRunLocalHarness: boolean;
  availability:
    | "active_default"
    | "blocked_by_gates"
    | "needs_market"
    | "order_blocked"
    | "ready_for_preview"
    | "ready_to_submit";
  blockingReasons: readonly LiveGateReason[];
  summary: string;
};

export type GateSummary = {
  id: DesktopGateId;
  state:
    | "approved"
    | "blocked"
    | "enabled"
    | "missing"
    | "not_approved"
    | "not_enabled"
    | "unknown";
  blocksLive: boolean;
  reasons: readonly LiveGateReason[];
  summary: string;
};

export type MetricKey = "pnl" | "available_funds" | "open_order_amount" | "exposure";
export type MetricScope = "global" | "provider" | "market";

export type MetricPlaceholder = {
  key: MetricKey;
  status: "ready" | "unknown";
  value: DecimalString | null;
  displayValue: string;
  reason: string;
};

export type MetricGroup = {
  scope: MetricScope;
  subject: string;
  metrics: readonly MetricPlaceholder[];
};

export type StakePreset = {
  label: string;
  value: number;
  currency: "provider_currency";
  selectable: true;
  selected: boolean;
};

export type LadderRowPlaceholder = {
  level: number;
  bidSize: null;
  price: null;
  askSize: null;
  status: "no_book_loaded";
};

export type LadderRowSnapshot = {
  level: number;
  price: DecimalString;
  status: "provider_snapshot";
  isBestBid: boolean;
  isBestAsk: boolean;
  bidSize?: DecimalString;
  askSize?: DecimalString;
};

export type LadderDisplayRow = LadderRowPlaceholder | LadderRowSnapshot;

export type DesktopTerminalStateInput = {
  liveGateStatus?: LiveGateStatusCommandResponse | null;
  livePreflightStatus?: LivePreflightStatusCommandResponse | null;
  marketDataResult?: MarketDataResult<NormalizedOrderBookSnapshot>;
  orderEntry?: OrderEntryState;
  providerOnboardingStatus?: ProviderOnboardingStatusCommandResponse | null;
  selectedMarketTitle?: string;
  workflow?: MarketDataWorkflowState;
};

export type DesktopTerminalState = {
  productName: "Prediction Ladder";
  buildChannel: "local-shell";
  selectedProviderId: ProviderId;
  selectedMarket: SelectedMarketView | null;
  dataFreshness: DataFreshness | "unknown";
  marketData: MarketDataView;
  marketSearch: MarketSearchView;
  subscription: SubscriptionView;
  providers: readonly ProviderSurface[];
  providerOnboarding: {
    status: ProviderOnboardingStatusCommandResponse["status"] | "unknown";
    summary: string;
    providers: readonly ProviderOnboardingProviderStatus[];
  };
  livePreflight: {
    status: LivePreflightStatusCommandResponse["status"] | "unknown";
    ready: boolean;
    summary: string;
    providers: readonly LivePreflightProviderStatus[];
  };
  ladder: {
    currentState: LadderStateId;
    states: readonly LadderStateSummary[];
    rows: readonly LadderDisplayRow[];
  };
  execution: {
    currentMode: DesktopExecutionModeId;
    modes: readonly ExecutionModeOption[];
    oneClick: {
      armed: false;
      canArm: false;
      summary: string;
    };
    liveAcknowledgement: {
      acknowledged: boolean;
      required: true;
      summary: string;
    };
    killSwitch: {
      visible: true;
      active: boolean;
      riskIncreasingActionsBlockedByDefault: true;
      summary: string;
    };
  };
  risk: {
    maxStake: DecimalString;
    maxExposure: DecimalString;
    recentValidation: "approved" | "no_order_intent" | "rejected";
    summary: string;
  };
  gates: readonly GateSummary[];
  metrics: readonly MetricGroup[];
  stakePresets: readonly StakePreset[];
  stakeInput: {
    amount: DecimalString;
    configured: boolean;
  };
  orderPreview: {
    status:
      | "dry_run_checked"
      | "empty"
      | "intent_created"
      | "live_blocked"
      | "paper_order_created"
      | "validation_failed"
      | "validation_passed";
    canSubmit: boolean;
    canSubmitLocal: boolean;
    canSubmitLive: boolean;
    intent: OrderIntent | null;
    validationReasons: readonly OrderRejectionReason[];
    summary: string;
  };
  openOrders: {
    status: "empty" | "live_provider_orders" | "mixed_orders" | "paper_orders";
    rows: readonly NormalizedOrder[];
    summary: string;
  };
  auditLog: {
    status: "empty" | "ready";
    rows: readonly AuditEvent[];
    summary: string;
  };
  boundary: {
    rendererExternalApiAccess: false;
    rendererFilesystemAccess: false;
    rendererShellAccess: false;
    rendererProviderSdkAccess: false;
    rendererCredentialAccess: false;
    liveExecutionPathExposed: boolean;
    core: ReturnType<typeof createCoreBootstrapStatus>;
  };
};

const unknownMetricReason =
  "Authenticated provider account data is not connected in the market-data runtime yet, so this value is intentionally unknown.";

function getPreflightProvider(
  livePreflightStatus: LivePreflightStatusCommandResponse | null | undefined,
  providerId: ProviderId,
): LivePreflightProviderStatus | null {
  return (
    livePreflightStatus?.providers.find(
      (provider) => provider.providerId === providerId,
    ) ?? null
  );
}

export function createDesktopTerminalState(
  input: DesktopTerminalStateInput = {},
): DesktopTerminalState {
  const marketData = createMarketDataView(input);
  const selectedMarket =
    marketData.selectedMarket ?? createSelectedMarketFromWorkflow(input.workflow);
  const selectedProviderId = selectedMarket?.providerId ?? marketData.selectedProviderId;
  const marketSearch = createMarketSearchView(input.workflow, selectedMarket);
  const subscription = createSubscriptionView(input.workflow);
  const orderEntry = input.orderEntry ?? createInitialOrderEntryState();
  const selectedPreflightProvider = getPreflightProvider(
    input.livePreflightStatus,
    selectedProviderId,
  );
  const orderPreview = createOrderPreviewView(
    orderEntry,
    input.liveGateStatus,
    selectedPreflightProvider,
  );
  const liveGateBlockers = createLiveGateBlockers(
    orderEntry,
    input.liveGateStatus,
    selectedPreflightProvider,
  );

  return {
    productName: "Prediction Ladder",
    buildChannel: "local-shell",
    selectedProviderId,
    selectedMarket,
    dataFreshness: marketData.dataFreshness,
    marketData,
    marketSearch,
    subscription,
    providers: createProviderSurfaces(
      marketData,
      marketSearch.providerStates,
      subscription,
      selectedProviderId,
      input.providerOnboardingStatus,
      input.livePreflightStatus,
    ),
    providerOnboarding: {
      status: input.providerOnboardingStatus?.status ?? "unknown",
      summary:
        input.providerOnboardingStatus?.message ??
        "Provider account onboarding status has not been loaded from Tauri yet.",
      providers: input.providerOnboardingStatus?.providers ?? [],
    },
    livePreflight: {
      status: input.livePreflightStatus?.status ?? "unknown",
      ready: input.livePreflightStatus?.ready ?? false,
      summary:
        input.livePreflightStatus?.message ??
        "Live preflight has not been loaded from the Tauri main process yet.",
      providers: input.livePreflightStatus?.providers ?? [],
    },
    ladder: {
      currentState: getLadderStateFromMarketData(marketData),
      states: createLadderStateSummaries(getLadderStateFromMarketData(marketData)),
      rows: createLadderRowsFromMarketData(input, marketData),
    },
    execution: {
      currentMode: toDesktopExecutionModeId(orderEntry.executionMode),
      modes: createExecutionModeOptions(orderEntry.executionMode, {
        liveGateBlockers,
        liveSubmitReady: orderPreview.canSubmitLive,
      }),
      oneClick: {
        armed: false,
        canArm: false,
        summary:
          "One-click is off by default; ladder clicks create previews unless an explicit guarded route is added later.",
      },
      liveAcknowledgement: {
        acknowledged: orderEntry.firstLiveAck,
        required: true,
        summary: orderEntry.firstLiveAck
          ? "Explicit live acknowledgement is present for validation; live still requires every other gate."
          : "Explicit live acknowledgement is missing, so live submission remains blocked.",
      },
      killSwitch: {
        visible: true,
        active: orderEntry.killSwitchActive,
        riskIncreasingActionsBlockedByDefault: true,
        summary: orderEntry.killSwitchActive
          ? "Kill switch is active; risk-increasing order intents are rejected and audited."
          : "Kill switch is visible and ready; cancellation remains the intended risk-reducing path.",
      },
    },
    risk: {
      maxStake: orderEntry.maxStakePerOrder,
      maxExposure: orderEntry.maxMarketExposure,
      recentValidation:
        orderEntry.validation === null ? "no_order_intent" : orderEntry.validation.status,
      summary: createRiskSummary(orderEntry),
    },
    gates: createGateSummaries(
      orderEntry,
      input.liveGateStatus,
      selectedPreflightProvider,
    ),
    metrics: createMetricGroups(selectedMarket, selectedPreflightProvider),
    stakePresets: createStakePresets(orderEntry),
    stakeInput: {
      amount: orderEntry.selectedStakeAmount,
      configured: orderEntry.selectedStakeConfigured,
    },
    orderPreview,
    openOrders: createOpenOrdersView(orderEntry),
    auditLog: createAuditLogView(orderEntry),
    boundary: {
      rendererExternalApiAccess: false,
      rendererFilesystemAccess: false,
      rendererShellAccess: false,
      rendererProviderSdkAccess: false,
      rendererCredentialAccess: false,
      liveExecutionPathExposed: orderPreview.canSubmitLive,
      core: createCoreBootstrapStatus(),
    },
  };
}

export function createProviderSurfaces(
  marketData: MarketDataView = createMarketDataView(),
  providerStates: readonly VenueCommandState[] = [],
  subscription: SubscriptionView = createSubscriptionView(),
  selectedProviderId: ProviderId = marketData.selectedProviderId,
  onboardingStatus?: ProviderOnboardingStatusCommandResponse | null,
  preflightStatus?: LivePreflightStatusCommandResponse | null,
): readonly ProviderSurface[] {
  return [
    createProviderSurface("polymarket", "Polymarket", {
      marketData,
      onboardingStatus,
      preflightStatus,
      providerStates,
      selectedProviderId,
      subscription,
    }),
    createProviderSurface("kalshi", "Kalshi", {
      marketData,
      onboardingStatus,
      preflightStatus,
      providerStates,
      selectedProviderId,
      subscription,
    }),
  ];
}

function createProviderSurface(
  providerId: ProviderId,
  label: string,
  input: {
    marketData: MarketDataView;
    onboardingStatus?: ProviderOnboardingStatusCommandResponse | null | undefined;
    preflightStatus?: LivePreflightStatusCommandResponse | null | undefined;
    providerStates: readonly VenueCommandState[];
    selectedProviderId: ProviderId;
    subscription: SubscriptionView;
  },
): ProviderSurface {
  const providerState = input.providerStates.find((state) => state.providerId === providerId);
  const onboardingProvider = input.onboardingStatus?.providers.find(
    (provider) => provider.providerId === providerId,
  );
  const preflightProvider = input.preflightStatus?.providers.find(
    (provider) => provider.providerId === providerId,
  );
  const selected = providerId === input.selectedProviderId;
  const selectedConnectionStatus = input.marketData.connectionStatus;
  const fallbackSummary =
    providerId === "polymarket"
      ? "Polymarket public read-only market data is owned by the Tauri/provider runtime; no renderer API call or secret access is made."
      : "Kalshi read-only discovery may be public, while WebSocket streaming remains credentials-required until a local credential provider exists.";
  const selectedSummary =
    input.subscription.status === "disconnected"
      ? input.marketData.summary
      : `${input.marketData.summary} Stream state: ${input.subscription.summary}`;

  return {
    id: providerId,
    label,
    venueScope: "prediction_market",
    adapterStatus: "official_runtime_streaming_available",
    marketSearchStatus: "tauri_command_boundary_available",
    connectionStatus: selected
      ? selectedConnectionStatus
      : providerState?.status ?? "disconnected",
    credentialStatus: onboardingProvider?.credential.status ?? "unknown",
    accountMetricsStatus: onboardingProvider?.accountMetrics.status ?? "unknown",
    liveExecutionStatus: preflightProvider?.ready ? "ready" : "blocked",
    summary:
      preflightProvider?.message ??
      (selected ? selectedSummary : providerState?.message ?? fallbackSummary),
  };
}

export function createMarketSearchView(
  workflow: MarketDataWorkflowState | undefined,
  selectedMarket: SelectedMarketView | null = null,
): MarketSearchView {
  const response = workflow?.search;

  if (response === undefined) {
    return {
      query: "",
      providerFilter: "all",
      canQueryExternalApis: false,
      canInvokeTauriCommands: true,
      canLoadMore: false,
      hasMore: false,
      results: [],
      providerStates: [],
      status: "disconnected",
      summary:
        "Search is ready through the Tauri command boundary. The renderer will not call provider APIs directly.",
    };
  }

  return {
    query: workflow?.query ?? "",
    providerFilter: workflow?.providerFilter ?? "all",
    canQueryExternalApis: false,
    canInvokeTauriCommands: true,
    canLoadMore: response.hasMore && response.status !== "connecting",
    hasMore: response.hasMore,
    results: response.markets.map((market) =>
      createMarketSearchResultView(market, selectedMarket),
    ),
    providerStates: response.providerStates,
    status: response.status,
    summary: response.message,
  };
}

function createMarketSearchResultView(
  market: RendererMarketSearchResult,
  selectedMarket: SelectedMarketView | null,
): MarketSearchResultView {
  const selected =
    selectedMarket?.providerId === market.providerId &&
    selectedMarket.marketId === market.marketId;

  return {
    ...market,
    selected,
    selectedOutcomeId: selected ? selectedMarket.outcomeId : null,
  };
}

export function createSubscriptionView(
  workflow?: MarketDataWorkflowState,
): SubscriptionView {
  const subscription = workflow?.subscription;

  if (subscription === undefined || subscription === null) {
    return {
      status: "disconnected",
      freshness: "disconnected",
      connectionMode: "streaming",
      summary:
        "No market subscription has been requested. Streaming state will be returned by Tauri after selection.",
    };
  }

  return {
    status: subscription.status,
    freshness: subscription.freshness,
    connectionMode: subscription.connectionMode,
    summary: subscription.message,
  };
}

function createSelectedMarketFromWorkflow(
  workflow?: MarketDataWorkflowState,
): SelectedMarketView | null {
  const selection = workflow?.selected;

  if (selection === undefined || selection === null) {
    return null;
  }

  return {
    providerId: selection.market.providerId,
    marketId: selection.market.marketId,
    outcomeId: selection.outcome.outcomeId,
    outcomeLabel: selection.outcome.label,
    title: selection.market.title,
    currency: "unknown",
    tickSize: "unknown",
    capturedAt: "not_loaded",
  };
}

export function createLadderStateSummaries(
  currentState: LadderStateId = "no_market",
): readonly LadderStateSummary[] {
  return requiredLadderStateIds.map((id) => ({
    id,
    current: id === currentState,
    blocksOrderPreview: id !== "fresh",
    summary: ladderStateSummaries[id],
  }));
}

export function createExecutionModeOptions(
  currentMode: DesktopOrderExecutionMode = "disabled",
  input: {
    liveGateBlockers?: readonly LiveGateReason[];
    liveSubmitReady?: boolean;
  } = {},
): readonly ExecutionModeOption[] {
  const currentModeId = toDesktopExecutionModeId(currentMode);
  const liveGateBlockers = input.liveGateBlockers ?? [];
  const liveAvailability = createLiveModeAvailability({
    liveGateBlockers,
    liveSubmitReady: input.liveSubmitReady ?? false,
  });

  return desktopExecutionModeIds.map((id) => ({
    id,
    current: id === currentModeId,
    canSubmitOrders: false,
    canRunLocalHarness: id === "paper" || id === "live_dry_run",
    availability: id === "live" ? liveAvailability.availability : "active_default",
    blockingReasons: id === "live" ? liveAvailability.blockingReasons : [],
    summary: executionModeSummaries[id],
  }));
}

function createLiveModeAvailability(input: {
  liveGateBlockers: readonly LiveGateReason[];
  liveSubmitReady: boolean;
}): Pick<ExecutionModeOption, "availability" | "blockingReasons"> {
  if (input.liveSubmitReady) {
    return { availability: "ready_to_submit", blockingReasons: [] };
  }

  const baseGateBlockers = input.liveGateBlockers.filter(
    (reason) =>
      !isLiveMarketSetupReason(reason) && !isLiveOrderSpecificReason(reason),
  );
  if (baseGateBlockers.length > 0) {
    return {
      availability: "blocked_by_gates",
      blockingReasons: baseGateBlockers,
    };
  }

  const marketSetupBlockers = input.liveGateBlockers.filter(isLiveMarketSetupReason);
  if (marketSetupBlockers.length > 0) {
    return {
      availability: "needs_market",
      blockingReasons: marketSetupBlockers,
    };
  }

  const orderSpecificBlockers = input.liveGateBlockers.filter(
    isLiveOrderSpecificReason,
  );
  if (orderSpecificBlockers.length > 0) {
    return {
      availability: "order_blocked",
      blockingReasons: orderSpecificBlockers,
    };
  }

  return {
    availability: "ready_for_preview",
    blockingReasons: [],
  };
}

function isLiveMarketSetupReason(reason: LiveGateReason): boolean {
  return [
    "account_metrics_market_not_selected",
    "fresh_official_order_book_missing",
    "market_id_missing",
    "outcome_id_missing",
    "selected_market_missing",
  ].includes(reason);
}

function isLiveOrderSpecificReason(reason: LiveGateReason): boolean {
  return [
    "exposure_exceeds_local_approval",
    "gtc_required",
    "limit_order_required",
    "live_smoke_buy_only",
    "market_min_order_size_invalid",
    "marketable_order_blocked",
    "order_size_below_market_minimum",
    "price_invalid",
    "estimated_order_cost_exceeds_stake_amount",
    "quantity_invalid",
    "stake_currency_missing",
    "stake_exceeds_local_approval",
    "stake_not_configured",
  ].includes(reason);
}

export function createGateSummaries(
  orderEntry: OrderEntryState = createInitialOrderEntryState(),
  liveGateStatus?: LiveGateStatusCommandResponse | null,
  livePreflightProvider?: LivePreflightProviderStatus | null,
): readonly GateSummary[] {
  const hasLiveGateStatus = liveGateStatus !== null && liveGateStatus !== undefined;
  const liveReasons = createLiveGateBlockers(
    orderEntry,
    liveGateStatus,
    livePreflightProvider,
  );
  const legalReasons = uniqueLiveReasons([
    ...(!hasLiveGateStatus && orderEntry.legalGateStatus !== "approved"
      ? ["legal_gate_not_approved"]
      : []),
    ...(liveGateStatus !== null &&
    liveGateStatus !== undefined &&
    liveGateStatus.legalGateStatus !== "APPROVED"
      ? ["legal_gate_not_approved"]
      : []),
  ]);
  const credentialReasons = uniqueLiveReasons([
    ...(orderEntry.credentialStatus === "ready" ? [] : ["credentials_missing"]),
    ...(liveGateStatus !== null &&
    liveGateStatus !== undefined &&
    !liveGateStatus.credentialSourceReady
      ? ["credential_source_missing"]
      : []),
    ...liveReasons.filter((reason) =>
      [
        "credential_profile_malformed",
        "credential_profile_unreadable",
        "credential_source_missing",
        "credential_source_not_supported_for_onboarding",
        "kalshi_api_key_id_missing",
        "kalshi_key_file_encrypted_passphrase_not_supported",
        "kalshi_key_file_invalid",
        "kalshi_key_file_missing",
        "polymarket_local_signer_file_invalid",
        "polymarket_local_signer_file_missing",
        "seed_phrase_not_allowed",
      ].includes(reason),
    ),
  ]);
  const geoReasons = uniqueLiveReasons([
    ...(!hasLiveGateStatus && orderEntry.geoGateStatus !== "approved"
      ? [orderEntry.geoGateStatus === "blocked" ? "geo_blocked" : "geo_unknown"]
      : []),
    ...liveReasons.filter((reason) => reason === "geo_blocked" || reason === "geo_unknown"),
  ]);
  const localApprovalReasons = uniqueLiveReasons([
    ...(!hasLiveGateStatus && orderEntry.localApprovalStatus !== "approved"
      ? ["local_approval_missing"]
      : []),
    ...liveReasons.filter((reason) =>
      [
        "local_approval_missing",
        "local_approval_not_approved",
        "local_approval_provider_mismatch",
      ].includes(reason),
    ),
  ]);
  const acknowledgementReasons = uniqueLiveReasons([
    ...(orderEntry.firstLiveAck ? [] : ["first_live_ack_missing"]),
    ...liveReasons.filter((reason) => reason === "explicit_live_ack_missing"),
  ]);
  const accountMetricReasons = liveReasons.filter((reason) =>
    [
      "account_metrics_source_missing",
      "account_metrics_values_source_missing",
      "account_metrics_values_malformed",
      "account_metrics_values_stale",
      "account_metrics_provider_mismatch",
      "account_metrics_market_mismatch",
      "account_metrics_market_not_selected",
      "account_metrics_network_error",
      "account_metrics_payload_invalid",
      "account_metrics_provider_rejected",
      "account_metrics_provider_not_configured",
      "account_metrics_provider_url_invalid",
      "available_funds_unknown",
      "credentials_missing",
      "provider_credentials_required",
      "provider_exposure_unknown",
      "market_exposure_unknown",
    ].includes(reason),
  );
  const auditReasons = uniqueLiveReasons(
    orderEntry.auditLogEnabled
      ? liveReasons.filter((reason) => reason === "audit_log_not_enabled")
      : ["audit_log_not_enabled"],
  );

  return [
    {
      id: "legal",
      state: legalReasons.length === 0 ? "approved" : "not_approved",
      blocksLive: legalReasons.length > 0,
      reasons: legalReasons,
      summary:
        legalReasons.length === 0
          ? "Legal approval gate is marked approved for validation."
          : "Legal approval has not been granted, so live execution is blocked.",
    },
    {
      id: "geo",
      state:
        geoReasons.length === 0
          ? "approved"
          : geoReasons.includes("geo_blocked")
            ? "blocked"
            : "unknown",
      blocksLive: geoReasons.length > 0,
      reasons: geoReasons,
      summary:
        geoReasons.length === 0
          ? "Geo/platform eligibility gate is marked approved for validation."
          : "Jurisdiction and platform eligibility are unknown or blocked, so live execution is blocked.",
    },
    {
      id: "credential",
      state: credentialReasons.length === 0 ? "approved" : "missing",
      blocksLive: credentialReasons.length > 0,
      reasons: credentialReasons,
      summary:
        credentialReasons.length === 0
          ? "Credential gate is marked ready for validation without exposing secrets to the renderer."
          : "No credential provider is configured and no secrets are available to the renderer.",
    },
    {
      id: "local_approval",
      state:
        localApprovalReasons.length === 0
          ? "approved"
          : orderEntry.localApprovalStatus === "missing"
            ? "missing"
            : "not_approved",
      blocksLive: localApprovalReasons.length > 0,
      reasons: localApprovalReasons,
      summary:
        localApprovalReasons.length === 0
          ? "A non-committed local approval gate is loaded and approved."
          : "The non-committed local approval file is missing or not approved.",
    },
    {
      id: "acknowledgement",
      state: acknowledgementReasons.length === 0 ? "approved" : "missing",
      blocksLive: acknowledgementReasons.length > 0,
      reasons: acknowledgementReasons,
      summary: orderEntry.firstLiveAck
        ? "Explicit first-live acknowledgement is present."
        : "Explicit first-live acknowledgement is missing.",
    },
    {
      id: "account_metrics",
      state: accountMetricReasons.length === 0 ? "approved" : "unknown",
      blocksLive: accountMetricReasons.length > 0,
      reasons: accountMetricReasons,
      summary:
        accountMetricReasons.length === 0
          ? "Required account, funds, provider exposure, market exposure, and provider-owned metrics source are known."
          : `Required account metrics block live: ${accountMetricReasons.join(", ")}.`,
    },
    {
      id: "audit",
      state: auditReasons.length === 0 ? "enabled" : "not_enabled",
      blocksLive: auditReasons.length > 0,
      reasons: auditReasons,
      summary: orderEntry.auditLogEnabled
        ? "Local redacted audit logging is enabled for previews, paper, and dry-run checks."
        : "Audit persistence is not enabled, so live and dry-run submission remain blocked.",
    },
    {
      id: "live",
      state: liveReasons.length === 0 ? "approved" : "blocked",
      blocksLive: liveReasons.length > 0,
      reasons: liveReasons,
      summary:
        liveReasons.length === 0
          ? "Every modeled live gate is ready; live submit may use the narrow Tauri command boundary."
          : `Live submit remains blocked by: ${liveReasons.join(", ")}.`,
    },
  ];
}

export function createLiveGateBlockers(
  orderEntry: OrderEntryState = createInitialOrderEntryState(),
  liveGateStatus?: LiveGateStatusCommandResponse | null,
  livePreflightProvider?: LivePreflightProviderStatus | null,
): readonly LiveGateReason[] {
  const reasons: LiveGateReason[] = [];
  const hasLiveGateStatus = liveGateStatus !== null && liveGateStatus !== undefined;

  if (!hasLiveGateStatus && orderEntry.legalGateStatus !== "approved") {
    reasons.push("legal_gate_not_approved");
  }

  if (!hasLiveGateStatus && orderEntry.geoGateStatus === "blocked") {
    reasons.push("geo_blocked");
  }

  if (!hasLiveGateStatus && orderEntry.geoGateStatus === "unknown") {
    reasons.push("geo_unknown");
  }

  if (!hasLiveGateStatus && orderEntry.credentialStatus !== "ready") {
    reasons.push("credentials_missing");
  }

  if (!hasLiveGateStatus && orderEntry.localApprovalStatus !== "approved") {
    reasons.push("local_approval_missing");
  }

  if (!hasLiveGateStatus && !orderEntry.firstLiveAck) {
    reasons.push("first_live_ack_missing");
  }

  if (!hasLiveGateStatus && !orderEntry.auditLogEnabled) {
    reasons.push("audit_log_not_enabled");
  }

  if (!hasLiveGateStatus && orderEntry.accountMetricsSourceStatus !== "ready") {
    reasons.push("account_metrics_source_missing");
  }

  if (!hasLiveGateStatus && orderEntry.availableFunds === "unknown") {
    reasons.push("available_funds_unknown");
  }

  if (
    !hasLiveGateStatus &&
    Object.values(orderEntry.providerExposure).some((value) => value === "unknown")
  ) {
    reasons.push("provider_exposure_unknown");
  }

  if (
    !hasLiveGateStatus &&
    (Object.keys(orderEntry.marketExposure).length === 0 ||
      Object.values(orderEntry.marketExposure).some((value) => value === "unknown"))
  ) {
    reasons.push("market_exposure_unknown");
  }

  if (orderEntry.riskClasses.includes("C0")) {
    reasons.push("c0_risk_detected");
  }

  if (
    orderEntry.riskClasses.includes("C1") &&
    orderEntry.c1ApprovalStatus !== "approved"
  ) {
    reasons.push("c1_approval_missing");
  }

  if (
    (livePreflightProvider === null || livePreflightProvider === undefined) &&
    !orderEntry.liveProviderAdapterConfigured
  ) {
    reasons.push("provider_live_adapter_not_configured");
  }

  if (liveGateStatus !== null && liveGateStatus !== undefined && !liveGateStatus.ready) {
    reasons.push(...liveGateStatus.reasons.map(toLiveGateReason));
  }

  if (
    livePreflightProvider !== null &&
    livePreflightProvider !== undefined &&
    !livePreflightProvider.ready
  ) {
    reasons.push(...livePreflightProvider.reasons.map(toLiveGateReason));
  }

  return [...new Set(reasons)];
}

export function createMetricGroups(
  selectedMarket: SelectedMarketView | null = null,
  livePreflightProvider?: LivePreflightProviderStatus | null,
): readonly MetricGroup[] {
  const accountMetrics = livePreflightProvider?.accountMetrics;
  return [
    {
      scope: "global",
      subject: "All providers",
      metrics: createUnknownMetrics(),
    },
    {
      scope: "provider",
      subject:
        selectedMarket === null
          ? "Selected provider"
          : formatProviderLabel(selectedMarket.providerId),
      metrics: createProviderMetrics(accountMetrics),
    },
    {
      scope: "market",
      subject:
        selectedMarket === null
          ? "No market selected"
          : `${selectedMarket.title} / ${selectedMarket.outcomeLabel}`,
      metrics: createMarketMetrics(accountMetrics),
    },
  ];
}

export function createStakePresets(
  orderEntry: OrderEntryState = createInitialOrderEntryState(),
): readonly StakePreset[] {
  return [
    createStakePreset("5", 5, orderEntry),
    createStakePreset("10", 10, orderEntry),
    createStakePreset("25", 25, orderEntry),
    createStakePreset("50", 50, orderEntry),
  ];
}

export function createPlaceholderLadderRows(rowCount = 14): readonly LadderRowPlaceholder[] {
  return Array.from({ length: rowCount }, (_, index) => ({
    level: index + 1,
    bidSize: null,
    price: null,
    askSize: null,
    status: "no_book_loaded",
  }));
}

export function createMarketDataView(
  input: DesktopTerminalStateInput = {},
): MarketDataView {
  if (input.workflow?.orderBook !== undefined && input.workflow.orderBook !== null) {
    return createMarketDataViewFromCommand(input.workflow.orderBook, input.workflow);
  }

  if (input.workflow?.selected !== undefined && input.workflow.selected !== null) {
    return {
      status: "not_configured",
      selectedProviderId: input.workflow.selected.market.providerId,
      selectedMarket: null,
      dataFreshness: "unknown",
      connectionStatus: "disconnected",
      summary:
        "Outcome selected. The ladder is waiting for a normalized order-book response from Tauri.",
    };
  }

  const result = input.marketDataResult;

  if (result === undefined) {
    return {
      status: "not_configured",
      selectedProviderId: "polymarket",
      selectedMarket: null,
      dataFreshness: "unknown",
      connectionStatus: "disconnected",
      summary:
        "No normalized provider snapshot is loaded. The desktop shell is waiting for a safe read-only command boundary.",
    };
  }

  if (!result.ok) {
    return createErrorMarketDataView(result.error);
  }

  if (!isLiveMarketDataSource(result.value.source)) {
    return {
      status: "non_live_fixture",
      selectedProviderId: result.value.data.marketRef.providerId,
      selectedMarket: null,
      dataFreshness: "invalid",
      connectionStatus: "invalid",
      sourceKind: result.value.source.kind,
      summary:
        "A non-live market-data source was supplied. The shell blocks it from appearing as provider success.",
    };
  }

  const snapshot = result.value.data;

  if (snapshot.freshness !== "fresh") {
    return {
      status: snapshot.freshness,
      selectedProviderId: snapshot.marketRef.providerId,
      selectedMarket: null,
      dataFreshness: snapshot.freshness,
      connectionStatus:
        snapshot.freshness === "stale"
          ? "stale"
          : snapshot.freshness === "disconnected"
            ? "disconnected"
            : "invalid",
      sourceKind: result.value.source.kind,
      summary:
        "Provider snapshot is not fresh. Ladder display remains read-only and order submission is blocked.",
    };
  }

  return {
    status: "fresh",
    selectedProviderId: snapshot.marketRef.providerId,
    selectedMarket: {
      providerId: snapshot.marketRef.providerId,
      marketId: snapshot.marketRef.marketId,
      outcomeId: snapshot.marketRef.outcomeId,
      title: input.selectedMarketTitle ?? snapshot.marketRef.marketId,
      outcomeLabel: snapshot.marketRef.outcomeId,
      currency: snapshot.marketRef.currency,
      tickSize: snapshot.marketRef.tickSize,
      capturedAt: snapshot.capturedAt,
    },
    dataFreshness: "fresh",
    connectionStatus: "connected",
    sourceKind: result.value.source.kind,
    summary:
      "Fresh normalized provider snapshot loaded through the read-only market-data contract. Execution remains disabled.",
  };
}

function createMarketDataViewFromCommand(
  response: MarketGetOrderBookCommandResponse,
  workflow: MarketDataWorkflowState,
): MarketDataView {
  const selectedProviderId =
    response.providerId ?? workflow.selected?.market.providerId ?? "polymarket";

  if (response.orderBook !== undefined && response.sourceKind !== "official_live") {
    const view: MarketDataView = {
      status: "non_live_fixture",
      selectedProviderId: response.orderBook.marketRef.providerId,
      selectedMarket: null,
      dataFreshness: "invalid",
      connectionStatus: "invalid",
      summary:
        "A non-live market-data source reached the renderer. The shell blocks it from appearing as provider success.",
    };

    return response.sourceKind === undefined
      ? view
      : { ...view, sourceKind: response.sourceKind };
  }

  if (response.orderBook !== undefined) {
    const orderBook = response.orderBook;
    const selected = workflow.selected;
    const status =
      response.status === "connected" && orderBook.freshness === "fresh"
        ? "fresh"
        : response.status === "stale" || orderBook.freshness === "stale"
          ? "stale"
          : mapConnectionStatusToMarketDataStatus(response.status);

    const view: MarketDataView = {
      status,
      selectedProviderId: orderBook.marketRef.providerId,
      selectedMarket: {
        providerId: orderBook.marketRef.providerId,
        marketId: orderBook.marketRef.marketId,
        outcomeId: orderBook.marketRef.outcomeId,
        outcomeLabel: selected?.outcome.label ?? orderBook.marketRef.outcomeId,
        title: selected?.market.title ?? orderBook.marketRef.marketId,
        currency: orderBook.marketRef.currency,
        tickSize: orderBook.tickSize,
        capturedAt: orderBook.capturedAt,
      },
      dataFreshness: orderBook.freshness,
      connectionStatus: response.status,
      summary: response.message,
    };

    return { ...view, sourceKind: "official_live" };
  }

  const view: MarketDataView = {
    status: mapConnectionStatusToMarketDataStatus(response.status),
    selectedProviderId,
    selectedMarket: null,
    dataFreshness: response.freshness,
    connectionStatus: response.status,
    summary: response.message,
  };

  return response.errorReason === undefined
    ? view
    : { ...view, errorReason: response.errorReason };
}

function createErrorMarketDataView(error: MarketDataAdapterError): MarketDataView {
  const state = mapMarketDataError(error.reason);
  const selectedProviderId = resolveMarketDataErrorProviderId(error);

  return {
    status: state.status,
    selectedProviderId,
    selectedMarket: null,
    dataFreshness: state.freshness,
    connectionStatus: state.connectionStatus,
    errorReason: error.reason,
    summary: `Read-only provider data unavailable for ${selectedProviderId}: ${error.reason.replace(/_/g, " ")}.`,
  };
}

function resolveMarketDataErrorProviderId(error: MarketDataAdapterError): ProviderId {
  const providerId = error.providerMetadata?.providerId;

  if (providerId === "polymarket" || providerId === "kalshi") {
    return providerId;
  }

  return "polymarket";
}

function mapMarketDataError(reason: MarketDataAdapterErrorReason): {
  status: MarketDataViewStatus;
  freshness: DataFreshness | "unknown";
  connectionStatus: MarketDataConnectionStatus;
} {
  if (reason === "stale_data") {
    return { status: "stale", freshness: "stale", connectionStatus: "stale" };
  }

  if (reason === "network_error" || reason === "websocket_disconnected") {
    return {
      status: "disconnected",
      freshness: "disconnected",
      connectionStatus: "disconnected",
    };
  }

  if (
    reason === "provider_credentials_required"
  ) {
    return {
      status: "credentials-required",
      freshness: "unknown",
      connectionStatus: "credentials-required",
    };
  }

  if (reason === "provider_status_unknown") {
    return {
      status: "provider-error",
      freshness: "unknown",
      connectionStatus: "provider-error",
    };
  }

  if (reason === "provider_not_supported" || reason === "unsupported_market") {
    return { status: "blocked", freshness: "unknown", connectionStatus: "blocked" };
  }

  if (reason === "market_not_found" || reason === "outcome_not_found") {
    return {
      status: "unavailable",
      freshness: "unknown",
      connectionStatus: "unavailable",
    };
  }

  return { status: "invalid", freshness: "invalid", connectionStatus: "invalid" };
}

function mapConnectionStatusToMarketDataStatus(
  status: MarketDataConnectionStatus,
): MarketDataViewStatus {
  switch (status) {
    case "connected":
      return "fresh";
    case "connecting":
    case "reconnecting":
      return "loading";
    case "stale":
      return "stale";
    case "disconnected":
      return "disconnected";
    case "invalid":
      return "invalid";
    case "blocked":
      return "blocked";
    case "credentials-required":
      return "credentials-required";
    case "unavailable":
      return "unavailable";
    case "provider-error":
      return "provider-error";
  }
}

function getLadderStateFromMarketData(marketData: MarketDataView): LadderStateId {
  if (marketData.status === "fresh") {
    return "fresh";
  }

  if (marketData.status === "loading") {
    return "loading";
  }

  if (marketData.status === "stale") {
    return "stale";
  }

  if (marketData.status === "disconnected") {
    return "disconnected";
  }

  if (marketData.status === "not_configured") {
    return "no_market";
  }

  if (marketData.status === "unavailable") {
    return "empty";
  }

  return "error";
}

function createLadderRowsFromMarketData(
  input: DesktopTerminalStateInput,
  marketData: MarketDataView,
): readonly LadderDisplayRow[] {
  const commandOrderBook = input.workflow?.orderBook?.orderBook;

  if (
    commandOrderBook !== undefined &&
    input.workflow?.orderBook?.sourceKind === "official_live" &&
    (marketData.status === "fresh" || marketData.status === "stale")
  ) {
    return buildLadderRows(commandOrderBook).map((row, index) => ({
      level: index + 1,
      price: row.price,
      status: "provider_snapshot",
      isBestBid: row.isBestBid,
      isBestAsk: row.isBestAsk,
      ...(row.bidSize !== undefined ? { bidSize: row.bidSize } : {}),
      ...(row.askSize !== undefined ? { askSize: row.askSize } : {}),
    }));
  }

  const result = input.marketDataResult;

  if (result === undefined || !result.ok || marketData.status !== "fresh") {
    return createPlaceholderLadderRows();
  }

  return buildLadderRows(result.value.data).map((row, index) => ({
    level: index + 1,
    price: row.price,
    status: "provider_snapshot",
    isBestBid: row.isBestBid,
    isBestAsk: row.isBestAsk,
    ...(row.bidSize !== undefined ? { bidSize: row.bidSize } : {}),
    ...(row.askSize !== undefined ? { askSize: row.askSize } : {}),
  }));
}

export function canSubmitOrders(state: DesktopTerminalState = createDesktopTerminalState()) {
  return state.boundary.liveExecutionPathExposed;
}

export function getDesktopShellSafetyEvidence(
  state: DesktopTerminalState = createDesktopTerminalState(),
) {
  const metrics = state.metrics.flatMap((group) => group.metrics);

  return {
    providerIds: state.providers.map((provider) => provider.id),
    modeledConnectionStates: desktopMarketConnectionStateIds,
    requiredLadderStateIds: state.ladder.states.map((ladderState) => ladderState.id),
    defaultExecutionMode: state.execution.currentMode,
    oneClickArmed: state.execution.oneClick.armed,
    allMetricsUnknown: metrics.every(
      (metric) => metric.status === "unknown" && metric.value === null,
    ),
    noProviderMarketSearchCalls: state.marketSearch.canQueryExternalApis === false,
    noOpenOrdersLoaded: state.openOrders.rows.length === 0,
    noAuditEventsLoaded: state.auditLog.rows.length === 0,
    noOrderSubmissionPath: !canSubmitOrders(state),
    noLiveSubmissionPath: !canSubmitOrders(state),
    rendererPrivilegeFree:
      !state.boundary.rendererExternalApiAccess &&
      !state.boundary.rendererFilesystemAccess &&
      !state.boundary.rendererShellAccess &&
      !state.boundary.rendererProviderSdkAccess &&
      !state.boundary.rendererCredentialAccess,
  };
}

function createOrderPreviewView(
  orderEntry: OrderEntryState,
  liveGateStatus?: LiveGateStatusCommandResponse | null,
  livePreflightProvider?: LivePreflightProviderStatus | null,
): DesktopTerminalState["orderPreview"] {
  const intent = orderEntry.latestIntent;
  const validation = orderEntry.validation;
  const liveGateBlockers = createLiveGateBlockers(
    orderEntry,
    liveGateStatus,
    livePreflightProvider,
  );
  const canSubmitLocal =
    intent !== null &&
    validation?.status === "approved" &&
    (orderEntry.executionMode === "paper" ||
      orderEntry.executionMode === "live_dry_run");
  const canSubmitLive =
    intent !== null &&
    validation?.status === "approved" &&
    orderEntry.executionMode === "live" &&
    liveGateBlockers.length === 0;

  return {
    status: orderEntry.lastAction === "idle" ? "empty" : orderEntry.lastAction,
    canSubmit: canSubmitLocal || canSubmitLive,
    canSubmitLocal,
    canSubmitLive,
    intent,
    validationReasons: orderEntry.validationReasons,
    summary: createOrderPreviewSummary(orderEntry, {
      canSubmitLive,
      canSubmitLocal,
      liveGateBlockers,
    }),
  };
}

function toLiveGateReason(reason: string): LiveGateReason {
  return reason as LiveGateReason;
}

function uniqueLiveReasons(reasons: readonly string[]): readonly LiveGateReason[] {
  return [...new Set(reasons.map(toLiveGateReason))];
}

function createOpenOrdersView(
  orderEntry: OrderEntryState,
): DesktopTerminalState["openOrders"] {
  if (orderEntry.openOrders.length === 0) {
    return {
      status: "empty",
      rows: [],
      summary:
        "No paper orders are open. No live provider order data is present.",
    };
  }

  const liveOrderCount = orderEntry.openOrders.filter(
    (order) => order.providerMetadata?.source === "live_provider",
  ).length;
  const paperOrderCount = orderEntry.openOrders.length - liveOrderCount;

  if (liveOrderCount > 0 && paperOrderCount === 0) {
    return {
      status: "live_provider_orders",
      rows: orderEntry.openOrders,
      summary: `${liveOrderCount} live provider order record(s) are open in this local session. Use manual cancellation when needed.`,
    };
  }

  if (liveOrderCount > 0) {
    return {
      status: "mixed_orders",
      rows: orderEntry.openOrders,
      summary: `${liveOrderCount} live provider order record(s) and ${paperOrderCount} local paper order record(s) are open.`,
    };
  }

  return {
    status: "paper_orders",
    rows: orderEntry.openOrders,
    summary: `${orderEntry.openOrders.length} local paper order record(s) are open. No provider order was submitted.`,
  };
}

function createAuditLogView(
  orderEntry: OrderEntryState,
): DesktopTerminalState["auditLog"] {
  if (orderEntry.auditEvents.length === 0) {
    return {
      status: "empty",
      rows: [],
      summary:
        "No audit events recorded yet. Ladder previews will append redacted local audit events.",
    };
  }

  return {
    status: "ready",
    rows: orderEntry.auditEvents.slice(-8).reverse(),
    summary: `${orderEntry.auditEvents.length} redacted local audit event(s) recorded.`,
  };
}

function createOrderPreviewSummary(
  orderEntry: OrderEntryState,
  input: {
    canSubmitLocal: boolean;
    canSubmitLive: boolean;
    liveGateBlockers: readonly LiveGateReason[];
  },
): string {
  if (orderEntry.latestIntent === null) {
    return "Click a Back or Lay ladder cell to create a provider-neutral order intent preview.";
  }

  if (orderEntry.validation?.status === "rejected") {
    return `Order intent rejected by deterministic validation: ${orderEntry.validation.reasons.join(", ")}.`;
  }

  if (input.canSubmitLocal && orderEntry.executionMode === "paper") {
    return "Order intent validated. Confirming creates a local paper order only.";
  }

  if (input.canSubmitLocal && orderEntry.executionMode === "live_dry_run") {
    return "Order intent validated. Confirming runs a live-style dry-run check without external submission.";
  }

  if (input.canSubmitLive) {
    return "Order intent validated and live gates are ready; live submit must use the narrow Tauri command boundary.";
  }

  if (orderEntry.executionMode === "live") {
    return `Live submit is disabled by: ${input.liveGateBlockers.join(", ")}.`;
  }

  return "Order intent is in preview state. Real live submission is blocked unless every live gate passes.";
}

function createRiskSummary(orderEntry: OrderEntryState): string {
  if (orderEntry.validation?.status === "rejected") {
    return `Recent validation blocked the intent: ${orderEntry.validation.reasons.join(", ")}.`;
  }

  if (orderEntry.validation?.status === "approved") {
    return "Recent validation passed local risk checks for the selected execution mode.";
  }

  return "Risk limits are configured for the local order-intent harness; no order intent exists yet.";
}

function createStakePreset(
  label: string,
  value: number,
  orderEntry: OrderEntryState,
): StakePreset {
  return {
    label,
    value,
    currency: "provider_currency",
    selectable: true,
    selected: orderEntry.selectedStakeAmount === label,
  };
}

function toDesktopExecutionModeId(
  mode: DesktopOrderExecutionMode,
): DesktopExecutionModeId {
  return mode === "live_blocked" ? "live" : mode;
}

function createUnknownMetrics(): readonly MetricPlaceholder[] {
  return [
    {
      key: "pnl",
      status: "unknown",
      value: null,
      displayValue: "Unknown",
      reason: unknownMetricReason,
    },
    {
      key: "available_funds",
      status: "unknown",
      value: null,
      displayValue: "Unknown",
      reason: unknownMetricReason,
    },
    {
      key: "open_order_amount",
      status: "unknown",
      value: null,
      displayValue: "Unknown",
      reason: unknownMetricReason,
    },
    {
      key: "exposure",
      status: "unknown",
      value: null,
      displayValue: "Unknown",
      reason: unknownMetricReason,
    },
  ];
}

function createProviderMetrics(
  accountMetrics?: LivePreflightProviderStatus["accountMetrics"],
): readonly MetricPlaceholder[] {
  if (accountMetrics?.status !== "ready") {
    return createUnknownMetrics();
  }

  return [
    unknownMetric("pnl", "Provider PnL is not exposed by the current account metrics response."),
    metricFromAmount(
      "available_funds",
      accountMetrics.availableFunds,
      "Authenticated provider available funds were returned by Tauri.",
    ),
    metricFromAmount(
      "open_order_amount",
      accountMetrics.openOrderAmount,
      "Authenticated provider open-order amount was returned by Tauri.",
    ),
    metricFromAmount(
      "exposure",
      accountMetrics.providerExposure,
      "Authenticated provider exposure was returned by Tauri.",
    ),
  ];
}

function createMarketMetrics(
  accountMetrics?: LivePreflightProviderStatus["accountMetrics"],
): readonly MetricPlaceholder[] {
  if (accountMetrics?.status !== "ready") {
    return createUnknownMetrics();
  }

  return [
    unknownMetric("pnl", "Market PnL is not exposed by the current account metrics response."),
    metricFromAmount(
      "available_funds",
      accountMetrics.availableFunds,
      "Authenticated available funds were returned by Tauri for the selected provider.",
    ),
    metricFromAmount(
      "open_order_amount",
      accountMetrics.openOrderAmount,
      "Authenticated provider open-order amount was returned by Tauri for the selected provider.",
    ),
    metricFromAmount(
      "exposure",
      accountMetrics.marketExposure,
      "Authenticated market exposure was returned by Tauri.",
    ),
  ];
}

function metricFromAmount(
  key: MetricKey,
  amount: { amount: DecimalString; currency: string } | undefined,
  reason: string,
): MetricPlaceholder {
  if (amount === undefined) {
    return unknownMetric(key, unknownMetricReason);
  }

  return {
    key,
    status: "ready",
    value: amount.amount,
    displayValue: `${amount.amount} ${amount.currency}`,
    reason,
  };
}

function unknownMetric(key: MetricKey, reason: string): MetricPlaceholder {
  return {
    key,
    status: "unknown",
    value: null,
    displayValue: "Unknown",
    reason,
  };
}

function formatProviderLabel(providerId: ProviderId): string {
  return providerId === "polymarket" ? "Polymarket" : "Kalshi";
}

const ladderStateSummaries: Record<LadderStateId, string> = {
  disconnected:
    "Provider connection is disconnected; ladder interaction remains blocked.",
  empty: "Provider returned no order-book levels; no liquidity is invented.",
  error: "Adapter or validation error state; no order path is available.",
  fresh: "Fresh normalized provider snapshot is loaded; execution remains disabled.",
  loading: "Market or order-book data is loading; no placeholder liquidity is shown.",
  no_market: "No market is selected; the ladder is waiting for provider data.",
  stale: "Snapshot age is stale; risk-increasing actions remain blocked.",
};

const executionModeSummaries: Record<DesktopExecutionModeId, string> = {
  disabled: "Default mode. No order placement is possible.",
  live:
    "Live mode exposes the narrow Tauri submit path only after legal, geo, credential, risk, audit, adapter, non-marketable, and acknowledgement gates pass.",
  live_dry_run:
    "Dry-run runs live-style validation and local audit checks without external provider submission.",
  paper: "Paper mode can create local paper order records only; no provider order is submitted.",
};
