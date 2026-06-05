import {
  type NormalizedOrder,
  type OrderIntent,
  type ProviderId,
  type TradableMarketRef,
} from "@prediction-ladder/core";
import {
  createInMemoryAuditLog,
  createSystemAuditEventFactory,
  type AuditEventFactory,
  type AuditLog,
} from "@prediction-ladder/execution";
import {
  applyDocumentLocale,
  getMessages,
  isLocaleCode,
  persistBrowserLocale,
  resolveBrowserLocale,
  supportedLocales,
  type AppMessages,
  type LocaleCode,
} from "@prediction-ladder/i18n";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type UIEvent,
} from "react";

import {
  createDesktopTerminalState,
  type DesktopTerminalState,
  type ExecutionModeOption,
  type LadderDisplayRow,
  type MarketSearchResultView,
  type MetricGroup,
} from "./appConfig";
import { tauriLiveExecutionCommandClient } from "./liveExecutionCommands";
import type {
  LegalApprovalStatusCommandResponse,
  LegalApprovalSubmitRequest,
  LiveGateStatusCommandResponse,
  LiveOrderCommandResponse,
  LiveOrderSubmitRequest,
} from "./liveExecutionCommands";
import { tauriMarketDataCommandClient } from "./marketDataCommands";
import {
  hasPositiveProviderMetricAmount,
  selectPolymarketAutoApplyCandidate,
  tauriProviderOnboardingCommandClient,
  type LivePreflightStatusCommandResponse,
  type LivePreflightStatusCommandRequest,
  type PolymarketAccountCandidateApplyRequest,
  type PolymarketSignatureType,
  type ProviderCredentialConnectRequest,
  type ProviderMetricAmount,
  type ProviderOnboardingStatusCommandResponse,
} from "./providerOnboardingCommands";
import {
  beginMarketSearch,
  beginMarketSelection,
  beginLoadMoreMarketSearch,
  canLoadMoreMarketSearch,
  createInitialMarketDataWorkflowState,
  loadSelectedMarketWorkflow,
  runLoadMoreMarketSearch,
  runMarketSearch,
  type MarketDataWorkflowState,
  type MarketOutcomeSelection,
  type MarketProviderFilter,
} from "./marketDataWorkflow";
import {
  createOrderValidationAlertState,
  type OrderValidationAlertState,
} from "./orderValidationAlertModel";
import {
  createInitialOrderEntryState,
  previewOrderFromLadderCell,
  selectOrderEntryExecutionMode,
  selectOrderEntryStakeAmount,
  selectOrderEntryStakePreset,
  submitOrderEntryPreview,
  type DesktopOrderExecutionMode,
  type LadderIntentColumn,
  type OrderEntryState,
} from "./orderIntentWorkflow";
import {
  formatOrderRejectionReasonCode,
  getOrderRejectionReasonMessage,
} from "./riskAlertMessages";

type TerminalMessages = AppMessages["desktop"]["terminal"];
type ProviderOnboardingMessages = TerminalMessages["providerOnboarding"];
type LegalApprovalMessages = TerminalMessages["legalApproval"];
type OnboardingProviderId = "polymarket" | "kalshi";
type CredentialWizardStep = "guide" | "reference" | "review";
type LegalApprovalCheckKey = keyof LegalApprovalSubmitRequest["checks"];
type LiveOrderWorkflowResult = {
  submit: LiveOrderCommandResponse | null;
  cancel: LiveOrderCommandResponse | null;
};

const CREDENTIAL_WIZARD_STEPS: readonly CredentialWizardStep[] = [
  "guide",
  "reference",
  "review",
];
const LEGAL_APPROVAL_CHECK_KEYS: readonly LegalApprovalCheckKey[] = [
  "platformEligible",
  "realOperator",
  "realBeneficialOwners",
  "realAccountOwner",
  "noGeoblockBypass",
  "noVpnBypass",
  "noFakeKyc",
  "noSanctionsBypass",
  "noCustody",
  "c0ReviewPass",
  "c1RiskAccepted",
  "auditEnabled",
  "firstLiveSmokeOnly",
  "noDepositsOrWithdrawals",
  "understandsRisk",
];
const MARKET_RAIL_PROVIDER_ID: OnboardingProviderId = "polymarket";
const MARKET_RAIL_PROVIDER_FILTER: MarketProviderFilter = MARKET_RAIL_PROVIDER_ID;

export function App() {
  const [locale, setLocale] = useState<LocaleCode>(() => resolveBrowserLocale());
  const [workflow, setWorkflow] = useState(createInitialMarketDataWorkflowState);
  const [orderEntry, setOrderEntry] = useState(createInitialOrderEntryState);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveGateStatus, setLiveGateStatus] =
    useState<LiveGateStatusCommandResponse | null>(null);
  const [legalApprovalStatus, setLegalApprovalStatus] =
    useState<LegalApprovalStatusCommandResponse | null>(null);
  const [providerOnboardingStatus, setProviderOnboardingStatus] =
    useState<ProviderOnboardingStatusCommandResponse | null>(null);
  const [livePreflightStatus, setLivePreflightStatus] =
    useState<LivePreflightStatusCommandResponse | null>(null);
  const [polymarketSignerFilePath, setPolymarketSignerFilePath] = useState("");
  const [polymarketTradingAddress, setPolymarketTradingAddress] = useState("");
  const [polymarketSignatureType, setPolymarketSignatureType] =
    useState<PolymarketSignatureType>("proxy");
  const [kalshiApiKeyId, setKalshiApiKeyId] = useState("");
  const [kalshiKeyFilePath, setKalshiKeyFilePath] = useState("");
  const [credentialWizardProviderId, setCredentialWizardProviderId] =
    useState<OnboardingProviderId | null>(null);
  const [credentialWizardStep, setCredentialWizardStep] =
    useState<CredentialWizardStep>("guide");
  const [legalApprovalWizardProviderId, setLegalApprovalWizardProviderId] =
    useState<OnboardingProviderId | null>(null);
  const [liveOrderSubmitting, setLiveOrderSubmitting] = useState(false);
  const [liveOrderCancellingId, setLiveOrderCancellingId] = useState<string | null>(
    null,
  );
  const [liveOrderResult, setLiveOrderResult] =
    useState<LiveOrderWorkflowResult | null>(null);
  const [orderValidationAlert, setOrderValidationAlert] =
    useState<OrderValidationAlertState | null>(null);
  const workflowRequestIdRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const auditLogRef = useRef<AuditLog>(createInMemoryAuditLog());
  const auditEventFactoryRef = useRef<AuditEventFactory>(
    createSystemAuditEventFactory(),
  );
  const terminalState = useMemo(
    () =>
      createDesktopTerminalState({
        workflow,
        orderEntry,
        liveGateStatus,
        livePreflightStatus,
        providerOnboardingStatus,
      }),
    [
      liveGateStatus,
      livePreflightStatus,
      orderEntry,
      providerOnboardingStatus,
      workflow,
    ],
  );
  const activeLegalApprovalProviderId =
    resolveActiveLegalApprovalProviderId(terminalState);
  const activeLegalApprovalStatus = selectLegalApprovalStatusForProvider(
    legalApprovalStatus,
    activeLegalApprovalProviderId,
  );
  const messages = getMessages(locale);

  useEffect(() => {
    applyDocumentLocale(locale);
    persistBrowserLocale(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    void tauriLiveExecutionCommandClient
      .liveGateStatus({
        providerId: terminalState.selectedProviderId,
        explicitLiveAck: orderEntry.firstLiveAck,
        auditLogEnabled: orderEntry.auditLogEnabled,
        killSwitchActive: orderEntry.killSwitchActive,
      })
      .then((response) => {
        if (!cancelled) {
          setLiveGateStatus(response);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    orderEntry.auditLogEnabled,
    orderEntry.firstLiveAck,
    orderEntry.killSwitchActive,
    terminalState.selectedProviderId,
  ]);

  useEffect(() => {
    let cancelled = false;

    void tauriLiveExecutionCommandClient
      .legalApprovalStatus({ providerId: activeLegalApprovalProviderId })
      .then((response) => {
        if (!cancelled) {
          setLegalApprovalStatus(response);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeLegalApprovalProviderId]);

  useEffect(() => {
    let cancelled = false;
    const selectedMarket = terminalState.selectedMarket;

    void tauriProviderOnboardingCommandClient
      .status(
        selectedMarket === null
          ? { providerId: MARKET_RAIL_PROVIDER_ID }
          : {
              providerId: MARKET_RAIL_PROVIDER_ID,
              marketId: selectedMarket.marketId,
            },
      )
      .then(applyPolymarketAutoCandidateIfNeeded)
      .then((response) => {
        if (!cancelled) {
          setProviderOnboardingStatus(response);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [terminalState.selectedMarket?.marketId]);

  useEffect(() => {
    if (credentialWizardProviderId === null) {
      return undefined;
    }

    function handleCredentialWizardKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCredentialWizardProviderId(null);
      }
    }

    window.addEventListener("keydown", handleCredentialWizardKeyDown);

    return () => {
      window.removeEventListener("keydown", handleCredentialWizardKeyDown);
    };
  }, [credentialWizardProviderId]);

  useEffect(() => {
    if (legalApprovalWizardProviderId === null) {
      return undefined;
    }

    function handleLegalApprovalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLegalApprovalWizardProviderId(null);
      }
    }

    window.addEventListener("keydown", handleLegalApprovalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleLegalApprovalKeyDown);
    };
  }, [legalApprovalWizardProviderId]);

  useEffect(() => {
    if (orderValidationAlert === null) {
      return undefined;
    }

    function handleOrderValidationAlertKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOrderValidationAlert(null);
      }
    }

    window.addEventListener("keydown", handleOrderValidationAlertKeyDown);

    return () => {
      window.removeEventListener("keydown", handleOrderValidationAlertKeyDown);
    };
  }, [orderValidationAlert]);

  useEffect(() => {
    let cancelled = false;

    void tauriProviderOnboardingCommandClient
      .preflightStatus(createLivePreflightRequest(terminalState, orderEntry))
      .then((response) => {
        if (!cancelled) {
          setLivePreflightStatus(response);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    orderEntry.auditLogEnabled,
    orderEntry.firstLiveAck,
    orderEntry.killSwitchActive,
    orderEntry.maxMarketExposure,
    orderEntry.maxStakePerOrder,
    orderEntry.selectedStakeAmount,
    terminalState.dataFreshness,
    terminalState.selectedMarket,
    terminalState.selectedProviderId,
  ]);

  useEffect(() => {
    const requestId = workflowRequestIdRef.current + 1;
    workflowRequestIdRef.current = requestId;
    const pendingWorkflow = beginMarketSearch(
      createInitialMarketDataWorkflowState(),
      "",
      MARKET_RAIL_PROVIDER_FILTER,
    );
    setWorkflow(pendingWorkflow);

    void runMarketSearch(
      tauriMarketDataCommandClient,
      pendingWorkflow,
      "",
      MARKET_RAIL_PROVIDER_FILTER,
    ).then((nextWorkflow) => {
      if (workflowRequestIdRef.current === requestId) {
        setWorkflow(nextWorkflow);
      }
    });
  }, []);

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.currentTarget.value;

    if (isLocaleCode(nextLocale)) {
      setLocale(nextLocale);
    }
  }

  function handleSearchQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.currentTarget.value);
  }

  async function requestMarketSearch(query: string) {
    const requestId = workflowRequestIdRef.current + 1;
    workflowRequestIdRef.current = requestId;
    const pendingWorkflow = beginMarketSearch(
      workflow,
      query,
      MARKET_RAIL_PROVIDER_FILTER,
    );
    setWorkflow(pendingWorkflow);

    const nextWorkflow = await runMarketSearch(
      tauriMarketDataCommandClient,
      pendingWorkflow,
      query,
      MARKET_RAIL_PROVIDER_FILTER,
    );
    if (workflowRequestIdRef.current === requestId) {
      setWorkflow(nextWorkflow);
    }
  }

  async function handleMarketSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await requestMarketSearch(searchQuery.trim());
  }

  async function handleLoadMoreMarkets() {
    if (!canLoadMoreMarketSearch(workflow) || loadMoreInFlightRef.current) {
      return;
    }

    loadMoreInFlightRef.current = true;
    const requestId = workflowRequestIdRef.current + 1;
    workflowRequestIdRef.current = requestId;
    const currentWorkflow = workflow;
    const pendingWorkflow = beginLoadMoreMarketSearch(currentWorkflow);
    setWorkflow(pendingWorkflow);

    try {
      const nextWorkflow = await runLoadMoreMarketSearch(
        tauriMarketDataCommandClient,
        currentWorkflow,
      );
      if (workflowRequestIdRef.current === requestId) {
        setWorkflow(nextWorkflow);
      }
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }

  function handleMarketResultsScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceFromBottom < 96) {
      void handleLoadMoreMarkets();
    }
  }

  async function handleOutcomeSelection(selection: MarketOutcomeSelection) {
    const requestId = workflowRequestIdRef.current + 1;
    workflowRequestIdRef.current = requestId;
    const pendingWorkflow = beginMarketSelection(workflow, selection);
    setWorkflow(pendingWorkflow);

    const nextWorkflow = await loadSelectedMarketWorkflow(
      tauriMarketDataCommandClient,
      pendingWorkflow,
      selection,
    );
    if (workflowRequestIdRef.current === requestId) {
      setWorkflow(nextWorkflow);
    }
  }

  function handleExecutionModeChange(executionMode: DesktopOrderExecutionMode) {
    setOrderValidationAlert(null);
    setOrderEntry((current) =>
      selectOrderEntryExecutionMode(current, executionMode),
    );
  }

  function handleStakePresetSelect(amount: string) {
    setOrderValidationAlert(null);
    setOrderEntry((current) => selectOrderEntryStakePreset(current, amount));
  }

  function handleStakeAmountChange(amount: string) {
    setOrderValidationAlert(null);
    setOrderEntry((current) => selectOrderEntryStakeAmount(current, amount));
  }

  async function handleLadderCellClick(
    row: LadderDisplayRow,
    column: LadderIntentColumn,
  ) {
    if (row.status !== "provider_snapshot") {
      return;
    }

    const preflight = await refreshLivePreflightSnapshot(orderEntry);
    const readinessOrderEntry = createOrderEntryWithTauriReadiness(
      orderEntry,
      terminalState,
      liveGateStatus,
      preflight,
    );
    const nextOrderEntry = await previewOrderFromLadderCell({
      auditLog: auditLogRef.current,
      column,
      eventFactory: auditEventFactoryRef.current,
      orderEntry: readinessOrderEntry,
      price: row.price,
      workflow,
    });

    setOrderEntry(nextOrderEntry);
    setOrderValidationAlert(
      createOrderValidationAlertState(nextOrderEntry, terminalState, preflight),
    );
    setLiveOrderResult(null);
  }

  async function handleSubmitOrderPreview() {
    const preflight = await refreshLivePreflightSnapshot(orderEntry);
    const readinessOrderEntry = createOrderEntryWithTauriReadiness(
      orderEntry,
      terminalState,
      liveGateStatus,
      preflight,
    );
    const nextOrderEntry = await submitOrderEntryPreview({
      auditLog: auditLogRef.current,
      eventFactory: auditEventFactoryRef.current,
      orderEntry: readinessOrderEntry,
      workflow,
    });

    setOrderEntry(nextOrderEntry);
    setOrderValidationAlert(
      createOrderValidationAlertState(nextOrderEntry, terminalState, preflight),
    );
  }

  async function handleSubmitLiveOrder() {
    const currentIntent = orderEntry.latestIntent;
    if (currentIntent === null) {
      setLiveOrderResult({
        submit: createRendererBlockedLiveOrderResponse(
          terminalState.selectedProviderId,
          ["order_intent_missing"],
        ),
        cancel: null,
      });
      return;
    }

    setLiveOrderSubmitting(true);
    try {
      const refreshedWorkflow =
        workflow.selected === null
          ? workflow
          : await loadSelectedMarketWorkflow(
              tauriMarketDataCommandClient,
              workflow,
              workflow.selected,
            );
      setWorkflow(refreshedWorkflow);

      const refreshedTerminalState = createDesktopTerminalState({
        workflow: refreshedWorkflow,
        orderEntry,
        liveGateStatus,
        livePreflightStatus,
        providerOnboardingStatus,
      });
      const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
        createLivePreflightRequest(refreshedTerminalState, orderEntry),
      );
      setLivePreflightStatus(preflight);

      const readinessOrderEntry = createOrderEntryWithTauriReadiness(
        orderEntry,
        refreshedTerminalState,
        liveGateStatus,
        preflight,
      );
      const refreshedOrderEntry = await previewOrderFromLadderCell({
        auditLog: auditLogRef.current,
        column: currentIntent.side === "BUY" ? "bid" : "ask",
        eventFactory: auditEventFactoryRef.current,
        orderEntry: readinessOrderEntry,
        price: currentIntent.price,
        workflow: refreshedWorkflow,
      });
      setOrderEntry(refreshedOrderEntry);
      setOrderValidationAlert(
        createOrderValidationAlertState(
          refreshedOrderEntry,
          refreshedTerminalState,
          preflight,
        ),
      );

      const submitReadyOrderEntry = createOrderEntryWithTauriReadiness(
        refreshedOrderEntry,
        refreshedTerminalState,
        liveGateStatus,
        preflight,
      );
      const request = createLiveOrderSubmitRequest(
        refreshedTerminalState,
        submitReadyOrderEntry,
        preflight,
        refreshedWorkflow,
      );

      if (
        request === null ||
        request.side !== "BUY" ||
        request.marketable ||
        submitReadyOrderEntry.validation?.status !== "approved"
      ) {
        setLiveOrderResult({
          submit: createRendererBlockedLiveOrderResponse(
            refreshedTerminalState.selectedProviderId,
            request === null
              ? ["order_intent_missing"]
              : request.side !== "BUY"
                ? ["live_smoke_buy_only"]
                : request.marketable
                  ? ["marketable_order_blocked"]
                  : submitReadyOrderEntry.validationReasons,
          ),
          cancel: null,
        });
        return;
      }

      const submit = await tauriLiveExecutionCommandClient.orderSubmitLive(request);

      if (submit.status === "submitted" && submit.providerOrderId !== undefined) {
        const liveOrder = createLiveProviderOrderRecord(
          currentIntent,
          request,
          submit.providerOrderId,
          refreshedWorkflow,
        );
        setOrderEntry((current) => ({
          ...current,
          openOrders: [
            liveOrder,
            ...current.openOrders.filter((order) => order.id !== liveOrder.id),
          ],
        }));
      }

      setLiveOrderResult({ submit, cancel: null });
      await refreshLiveReadiness(request.providerId);
    } finally {
      setLiveOrderSubmitting(false);
    }
  }

  async function handleCancelLiveOrder(order: NormalizedOrder) {
    if (!isLiveProviderOrder(order)) {
      return;
    }

    setLiveOrderCancellingId(order.id);
    try {
      const cancel = await tauriLiveExecutionCommandClient.orderCancel({
        providerId: order.providerId,
        providerOrderId: order.id,
        marketId: order.marketRef.marketId,
      });

      setLiveOrderResult((current) =>
        current === null
          ? {
              submit: null,
              cancel,
            }
          : { ...current, cancel },
      );

      if (cancel.status === "cancelled") {
        setOrderEntry((current) => ({
          ...current,
          openOrders: current.openOrders.filter((openOrder) => openOrder.id !== order.id),
        }));
      }
      await refreshLiveReadiness(order.providerId);
    } finally {
      setLiveOrderCancellingId(null);
    }
  }

  function handleOpenCredentialWizard(providerId: OnboardingProviderId) {
    setCredentialWizardProviderId(providerId);
    setCredentialWizardStep("guide");
  }

  function handleCloseCredentialWizard() {
    setCredentialWizardProviderId(null);
  }

  async function handleProviderConnect(
    request: ProviderCredentialConnectRequest,
  ): Promise<void> {
    const onboarding = await applyPolymarketAutoCandidateIfNeeded(
      await tauriProviderOnboardingCommandClient.connect(request),
    );
    setProviderOnboardingStatus(onboarding);
    const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
      createLivePreflightRequest(terminalState, orderEntry),
    );
    setLivePreflightStatus(preflight);
    if (isProviderCredentialReady(onboarding, request.providerId)) {
      setCredentialWizardProviderId(null);
      handleOpenLegalApprovalWizard(request.providerId);
    }
  }

  async function handlePolymarketAccountCandidateApply(
    request: PolymarketAccountCandidateApplyRequest,
  ): Promise<void> {
    const onboarding =
      await tauriProviderOnboardingCommandClient.applyPolymarketAccountCandidate(
        request,
      );
    setProviderOnboardingStatus(onboarding);
    const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
      createLivePreflightRequest(terminalState, orderEntry),
    );
    setLivePreflightStatus(preflight);
    setPolymarketSignatureType(request.signatureType);
  }

  function handleOpenLegalApprovalWizard(
    providerId: OnboardingProviderId = activeLegalApprovalProviderId,
  ) {
    setLegalApprovalWizardProviderId(providerId);
    void tauriLiveExecutionCommandClient
      .legalApprovalStatus({ providerId })
      .then((response) => {
        setLegalApprovalStatus(response);
      });
  }

  function handleCloseLegalApprovalWizard() {
    setLegalApprovalWizardProviderId(null);
  }

  function handleFirstLiveAckChange(acknowledged: boolean) {
    setOrderEntry((current) => ({
      ...current,
      firstLiveAck: acknowledged,
    }));
  }

  async function refreshLiveReadiness(providerId: OnboardingProviderId) {
    const liveGate = await tauriLiveExecutionCommandClient.liveGateStatus({
      providerId,
      explicitLiveAck: orderEntry.firstLiveAck,
      auditLogEnabled: orderEntry.auditLogEnabled,
      killSwitchActive: orderEntry.killSwitchActive,
    });
    setLiveGateStatus(liveGate);
    const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
      createLivePreflightRequest(terminalState, orderEntry),
    );
    setLivePreflightStatus(preflight);
  }

  async function refreshLivePreflightSnapshot(
    orderEntrySnapshot: OrderEntryState,
  ): Promise<LivePreflightStatusCommandResponse> {
    const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
      createLivePreflightRequest(terminalState, orderEntrySnapshot),
    );
    setLivePreflightStatus(preflight);
    return preflight;
  }

  async function handleLegalApprovalSubmit(
    request: LegalApprovalSubmitRequest,
  ): Promise<LegalApprovalStatusCommandResponse> {
    const response =
      await tauriLiveExecutionCommandClient.legalApprovalSubmit(request);
    setLegalApprovalStatus(response);
    await refreshLiveReadiness(request.providerId);
    return response;
  }

  async function handleOpenPolymarketMagicExport(): Promise<void> {
    await tauriProviderOnboardingCommandClient.openCredentialReference({
      providerId: "polymarket",
      referenceId: "polymarket_magic_export",
    });
  }

  async function handlePolymarketClipboardImport(): Promise<void> {
    let onboarding =
      await tauriProviderOnboardingCommandClient.importPolymarketSignerFromClipboard({
        polymarketTradingAddress: polymarketTradingAddress.trim(),
        polymarketSignatureType,
      });

    onboarding = await applyPolymarketAutoCandidateIfNeeded(onboarding);

    setProviderOnboardingStatus(onboarding);
    if (
      onboarding.providers.some(
        (provider) =>
          provider.providerId === "polymarket" && provider.credential.status === "ready",
      )
    ) {
      setCredentialWizardStep("review");
    }
    const preflight = await tauriProviderOnboardingCommandClient.preflightStatus(
      createLivePreflightRequest(terminalState, orderEntry),
    );
    setLivePreflightStatus(preflight);
  }

  async function applyPolymarketAutoCandidateIfNeeded(
    onboarding: ProviderOnboardingStatusCommandResponse,
  ): Promise<ProviderOnboardingStatusCommandResponse> {
    const autoApplyCandidate = selectPolymarketAutoApplyCandidate(onboarding);
    if (autoApplyCandidate === null) {
      return onboarding;
    }

    const applied =
      await tauriProviderOnboardingCommandClient.applyPolymarketAccountCandidate(
        autoApplyCandidate,
      );
    setPolymarketSignatureType(autoApplyCandidate.signatureType);
    if (autoApplyCandidate.signatureType === "eoa") {
      setPolymarketTradingAddress("");
    }

    return applied;
  }

  return (
    <main className="terminal-shell" aria-label={messages.desktop.terminal.ariaLabel}>
      <TopCommandStrip
        locale={locale}
        messages={messages}
        onLocaleChange={handleLocaleChange}
        state={terminalState}
      />
      <div className="terminal-grid">
        <ProviderMarketRail
          messages={messages.desktop.terminal}
          query={searchQuery}
          state={terminalState}
          onLoadMore={handleLoadMoreMarkets}
          onOutcomeSelect={handleOutcomeSelection}
          onQueryChange={handleSearchQueryChange}
          onResultsScroll={handleMarketResultsScroll}
          onSearch={handleMarketSearch}
        />
        <LadderWorkspace
          messages={messages.desktop.terminal}
          state={terminalState}
          onLadderCellClick={handleLadderCellClick}
          onStakeAmountChange={handleStakeAmountChange}
          onStakePresetSelect={handleStakePresetSelect}
        />
        <RiskOrderRail
          legalApprovalProviderId={activeLegalApprovalProviderId}
          legalApprovalStatus={activeLegalApprovalStatus}
          liveOrderCancellingId={liveOrderCancellingId}
          liveOrderResult={liveOrderResult}
          liveOrderSubmitting={liveOrderSubmitting}
          messages={messages}
          state={terminalState}
          onCancelLiveOrder={handleCancelLiveOrder}
          onExecutionModeChange={handleExecutionModeChange}
          onFirstLiveAckChange={handleFirstLiveAckChange}
          onOpenLegalApprovalWizard={handleOpenLegalApprovalWizard}
          onOpenProviderWizard={handleOpenCredentialWizard}
          onPolymarketAccountCandidateApply={handlePolymarketAccountCandidateApply}
          onSubmitLiveOrder={handleSubmitLiveOrder}
          onSubmitOrderPreview={handleSubmitOrderPreview}
        />
      </div>
      <BottomStatusStrip messages={messages.desktop.terminal} state={terminalState} />
      {credentialWizardProviderId === null ? null : (
        <ProviderCredentialWizard
          kalshiApiKeyId={kalshiApiKeyId}
          kalshiKeyFilePath={kalshiKeyFilePath}
          messages={messages.desktop.terminal.providerOnboarding}
          providerId={credentialWizardProviderId}
          step={credentialWizardStep}
          polymarketSignerFilePath={polymarketSignerFilePath}
          polymarketSignatureType={polymarketSignatureType}
          polymarketTradingAddress={polymarketTradingAddress}
          state={terminalState}
          onClose={handleCloseCredentialWizard}
          onKalshiApiKeyIdChange={setKalshiApiKeyId}
          onKalshiKeyFilePathChange={setKalshiKeyFilePath}
          onOpenPolymarketMagicExport={handleOpenPolymarketMagicExport}
          onOpenLegalApprovalWizard={handleOpenLegalApprovalWizard}
          onProviderConnect={handleProviderConnect}
          onPolymarketAccountCandidateApply={handlePolymarketAccountCandidateApply}
          onPolymarketClipboardImport={handlePolymarketClipboardImport}
          onPolymarketSignerFilePathChange={setPolymarketSignerFilePath}
          onPolymarketSignatureTypeChange={setPolymarketSignatureType}
          onPolymarketTradingAddressChange={setPolymarketTradingAddress}
          onStepChange={setCredentialWizardStep}
        />
      )}
      {legalApprovalWizardProviderId === null ? null : (
        <LegalApprovalWizard
          firstLiveAck={orderEntry.firstLiveAck}
          legalApprovalStatus={selectLegalApprovalStatusForProvider(
            legalApprovalStatus,
            legalApprovalWizardProviderId,
          )}
          maxMarketExposure={orderEntry.maxMarketExposure}
          maxStakeFirstOrder={orderEntry.maxStakePerOrder}
          messages={messages.desktop.terminal.legalApproval}
          providerId={legalApprovalWizardProviderId}
          onClose={handleCloseLegalApprovalWizard}
          onFirstLiveAckChange={handleFirstLiveAckChange}
          onSubmit={handleLegalApprovalSubmit}
        />
      )}
      {orderValidationAlert === null ? null : (
        <OrderValidationAlert
          alert={orderValidationAlert}
          messages={messages.desktop.terminal}
          onClose={() => setOrderValidationAlert(null)}
        />
      )}
    </main>
  );
}

function isProviderCredentialReady(
  onboarding: ProviderOnboardingStatusCommandResponse,
  providerId: OnboardingProviderId,
): boolean {
  return onboarding.providers.some(
    (provider) =>
      provider.providerId === providerId && provider.credential.status === "ready",
  );
}

function createLivePreflightRequest(
  state: DesktopTerminalState,
  orderEntry: OrderEntryState,
): LivePreflightStatusCommandRequest {
  const selectedMarket = state.selectedMarket;

  return {
    providerId: state.selectedProviderId,
    ...(selectedMarket?.marketId !== undefined
      ? { marketId: selectedMarket.marketId }
      : {}),
    ...(selectedMarket?.outcomeId !== undefined
      ? { outcomeId: selectedMarket.outcomeId }
      : {}),
    selectedMarket: selectedMarket !== null,
    orderBookFreshness: state.dataFreshness,
    explicitLiveAck: orderEntry.firstLiveAck,
    auditLogEnabled: orderEntry.auditLogEnabled,
    killSwitchActive: orderEntry.killSwitchActive,
    stakeAmount: orderEntry.selectedStakeAmount,
    maxStakePerOrder: orderEntry.maxStakePerOrder,
    maxMarketExposure: orderEntry.maxMarketExposure,
    nonMarketable:
      orderEntry.latestIntent === null ? true : !orderEntry.latestIntent.marketable,
  };
}

function createOrderEntryWithTauriReadiness(
  orderEntry: OrderEntryState,
  state: DesktopTerminalState,
  liveGateStatus: LiveGateStatusCommandResponse | null,
  livePreflightStatus: LivePreflightStatusCommandResponse | null,
): OrderEntryState {
  const provider = livePreflightStatus?.providers.find(
    (candidate) => candidate.providerId === state.selectedProviderId,
  );
  const reasons = new Set([
    ...(liveGateStatus?.reasons ?? []),
    ...(provider?.reasons ?? []),
  ]);
  const accountMetrics = provider?.accountMetrics;
  const providerExposure =
    accountMetrics?.providerExposure?.amount ?? "unknown";
  const marketExposure = accountMetrics?.marketExposure?.amount ?? "unknown";
  const selectedMarketId = state.selectedMarket?.marketId;

  return {
    ...orderEntry,
    legalGateStatus:
      liveGateStatus?.legalGateStatus === "APPROVED" ? "approved" : "not_approved",
    geoGateStatus: reasons.has("geo_blocked")
      ? "blocked"
      : reasons.has("geo_unknown")
        ? "unknown"
        : liveGateStatus?.legalGateStatus === "APPROVED"
          ? "approved"
          : orderEntry.geoGateStatus,
    credentialStatus:
      liveGateStatus?.credentialSourceReady || provider?.credential.status === "ready"
        ? "ready"
        : "missing",
    localApprovalStatus:
      liveGateStatus?.localApprovalLoaded &&
      liveGateStatus.legalGateStatus === "APPROVED"
        ? "approved"
        : "missing",
    accountMetricsSourceStatus:
      liveGateStatus?.accountMetricsSourceReady ||
      accountMetrics?.status === "ready"
        ? "ready"
        : "missing",
    availableFunds: accountMetrics?.availableFunds?.amount ?? "unknown",
    providerExposure:
      providerExposure === "unknown"
        ? orderEntry.providerExposure
        : {
            ...orderEntry.providerExposure,
            [state.selectedProviderId]: providerExposure,
          },
    marketExposure:
      selectedMarketId === undefined || marketExposure === "unknown"
        ? orderEntry.marketExposure
        : {
            ...orderEntry.marketExposure,
            [selectedMarketId]: marketExposure,
          },
    c1ApprovalStatus: reasons.has("c1_approval_missing")
      ? "missing"
      : "approved",
    positionStatus:
      accountMetrics?.status === "ready"
        ? "available"
        : orderEntry.positionStatus,
    liveProviderAdapterConfigured: provider
      ? !provider.reasons.includes("provider_live_adapter_not_configured")
      : orderEntry.liveProviderAdapterConfigured,
  };
}

function createLiveOrderSubmitRequest(
  state: DesktopTerminalState,
  orderEntry: OrderEntryState,
  livePreflightStatus: LivePreflightStatusCommandResponse | null,
  workflow: MarketDataWorkflowState,
): LiveOrderSubmitRequest | null {
  const selectedMarket = state.selectedMarket;
  const intent = orderEntry.latestIntent;

  if (selectedMarket === null || intent === null) {
    return null;
  }

  const provider = livePreflightStatus?.providers.find(
    (candidate) => candidate.providerId === selectedMarket.providerId,
  );
  const metrics = provider?.accountMetrics;

  return {
    providerId: selectedMarket.providerId,
    marketId: selectedMarket.marketId,
    outcomeId: intent.marketRef.outcomeId ?? selectedMarket.outcomeId,
    side: intent.side,
    orderType: intent.type,
    timeInForce: intent.timeInForce,
    price: intent.price,
    stakeAmount: intent.stakeAmount.amount,
    stakeCurrency: intent.stakeAmount.currency,
    quantity: intent.quantity,
    marketable: intent.marketable,
    explicitLiveAck: orderEntry.firstLiveAck,
    auditLogEnabled: orderEntry.auditLogEnabled,
    killSwitchActive: orderEntry.killSwitchActive,
    selectedMarket: true,
    orderBookFreshness: state.dataFreshness,
    maxStakePerOrder: orderEntry.maxStakePerOrder,
    maxMarketExposure: orderEntry.maxMarketExposure,
    ...(workflow.orderBook?.orderBook?.minOrderSize === undefined
      ? {}
      : { minOrderSize: workflow.orderBook.orderBook.minOrderSize }),
    ...(metrics?.availableFunds?.amount === undefined
      ? {}
      : { availableFunds: metrics.availableFunds.amount }),
    ...(metrics?.providerExposure?.amount === undefined
      ? {}
      : { providerExposure: metrics.providerExposure.amount }),
    ...(metrics?.marketExposure?.amount === undefined
      ? {}
      : { marketExposure: metrics.marketExposure.amount }),
  };
}

function createLiveProviderOrderRecord(
  intent: OrderIntent,
  request: LiveOrderSubmitRequest,
  providerOrderId: string,
  workflow: MarketDataWorkflowState,
): NormalizedOrder {
  const orderBookMarketRef = workflow.orderBook?.orderBook?.marketRef;
  const marketRef =
    orderBookMarketRef !== undefined &&
    orderBookMarketRef.providerId === request.providerId &&
    orderBookMarketRef.marketId === request.marketId
      ? {
          ...orderBookMarketRef,
          outcomeId: request.outcomeId,
        }
      : ({
          providerId: request.providerId,
          marketId: request.marketId,
          outcomeId: request.outcomeId,
          currency: intent.stakeAmount.currency,
          tickSize: "0.01",
          marketStatus: "open",
          freshness: "fresh",
        } satisfies TradableMarketRef);

  return {
    id: providerOrderId,
    providerId: request.providerId,
    marketRef,
    side: request.side === "SELL" ? "SELL" : "BUY",
    type: "limit",
    timeInForce: "GTC",
    state: "open",
    price: request.price,
    originalQuantity: request.quantity,
    filledQuantity: "0",
    remainingQuantity: request.quantity,
    createdAt: new Date().toISOString(),
    fees: [],
    providerMetadata: {
      source: "live_provider",
      submitStatus: "submitted",
    },
  };
}

function isLiveProviderOrder(order: NormalizedOrder): boolean {
  return order.providerMetadata?.source === "live_provider";
}

function createRendererBlockedLiveOrderResponse(
  providerId: ProviderId,
  reasons: readonly string[],
): LiveOrderCommandResponse {
  return {
    command: "order_submit_live",
    providerId,
    status: "blocked",
    message: `Live order cannot be submitted by the renderer: ${reasons.join(", ")}.`,
    secretFree: true,
    submittedExternally: false,
    reasons,
    auditEventType: "validation_failed",
  };
}

function TopCommandStrip(props: {
  locale: LocaleCode;
  messages: AppMessages;
  onLocaleChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  state: DesktopTerminalState;
}) {
  const selectedProviderLabel = getSelectedProviderLabel(props.state);
  const terminal = props.messages.desktop.terminal;
  const topGate =
    props.state.gates.find((gate) => gate.blocksLive) ?? props.state.gates[0] ?? null;
  const marketLabel =
    props.state.selectedMarket?.title ?? terminal.placeholders.noMarketSelected;

  return (
    <header className="top-strip">
      <div className="product-lockup">
        <strong>{props.messages.common.productName}</strong>
        <span>{terminal.title}</span>
      </div>

      <div className="command-status" aria-label={terminal.sections.gates}>
        <StatusChip
          label={terminal.labels.provider}
          tone="info"
          value={selectedProviderLabel}
        />
        <StatusChip
          label={terminal.labels.market}
          tone="muted"
          value={marketLabel}
        />
        <StatusChip
          label={terminal.labels.dataFreshness}
          tone={props.state.dataFreshness === "fresh" ? "info" : "warning"}
          value={formatMachineValue(props.state.dataFreshness)}
        />
        <StatusChip
          label={terminal.labels.mode}
          tone="danger"
          value={
            props.messages.common.statusLabels.executionModes[
              props.state.execution.currentMode
            ]
          }
        />
        {topGate === null ? null : (
          <StatusChip
            label={terminal.labels.gate}
            tone="danger"
            value={`${terminal.gates[topGate.id]} ${formatMachineValue(topGate.state)}`}
          />
        )}
      </div>

      <label className="language-selector compact">
        <span>{props.messages.common.languageLabel}</span>
        <select
          aria-label={props.messages.common.languageLabel}
          value={props.locale}
          onChange={props.onLocaleChange}
        >
          {supportedLocales.map((localeCode) => (
            <option key={localeCode} value={localeCode}>
              {props.messages.common.localeNames[localeCode]}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

function ProviderMarketRail(props: {
  messages: TerminalMessages;
  query: string;
  state: DesktopTerminalState;
  onLoadMore: () => void;
  onOutcomeSelect: (selection: MarketOutcomeSelection) => void;
  onQueryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResultsScroll: (event: UIEvent<HTMLDivElement>) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const visibleMarkets = getVisibleMarketResults(props.state.marketSearch.results);
  const selectedMarket = props.state.selectedMarket;
  const visibleProviderState = getVisibleProviderState(
    props.state.marketSearch.providerStates,
  );
  const marketSearchStatus =
    visibleProviderState?.status ?? props.state.marketSearch.status;
  const marketSearchSummary =
    visibleProviderState?.message ?? props.state.marketSearch.summary;

  return (
    <aside className="terminal-panel market-rail" aria-labelledby="provider-rail-title">
      <PanelHeader
        eyebrow={formatProviderLabel(MARKET_RAIL_PROVIDER_ID)}
        id="provider-rail-title"
        title={props.messages.sections.marketSearch}
      />

      <section className="rail-section search-section" aria-labelledby="market-search-title">
        <h3 id="market-search-title">{props.messages.labels.market}</h3>
        <form className="market-search-form" onSubmit={props.onSearch}>
          <label className="field-stack" htmlFor="market-search-input">
            <span>{props.messages.placeholders.marketSearch}</span>
            <input
              id="market-search-input"
              placeholder={props.messages.placeholders.marketSearch}
              type="search"
              value={props.query}
              onChange={props.onQueryChange}
            />
          </label>
          <button
            disabled={props.state.marketSearch.status === "connecting"}
            type="submit"
          >
            {props.state.marketSearch.status === "connecting"
              ? props.messages.actions.searching
              : props.messages.actions.search}
          </button>
        </form>
        <div className="market-rail-overview" aria-label={props.messages.sections.venueHealth}>
          <StatusChip
            label={props.messages.labels.provider}
            tone="info"
            value={formatProviderLabel(MARKET_RAIL_PROVIDER_ID)}
          />
          <StatusChip
            label={props.messages.labels.status}
            tone={getMarketSearchTone(marketSearchStatus)}
            value={formatMachineValue(marketSearchStatus)}
          />
          <StatusChip
            label={props.messages.labels.resultCount}
            tone={visibleMarkets.length === 0 ? "muted" : "info"}
            value={String(visibleMarkets.length)}
          />
          <StatusChip
            label={props.messages.labels.selected}
            tone={selectedMarket === null ? "muted" : "info"}
            value={
              selectedMarket === null
                ? props.messages.placeholders.noMarketSelected
                : selectedMarket.outcomeLabel
            }
          />
        </div>
        {selectedMarket === null ? null : (
          <div className="market-rail-focus" aria-label={props.messages.labels.selected}>
            <span className="market-rail-focus-label">
              {props.messages.labels.selected}
            </span>
            <strong>{selectedMarket.title}</strong>
            <p>
              {selectedMarket.outcomeLabel} - {selectedMarket.marketId}
            </p>
          </div>
        )}
        <p className="panel-note">{marketSearchSummary}</p>

        <div className="market-results" aria-live="polite" onScroll={props.onResultsScroll}>
          {visibleMarkets.length === 0 ? (
            <p className="empty-copy">{props.messages.placeholders.notQueried}</p>
          ) : (
            visibleMarkets.map((market) => (
              <MarketResultCard
                key={`${market.providerId}:${market.marketId}`}
                market={market}
                messages={props.messages}
                onOutcomeSelect={props.onOutcomeSelect}
              />
            ))
          )}
          {props.state.marketSearch.hasMore || props.state.marketSearch.status === "connecting" ? (
            <button
              className="load-more-markets"
              disabled={!props.state.marketSearch.canLoadMore}
              type="button"
              onClick={props.onLoadMore}
            >
              {props.state.marketSearch.status === "connecting"
                ? props.messages.actions.loadingMore
                : props.messages.actions.loadMore}
            </button>
          ) : null}
        </div>
      </section>

    </aside>
  );
}

function MarketResultCard(props: {
  market: MarketSearchResultView;
  messages: TerminalMessages;
  onOutcomeSelect: (selection: MarketOutcomeSelection) => void;
}) {
  const selectedOutcome = props.market.outcomes.find(
    (outcome) => outcome.outcomeId === props.market.selectedOutcomeId,
  );

  return (
    <article className={props.market.selected ? "market-result is-selected" : "market-result"}>
      <div className="market-result-top">
        <div className="market-result-heading">
          <span className="market-result-provider">
            {formatProviderLabel(props.market.providerId)}
          </span>
          <strong>{props.market.title}</strong>
        </div>
        <span className={`market-result-status is-${props.market.status}`}>
          {formatMachineValue(props.market.status)}
        </span>
      </div>
      <dl className="market-result-meta">
        <div>
          <dt>{props.messages.labels.status}</dt>
          <dd>{formatMachineValue(props.market.status)}</dd>
        </div>
        <div>
          <dt>{props.messages.labels.subject}</dt>
          <dd>{props.market.marketId}</dd>
        </div>
        <div>
          <dt>{props.messages.labels.selected}</dt>
          <dd>{selectedOutcome?.label ?? "--"}</dd>
        </div>
        <div>
          <dt>{props.messages.labels.resultCount}</dt>
          <dd>{props.market.outcomes.length}</dd>
        </div>
      </dl>
      <div className="outcome-list">
        {props.market.outcomes.map((outcome) => (
          <button
            key={outcome.outcomeId}
            className={
              props.market.selectedOutcomeId === outcome.outcomeId ? "is-active" : ""
            }
            disabled={outcome.status !== "tradable"}
            type="button"
            onClick={() => props.onOutcomeSelect({ market: props.market, outcome })}
          >
            <span>{outcome.label}</span>
            <small>{formatMachineValue(outcome.status)}</small>
          </button>
        ))}
      </div>
    </article>
  );
}

function getVisibleMarketResults(markets: readonly MarketSearchResultView[]) {
  return markets.filter((market) => market.providerId === MARKET_RAIL_PROVIDER_ID);
}

function getVisibleProviderState(
  providerStates: DesktopTerminalState["marketSearch"]["providerStates"],
) {
  return providerStates.find((state) => state.providerId === MARKET_RAIL_PROVIDER_ID);
}

function getMarketSearchTone(
  status: DesktopTerminalState["marketSearch"]["status"],
): "danger" | "info" | "muted" | "warning" {
  if (status === "connected") {
    return "info";
  }

  if (status === "connecting" || status === "reconnecting" || status === "stale") {
    return "warning";
  }

  if (status === "disconnected" || status === "unavailable") {
    return "muted";
  }

  return "danger";
}

function LadderWorkspace(props: {
  messages: TerminalMessages;
  onLadderCellClick: (row: LadderDisplayRow, column: LadderIntentColumn) => void;
  onStakeAmountChange: (amount: string) => void;
  onStakePresetSelect: (amount: string) => void;
  state: DesktopTerminalState;
}) {
  const marketTitle =
    props.state.selectedMarket?.title ?? props.messages.placeholders.noMarketSelected;
  const overlayVisible = props.state.marketData.status !== "fresh";
  const selectedMarket = props.state.selectedMarket;

  return (
    <section className="terminal-panel ladder-workspace" aria-labelledby="ladder-title">
      <div className="workspace-header">
        <div>
          <p className="panel-eyebrow">{props.messages.sections.ladder}</p>
          <div className="workspace-title-row">
            <h1 id="ladder-title">{marketTitle}</h1>
            {selectedMarket === null ? null : (
              <VenueBadge providerId={selectedMarket.providerId} />
            )}
          </div>
          <p>
            {selectedMarket === null
              ? props.state.marketData.summary
              : `${selectedMarket.outcomeLabel} - ${selectedMarket.marketId} - ${selectedMarket.currency} - tick ${selectedMarket.tickSize}`}
          </p>
        </div>
        <div className="workspace-status">
          <StatusChip
            label={props.messages.labels.connection}
            tone={props.state.marketData.status === "fresh" ? "info" : "danger"}
            value={formatMachineValue(props.state.marketData.connectionStatus)}
          />
          <StatusChip
            label={props.messages.labels.websocket}
            tone={getConnectionTone(props.state.subscription.status)}
            value={formatMachineValue(props.state.subscription.status)}
          />
          <StatusChip
            label={props.messages.labels.dataFreshness}
            tone={props.state.dataFreshness === "fresh" ? "info" : "warning"}
            value={formatMachineValue(props.state.dataFreshness)}
          />
          <StatusChip
            label={props.messages.labels.status}
            tone="muted"
            value={props.messages.ladderStates[props.state.ladder.currentState]}
          />
        </div>
      </div>

      <LadderControlDeck
        messages={props.messages}
        state={props.state}
        onStakeAmountChange={props.onStakeAmountChange}
        onStakePresetSelect={props.onStakePresetSelect}
      />

      <div className="ladder-frame" aria-label={props.messages.sections.ladder}>
        {overlayVisible ? (
          <div className="ladder-overlay">
            <strong>
              {props.state.ladder.rows.some((row) => row.status === "provider_snapshot")
                ? formatMachineValue(props.state.marketData.status)
                : props.messages.placeholders.ladderNoBook}
            </strong>
            <span>{props.state.marketData.summary}</span>
            <span>{props.state.subscription.summary}</span>
          </div>
        ) : null}
        <table className="ladder-table">
          <thead>
            <tr>
              <th>{props.messages.labels.back}</th>
              <th>{props.messages.labels.price}</th>
              <th>{props.messages.labels.lay}</th>
            </tr>
          </thead>
          <tbody>
            {props.state.ladder.rows.map((row) => {
              const bidSize = row.bidSize;
              const askSize = row.askSize;
              const canCreateIntent =
                row.status === "provider_snapshot" &&
                props.state.marketData.status === "fresh";

              return (
                <tr key={getLadderRowKey(row)}>
                  <td className={getLadderCellClassName(row, "bid")}>
                    <button
                      aria-label={getLadderActionLabel(props.messages, row, "bid")}
                      className="ladder-action back-action"
                      disabled={!canCreateIntent}
                      title={
                        canCreateIntent
                          ? props.messages.actions.previewOnly
                          : props.messages.placeholders.ladderClickBlocked
                      }
                      type="button"
                      onClick={() => props.onLadderCellClick(row, "bid")}
                    >
                      <strong>{formatOptionalDecimal(bidSize)}</strong>
                      {bidSize === null || bidSize === undefined ? null : (
                        <small>{props.messages.labels.available}</small>
                      )}
                    </button>
                  </td>
                  <td className="price-cell">
                    <span>{row.price ?? props.messages.placeholders.unknown}</span>
                  </td>
                  <td className={getLadderCellClassName(row, "ask")}>
                    <button
                      aria-label={getLadderActionLabel(props.messages, row, "ask")}
                      className="ladder-action lay-action"
                      disabled={!canCreateIntent}
                      title={
                        canCreateIntent
                          ? props.messages.actions.previewOnly
                          : props.messages.placeholders.ladderClickBlocked
                      }
                      type="button"
                      onClick={() => props.onLadderCellClick(row, "ask")}
                    >
                      <strong>{formatOptionalDecimal(askSize)}</strong>
                      {askSize === null || askSize === undefined ? null : (
                        <small>{props.messages.labels.available}</small>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LadderControlDeck(props: {
  messages: TerminalMessages;
  onStakeAmountChange: (amount: string) => void;
  onStakePresetSelect: (amount: string) => void;
  state: DesktopTerminalState;
}) {
  return (
    <div className="ladder-control-deck" aria-label={props.messages.sections.stake}>
      <section className="ladder-control-group" aria-labelledby="ladder-stake-title">
        <div className="control-label-row">
          <span id="ladder-stake-title">{props.messages.sections.stake}</span>
          <small>{props.messages.actions.previewOnly}</small>
        </div>
        <div className="ladder-stake-grid">
          {props.state.stakePresets.map((preset) => (
            <button
              aria-pressed={preset.selected}
              className={preset.selected ? "is-active" : ""}
              key={preset.label}
              type="button"
              onClick={() => props.onStakePresetSelect(preset.label)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="manual-stake-field">
          <span>{props.messages.labels.manualStake}</span>
          <input
            aria-label={props.messages.labels.manualStake}
            inputMode="decimal"
            placeholder={props.messages.placeholders.manualStake}
            type="text"
            value={props.state.stakeInput.amount}
            onChange={(event) =>
              props.onStakeAmountChange(event.currentTarget.value)
            }
          />
        </label>
        <p className="control-note">{props.state.risk.summary}</p>
      </section>

      <section className="ladder-control-group" aria-labelledby="ladder-one-click-title">
        <div className="control-label-row">
          <span id="ladder-one-click-title">{props.messages.labels.oneClick}</span>
          <small>{props.messages.actions.off}</small>
        </div>
        <div className="ladder-toggle-strip" aria-label={props.messages.labels.oneClick}>
          <button aria-pressed="true" className="is-active" disabled type="button">
            {props.messages.actions.off}
          </button>
          <button disabled type="button">
            {props.messages.actions.armed}
          </button>
        </div>
        <p className="control-note">{props.state.execution.oneClick.summary}</p>
      </section>

      <section className="ladder-control-group" aria-labelledby="ladder-keyboard-title">
        <div className="control-label-row">
          <span id="ladder-keyboard-title">{props.messages.labels.keyboard}</span>
          <small>{formatMachineValue(props.state.risk.recentValidation)}</small>
        </div>
        <div
          aria-label={props.messages.placeholders.keyboardShortcutsPending}
          className="hotkey-strip"
        >
          <span>B</span>
          <span>L</span>
          <span>Esc</span>
          <span>Enter</span>
        </div>
        <p className="control-note">
          {props.messages.placeholders.keyboardShortcutsPending}
        </p>
      </section>
    </div>
  );
}

function RiskOrderRail(props: {
  legalApprovalProviderId: OnboardingProviderId;
  legalApprovalStatus: LegalApprovalStatusCommandResponse | null;
  liveOrderCancellingId: string | null;
  liveOrderResult: LiveOrderWorkflowResult | null;
  liveOrderSubmitting: boolean;
  messages: AppMessages;
  onCancelLiveOrder: (order: NormalizedOrder) => void;
  onExecutionModeChange: (executionMode: DesktopOrderExecutionMode) => void;
  onFirstLiveAckChange: (acknowledged: boolean) => void;
  onOpenLegalApprovalWizard: () => void;
  onOpenProviderWizard: (providerId: OnboardingProviderId) => void;
  onPolymarketAccountCandidateApply: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<void>;
  onSubmitLiveOrder: () => void;
  onSubmitOrderPreview: () => void;
  state: DesktopTerminalState;
}) {
  const terminal = props.messages.desktop.terminal;
  const selectedPreflightProvider = props.state.livePreflight.providers.find(
    (provider) => provider.providerId === props.state.selectedProviderId,
  );

  return (
    <aside className="terminal-panel risk-rail" aria-labelledby="risk-title">
      <PanelHeader
        eyebrow={
          props.state.orderPreview.canSubmitLive
            ? terminal.placeholders.liveSubmitPath
            : terminal.placeholders.noSubmitPath
        }
        id="risk-title"
        title={terminal.sections.risk}
      />

      <section className="rail-section" aria-labelledby="execution-mode-title">
        <h3 id="execution-mode-title">{terminal.sections.executionModes}</h3>
        <div className="mode-grid">
          {props.state.execution.modes.map((mode) => (
            <ExecutionModeButton
              key={mode.id}
              messages={props.messages}
              mode={mode}
              onExecutionModeChange={props.onExecutionModeChange}
            />
          ))}
        </div>
      </section>

      <ProviderOnboardingPanel
        messages={terminal}
        state={props.state}
        onPolymarketAccountCandidateApply={props.onPolymarketAccountCandidateApply}
        onOpenProviderWizard={props.onOpenProviderWizard}
      />

      <LegalApprovalPanel
        legalApprovalStatus={props.legalApprovalStatus}
        messages={terminal.legalApproval}
        providerId={props.legalApprovalProviderId}
        onOpenLegalApprovalWizard={props.onOpenLegalApprovalWizard}
      />

      <section className="rail-section safety-controls">
        <div>
          <h3>{terminal.labels.killSwitch}</h3>
          <button className="kill-switch" disabled type="button">
            {terminal.actions.killSwitch}
          </button>
          <p className="panel-note">{props.state.execution.killSwitch.summary}</p>
        </div>
        <div>
          <h3>{terminal.gates.acknowledgement}</h3>
          <StatusChip
            label={terminal.gates.acknowledgement}
            tone={props.state.execution.liveAcknowledgement.acknowledged ? "info" : "danger"}
            value={
              props.state.execution.liveAcknowledgement.acknowledged
                ? "approved"
                : "missing"
            }
          />
          <label className="terminal-checkbox acknowledgement-checkbox">
            <input
              checked={props.state.execution.liveAcknowledgement.acknowledged}
              type="checkbox"
              onChange={(event) =>
                props.onFirstLiveAckChange(event.currentTarget.checked)
              }
            />
            <span>{terminal.legalApproval.acknowledgementToggle}</span>
          </label>
          <p className="panel-note">
            {props.state.execution.liveAcknowledgement.summary}
          </p>
          <p className="panel-note">{terminal.legalApproval.acknowledgementNote}</p>
        </div>
      </section>

      <section className="rail-section">
        <h3>{terminal.sections.riskLimits}</h3>
        <dl className="compact-facts two-column">
          <div>
            <dt>{terminal.labels.maxStake}</dt>
            <dd>{formatMachineValue(props.state.risk.maxStake)}</dd>
          </div>
          <div>
            <dt>{terminal.labels.maxExposure}</dt>
            <dd>{formatMachineValue(props.state.risk.maxExposure)}</dd>
          </div>
        </dl>
        <p className="panel-note">{props.state.risk.summary}</p>
      </section>

      <section className="rail-section preview-panel">
        <h3>{terminal.sections.orderPreview}</h3>
        <StatusChip
          label={terminal.actions.previewOnly}
          tone={
            props.state.orderPreview.status === "validation_failed" ||
            props.state.orderPreview.status === "live_blocked"
              ? "danger"
              : props.state.orderPreview.status === "validation_passed"
                ? "info"
                : "muted"
          }
          value={formatMachineValue(props.state.orderPreview.status)}
        />
        {props.state.orderPreview.intent === null ? null : (
          <dl className="compact-facts two-column order-intent-facts">
            <div>
              <dt>{terminal.labels.side}</dt>
              <dd>{props.state.orderPreview.intent.side}</dd>
            </div>
            <div>
              <dt>{terminal.labels.price}</dt>
              <dd>{props.state.orderPreview.intent.price}</dd>
            </div>
            <div>
              <dt>{terminal.labels.stake}</dt>
              <dd>
                {props.state.orderPreview.intent.stakeAmount.amount}{" "}
                {props.state.orderPreview.intent.stakeAmount.currency}
              </dd>
            </div>
            <div>
              <dt>{terminal.labels.quantity}</dt>
              <dd>{props.state.orderPreview.intent.quantity}</dd>
            </div>
          </dl>
        )}
        {props.state.orderPreview.validationReasons.length === 0 ? null : (
          <ul className="validation-reasons">
            {props.state.orderPreview.validationReasons.map((reason) => (
              <li key={reason}>
                <span>{getOrderRejectionReasonMessage(terminal, reason)}</span>
                <small>{formatOrderRejectionReasonCode(reason)}</small>
              </li>
            ))}
          </ul>
        )}
        <button
          className="local-submit-button"
          disabled={!props.state.orderPreview.canSubmitLocal}
          type="button"
          onClick={props.onSubmitOrderPreview}
        >
          {props.state.execution.currentMode === "live_dry_run"
            ? terminal.actions.runDryRun
            : terminal.actions.createPaperOrder}
        </button>
        <button
          className="live-submit-button"
          disabled={
            !props.state.orderPreview.canSubmitLive || props.liveOrderSubmitting
          }
          type="button"
          onClick={props.onSubmitLiveOrder}
        >
          {props.liveOrderSubmitting
            ? terminal.actions.liveSmokePending
            : terminal.actions.runFirstLiveSmoke}
        </button>
        {selectedPreflightProvider === undefined ||
        selectedPreflightProvider.reasons.length === 0 ? null : (
          <ul className="validation-reasons compact">
            {selectedPreflightProvider.reasons.slice(0, 5).map((reason) => (
              <li key={reason}>{getProviderGateReasonMessage(terminal, reason)}</li>
            ))}
          </ul>
        )}
        {props.liveOrderResult === null ? null : (
          <LiveOrderResultPanel
            messages={terminal}
            result={props.liveOrderResult}
          />
        )}
        <p className="panel-note">{props.state.orderPreview.summary}</p>
      </section>

      <MetricsPanel messages={terminal} metricGroups={props.state.metrics} />

      <section className="rail-section">
        <h3>{terminal.sections.openOrders}</h3>
        {props.state.openOrders.rows.length === 0 ? (
          <p className="empty-copy">{terminal.placeholders.noOpenOrders}</p>
        ) : (
          <ul className="order-list">
            {props.state.openOrders.rows.map((order) => (
              <li key={order.id}>
                <div>
                  <strong>{order.side}</strong>
                  <span>{order.state}</span>
                </div>
                <small>
                  {order.id} - {order.price} - {order.remainingQuantity}
                </small>
                {isLiveProviderOrder(order) ? (
                  <button
                    className="order-row-action"
                    disabled={props.liveOrderCancellingId === order.id}
                    type="button"
                    onClick={() => props.onCancelLiveOrder(order)}
                  >
                    {props.liveOrderCancellingId === order.id
                      ? terminal.actions.liveCancelPending
                      : terminal.actions.cancelLiveOrder}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="panel-note">{props.state.openOrders.summary}</p>
      </section>
    </aside>
  );
}

function ProviderOnboardingPanel(props: {
  messages: TerminalMessages;
  state: DesktopTerminalState;
  onOpenProviderWizard: (providerId: OnboardingProviderId) => void;
  onPolymarketAccountCandidateApply: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<void>;
}) {
  const polymarketProvider = props.state.providerOnboarding.providers.find(
    (provider) => provider.providerId === "polymarket",
  );
  const selectedPreflightProvider = props.state.livePreflight.providers.find(
    (provider) => provider.providerId === props.state.selectedProviderId,
  );
  const selectedPreflightReady = selectedPreflightProvider?.ready ?? false;
  const selectedPreflightStatus =
    selectedPreflightProvider?.status ?? props.state.livePreflight.status;
  const selectedPreflightSummary =
    selectedPreflightProvider?.message ?? props.state.livePreflight.summary;

  return (
    <section className="rail-section onboarding-panel" aria-labelledby="onboarding-title">
      <h3 id="onboarding-title">{props.messages.providerOnboarding.setupEyebrow}</h3>
      <p className="panel-note">{props.state.providerOnboarding.summary}</p>
      <div className="provider-onboarding-grid">
        <ProviderOnboardingStatusCard
          messages={props.messages.providerOnboarding}
          provider={polymarketProvider}
          providerId="polymarket"
          onPolymarketAccountCandidateApply={props.onPolymarketAccountCandidateApply}
          onOpenProviderWizard={props.onOpenProviderWizard}
        />
      </div>
      <div
        className="preflight-strip"
        aria-label={props.messages.providerOnboarding.review.liveSubmit}
      >
        <StatusChip
          label={props.messages.providerOnboarding.review.liveSubmit}
          tone={selectedPreflightReady ? "info" : "danger"}
          value={formatMachineValue(selectedPreflightStatus)}
        />
        <p>{selectedPreflightSummary}</p>
      </div>
    </section>
  );
}

function LiveOrderResultPanel(props: {
  messages: TerminalMessages;
  result: LiveOrderWorkflowResult;
}) {
  const rows = [
    ...(props.result.submit === null
      ? []
      : [{ label: props.messages.labels.submit, response: props.result.submit }]),
    ...(props.result.cancel === null
      ? []
      : [{ label: props.messages.labels.cancel, response: props.result.cancel }]),
  ];

  return (
    <div className="live-order-result" aria-label={props.messages.actions.liveSmokeResult}>
      <strong>{props.messages.actions.liveSmokeResult}</strong>
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <StatusChip
            label={row.response.providerId}
            tone={
              row.response.status === "submitted" ||
              row.response.status === "cancelled"
                ? "info"
                : "danger"
            }
            value={formatMachineValue(row.response.status)}
          />
          {row.response.reasons.length === 0 ? null : (
            <small>{row.response.reasons.map(formatMachineValue).join(", ")}</small>
          )}
          <p className="panel-note">{row.response.message}</p>
        </div>
      ))}
    </div>
  );
}

function LegalApprovalPanel(props: {
  legalApprovalStatus: LegalApprovalStatusCommandResponse | null;
  messages: LegalApprovalMessages;
  providerId: OnboardingProviderId;
  onOpenLegalApprovalWizard: () => void;
}) {
  const status = props.legalApprovalStatus?.status ?? "blocked";
  const ready = props.legalApprovalStatus?.ready ?? false;
  const reasons = props.legalApprovalStatus?.reasons ?? [];
  const summary =
    props.legalApprovalStatus?.message ??
    (ready ? props.messages.readyNote : props.messages.blockedNote);

  return (
    <section
      className="rail-section legal-approval-panel"
      aria-label={props.messages.statusAria}
    >
      <div className="provider-onboarding-heading">
        <h3>{props.messages.statusTitle}</h3>
        <StatusChip
          label={formatProviderLabel(props.providerId)}
          tone={ready ? "info" : "danger"}
          value={formatMachineValue(status)}
        />
      </div>
      <p className="panel-note">{summary}</p>
      {reasons.length === 0 ? null : (
        <ul className="gate-reason-list">
          {reasons.slice(0, 4).map((reason) => (
            <li key={reason}>{formatMachineValue(reason)}</li>
          ))}
        </ul>
      )}
      <button
        className="local-submit-button"
        type="button"
        onClick={props.onOpenLegalApprovalWizard}
      >
        {props.messages.openAction}
      </button>
    </section>
  );
}

function ProviderOnboardingStatusCard(props: {
  messages: ProviderOnboardingMessages;
  provider:
    | DesktopTerminalState["providerOnboarding"]["providers"][number]
    | undefined;
  providerId: OnboardingProviderId;
  onOpenProviderWizard: (providerId: OnboardingProviderId) => void;
  onPolymarketAccountCandidateApply: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<void>;
}) {
  const credentialStatus = props.provider?.credential.status ?? "unknown";
  const accountMetricsStatus = props.provider?.accountMetrics.status ?? "unknown";
  const availableFunds = formatProviderMetricAmount(
    props.provider?.accountMetrics.availableFunds,
  );
  const publicPortfolioValue = formatProviderMetricAmount(
    props.provider?.accountMetrics.publicPortfolioValue,
  );
  const actionLabel =
    credentialStatus === "ready"
      ? `${props.messages.steps.review} ${formatProviderLabel(props.providerId)}`
      : `${props.messages.actions.connect} ${formatProviderLabel(props.providerId)}`;

  return (
    <article className="provider-onboarding-card">
      <div className="provider-onboarding-heading">
        <VenueBadge providerId={props.providerId} />
        <StatusChip
          label={props.messages.review.credential}
          tone={getCredentialTone(credentialStatus)}
          value={formatMachineValue(credentialStatus)}
        />
      </div>
      <dl className="provider-onboarding-status">
        <div>
          <dt>{props.messages.review.accountMetrics}</dt>
          <dd>
            <span>{formatMachineValue(accountMetricsStatus)}</span>
            {availableFunds === null ? null : (
              <small>
                {props.messages.review.tradeReadyCash}: {availableFunds}
              </small>
            )}
            {publicPortfolioValue === null ? null : (
              <small>
                {props.messages.review.publicPortfolio}: {publicPortfolioValue}
              </small>
            )}
          </dd>
        </div>
        <div>
          <dt>{props.messages.review.credential}</dt>
          <dd>{formatMachineValue(props.provider?.credential.source ?? "unknown")}</dd>
        </div>
      </dl>
      <button
        className="local-submit-button"
        type="button"
        onClick={() => props.onOpenProviderWizard(props.providerId)}
      >
        {actionLabel}
      </button>
      <OnboardingReasonList messages={props.messages} provider={props.provider} />
    </article>
  );
}

function ProviderCredentialWizard(props: {
  kalshiApiKeyId: string;
  kalshiKeyFilePath: string;
  messages: ProviderOnboardingMessages;
  polymarketSignerFilePath: string;
  polymarketSignatureType: PolymarketSignatureType;
  polymarketTradingAddress: string;
  providerId: OnboardingProviderId;
  state: DesktopTerminalState;
  step: CredentialWizardStep;
  onClose: () => void;
  onKalshiApiKeyIdChange: (value: string) => void;
  onKalshiKeyFilePathChange: (value: string) => void;
  onOpenLegalApprovalWizard: (providerId: OnboardingProviderId) => void;
  onOpenPolymarketMagicExport: () => Promise<void>;
  onPolymarketAccountCandidateApply: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<void>;
  onPolymarketSignerFilePathChange: (value: string) => void;
  onPolymarketClipboardImport: () => Promise<void>;
  onPolymarketSignatureTypeChange: (value: PolymarketSignatureType) => void;
  onPolymarketTradingAddressChange: (value: string) => void;
  onProviderConnect: (request: ProviderCredentialConnectRequest) => Promise<void>;
  onStepChange: (step: CredentialWizardStep) => void;
}) {
  const [polymarketImporting, setPolymarketImporting] = useState(false);
  const provider = props.state.providerOnboarding.providers.find(
    (candidate) => candidate.providerId === props.providerId,
  );
  const providerLabel = formatProviderLabel(props.providerId);
  const polymarketConnection = createPolymarketConnectedBannerModel(
    provider,
    props.messages,
  );
  const stepIndex = CREDENTIAL_WIZARD_STEPS.indexOf(props.step);
  const previousStep = CREDENTIAL_WIZARD_STEPS[Math.max(0, stepIndex - 1)] ?? "guide";
  const shouldFinishPolymarketClipboardImport =
    props.step === "review" &&
    props.providerId === "polymarket" &&
    provider?.credential.status === "ready" &&
    props.polymarketSignerFilePath.trim() === "";
  const shouldAdvanceReadyPolymarketProfile =
    props.providerId === "polymarket" &&
    provider?.credential.status === "ready" &&
    props.polymarketSignerFilePath.trim() === "";
  const polymarketConnectButtonLabel = shouldAdvanceReadyPolymarketProfile
    ? props.messages.actions.finalApproval
    : props.messages.polymarket.connectButton;
  const submitLabel =
    props.step !== "review"
      ? props.messages.actions.next
      : shouldFinishPolymarketClipboardImport
        ? props.messages.actions.finalApproval
        : `${props.messages.actions.connect} ${providerLabel}`;

  async function handleCredentialWizardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (props.step === "guide") {
      props.onStepChange("reference");
      return;
    }

    if (props.step === "reference") {
      props.onStepChange("review");
      return;
    }

    if (shouldFinishPolymarketClipboardImport) {
      props.onClose();
      props.onOpenLegalApprovalWizard(props.providerId);
      return;
    }

    await props.onProviderConnect(createCredentialConnectRequest(props));
  }

  async function handlePolymarketConnectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (shouldAdvanceReadyPolymarketProfile) {
      props.onClose();
      props.onOpenLegalApprovalWizard("polymarket");
      return;
    }

    setPolymarketImporting(true);
    try {
      if (props.polymarketSignerFilePath.trim() !== "") {
        await props.onProviderConnect(createCredentialConnectRequest(props));
      } else {
        await props.onPolymarketClipboardImport();
      }
    } finally {
      setPolymarketImporting(false);
    }
  }

  if (props.providerId === "polymarket") {
    return (
      <div
        aria-labelledby="credential-wizard-title"
        aria-modal="true"
        className="credential-wizard-backdrop"
        role="dialog"
      >
        <form
          className="credential-wizard polymarket-connect-wizard"
          onSubmit={handlePolymarketConnectSubmit}
        >
          <header className="credential-wizard-header">
            <div>
              <p className="panel-eyebrow">{props.messages.setupEyebrow}</p>
              <h2 id="credential-wizard-title">{providerLabel}</h2>
            </div>
            <button
              aria-label={props.messages.close}
              className="icon-button"
              type="button"
              onClick={props.onClose}
            >
              x
            </button>
          </header>

          <div className="credential-wizard-body polymarket-connect-body">
            <section
              className="polymarket-connect-panel"
              aria-label={props.messages.polymarket.secureImportAria}
            >
              <div className="polymarket-connect-title-row">
                <h3>{props.messages.polymarket.connectTitle}</h3>
                <button
                  className="text-link-button"
                  type="button"
                  onClick={() => void props.onOpenPolymarketMagicExport()}
                >
                  {props.messages.polymarket.magicExportButton}
                </button>
              </div>
              <p>{props.messages.polymarket.description}</p>

              <div className="polymarket-secure-key-field">
                <span>{props.messages.polymarket.signerPrivateKeyLabel}</span>
                <button
                  className="secure-paste-target"
                  disabled={polymarketImporting}
                  type="submit"
                >
                  <span aria-hidden="true">key</span>
                  <strong>{props.messages.polymarket.securePastePlaceholder}</strong>
                </button>
              </div>

              <label className="terminal-checkbox polymarket-remember-row">
                <input checked readOnly type="checkbox" />
                <span>{props.messages.polymarket.rememberDeviceLabel}</span>
              </label>

              {polymarketConnection === null ? null : (
                <div className="polymarket-connected-banner">
                  <strong>{props.messages.polymarket.connectedAsLabel}</strong>
                  <span>
                    {polymarketConnection.accountLabel} -{" "}
                    {polymarketConnection.maskedIdentifier}
                    {polymarketConnection.tradeReadyCash === null
                      ? ""
                      : ` - ${polymarketConnection.tradeReadyCash} ${props.messages.polymarket.availableSuffix}`}
                  </span>
                </div>
              )}

              <details className="credential-advanced-import polymarket-advanced-options">
                <summary>{props.messages.polymarket.advancedImportLabel}</summary>
                <div className="polymarket-advanced-grid">
                  <label className="field-stack">
                    <span>{props.messages.polymarket.tradingAddressLabel}</span>
                    <input
                      autoComplete="off"
                      placeholder={props.messages.polymarket.tradingAddressPlaceholder}
                      type="text"
                      value={props.polymarketTradingAddress}
                      onChange={(event) =>
                        props.onPolymarketTradingAddressChange(event.currentTarget.value)
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>{props.messages.polymarket.signatureTypeLabel}</span>
                    <select
                      value={props.polymarketSignatureType}
                      onChange={(event) =>
                        props.onPolymarketSignatureTypeChange(
                          event.currentTarget.value as PolymarketSignatureType,
                        )
                      }
                    >
                      <option value="proxy">
                        {props.messages.polymarket.signatureTypeOptions.proxy}
                      </option>
                      <option value="poly_1271">
                        {props.messages.polymarket.signatureTypeOptions.poly1271}
                      </option>
                      <option value="gnosis_safe">
                        {props.messages.polymarket.signatureTypeOptions.gnosisSafe}
                      </option>
                      <option value="eoa">
                        {props.messages.polymarket.signatureTypeOptions.eoa}
                      </option>
                    </select>
                  </label>
                  <p className="panel-note">{props.messages.polymarket.tradingAddressNote}</p>
                  <label className="field-stack">
                    <span>{props.messages.polymarket.signerSourceLabel}</span>
                    <input
                      autoComplete="off"
                      placeholder={props.messages.polymarket.signerSourcePlaceholder}
                      type="text"
                      value={props.polymarketSignerFilePath}
                      onChange={(event) =>
                        props.onPolymarketSignerFilePathChange(event.currentTarget.value)
                      }
                    />
                  </label>
                </div>
              </details>

              <button
                className="local-submit-button polymarket-connect-button"
                disabled={polymarketImporting}
                type="submit"
              >
                {polymarketConnectButtonLabel}
              </button>
            </section>

            <CredentialReviewStep
              messages={props.messages}
              provider={provider}
              providerId={props.providerId}
              onPolymarketAccountCandidateApply={
                props.onPolymarketAccountCandidateApply
              }
            />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      aria-labelledby="credential-wizard-title"
      aria-modal="true"
      className="credential-wizard-backdrop"
      role="dialog"
    >
      <form className="credential-wizard" onSubmit={handleCredentialWizardSubmit}>
        <header className="credential-wizard-header">
          <div>
            <p className="panel-eyebrow">{props.messages.setupEyebrow}</p>
            <h2 id="credential-wizard-title">{providerLabel}</h2>
          </div>
          <button
            aria-label={props.messages.close}
            className="icon-button"
            type="button"
            onClick={props.onClose}
          >
            x
          </button>
        </header>

        <nav className="credential-wizard-steps" aria-label={props.messages.stepsAria}>
          {CREDENTIAL_WIZARD_STEPS.map((step, index) => (
            <button
              key={step}
              aria-current={props.step === step ? "step" : undefined}
              className={props.step === step ? "is-active" : ""}
              type="button"
              onClick={() => props.onStepChange(step)}
            >
              <span>{index + 1}</span>
              {props.messages.steps[step]}
            </button>
          ))}
        </nav>

        <div className="credential-wizard-body">
          {props.step === "guide" ? (
            <CredentialGuideStep
              messages={props.messages}
              providerId={props.providerId}
            />
          ) : null}
          {props.step === "reference" ? (
            <CredentialReferenceStep
              kalshiApiKeyId={props.kalshiApiKeyId}
              kalshiKeyFilePath={props.kalshiKeyFilePath}
              messages={props.messages}
              polymarketSignerFilePath={props.polymarketSignerFilePath}
              polymarketSignatureType={props.polymarketSignatureType}
              polymarketTradingAddress={props.polymarketTradingAddress}
              providerId={props.providerId}
              onOpenPolymarketMagicExport={props.onOpenPolymarketMagicExport}
              onPolymarketClipboardImport={props.onPolymarketClipboardImport}
              onKalshiApiKeyIdChange={props.onKalshiApiKeyIdChange}
              onKalshiKeyFilePathChange={props.onKalshiKeyFilePathChange}
              onPolymarketSignerFilePathChange={
                props.onPolymarketSignerFilePathChange
              }
              onPolymarketSignatureTypeChange={
                props.onPolymarketSignatureTypeChange
              }
              onPolymarketTradingAddressChange={
                props.onPolymarketTradingAddressChange
              }
            />
          ) : null}
          {props.step === "review" ? (
            <CredentialReviewStep
              messages={props.messages}
              provider={provider}
              providerId={props.providerId}
              onPolymarketAccountCandidateApply={
                props.onPolymarketAccountCandidateApply
              }
            />
          ) : null}
        </div>

        <footer className="credential-wizard-footer">
          <button
            className="local-submit-button secondary"
            disabled={stepIndex === 0}
            type="button"
            onClick={() => props.onStepChange(previousStep)}
          >
            {props.messages.actions.back}
          </button>
          <button className="local-submit-button" type="submit">
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

function LegalApprovalWizard(props: {
  firstLiveAck: boolean;
  legalApprovalStatus: LegalApprovalStatusCommandResponse | null;
  maxMarketExposure: string;
  maxStakeFirstOrder: string;
  messages: LegalApprovalMessages;
  providerId: OnboardingProviderId;
  onClose: () => void;
  onFirstLiveAckChange: (acknowledged: boolean) => void;
  onSubmit: (
    request: LegalApprovalSubmitRequest,
  ) => Promise<LegalApprovalStatusCommandResponse>;
}) {
  const [targetJurisdiction, setTargetJurisdiction] = useState("");
  const [operatorIdentity, setOperatorIdentity] = useState("");
  const [approver, setApprover] = useState("");
  const [maxStakeFirstOrder, setMaxStakeFirstOrder] = useState(
    props.maxStakeFirstOrder,
  );
  const [maxMarketExposure, setMaxMarketExposure] = useState(
    props.maxMarketExposure,
  );
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(
    props.firstLiveAck,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleLegalApprovalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      props.onFirstLiveAckChange(approvalAcknowledged);
      const response = await props.onSubmit({
        providerId: props.providerId,
        targetJurisdiction: targetJurisdiction.trim(),
        operatorIdentity: operatorIdentity.trim(),
        approver: approver.trim(),
        maxStakeFirstOrder: maxStakeFirstOrder.trim(),
        maxMarketExposure: maxMarketExposure.trim(),
        checks: createLegalApprovalChecks(approvalAcknowledged),
      });
      if (response.ready) {
        props.onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const status = props.legalApprovalStatus?.status ?? "blocked";
  const reasons = props.legalApprovalStatus?.reasons ?? [];

  return (
    <div
      aria-labelledby="legal-approval-title"
      aria-modal="true"
      className="credential-wizard-backdrop"
      role="dialog"
    >
      <form
        className="credential-wizard legal-approval-wizard"
        onSubmit={handleLegalApprovalSubmit}
      >
        <header className="credential-wizard-header">
          <div>
            <p className="panel-eyebrow">{props.messages.setupEyebrow}</p>
            <h2 id="legal-approval-title">{props.messages.title}</h2>
          </div>
          <button
            aria-label={props.messages.close}
            className="icon-button"
            type="button"
            onClick={props.onClose}
          >
            x
          </button>
        </header>

        <div className="credential-wizard-body legal-approval-body">
          <div className="legal-approval-status-row">
            <StatusChip
              label={formatProviderLabel(props.providerId)}
              tone={props.legalApprovalStatus?.ready ? "info" : "danger"}
              value={formatMachineValue(status)}
            />
            <p>{props.legalApprovalStatus?.message ?? props.messages.blockedNote}</p>
          </div>
          <p className="panel-note">{props.messages.formIntro}</p>
          {reasons.length === 0 ? null : (
            <ul className="gate-reason-list">
              {reasons.slice(0, 6).map((reason) => (
                <li key={reason}>{formatMachineValue(reason)}</li>
              ))}
            </ul>
          )}

          <div className="legal-approval-fields">
            <label className="field-stack">
              <span>{props.messages.fields.targetJurisdiction}</span>
              <input
                autoComplete="off"
                placeholder={props.messages.fields.targetJurisdictionPlaceholder}
                type="text"
                value={targetJurisdiction}
                onChange={(event) => setTargetJurisdiction(event.currentTarget.value)}
              />
            </label>
            <label className="field-stack">
              <span>{props.messages.fields.operatorIdentity}</span>
              <input
                autoComplete="off"
                placeholder={props.messages.fields.operatorIdentityPlaceholder}
                type="text"
                value={operatorIdentity}
                onChange={(event) => setOperatorIdentity(event.currentTarget.value)}
              />
            </label>
            <label className="field-stack">
              <span>{props.messages.fields.approver}</span>
              <input
                autoComplete="off"
                placeholder={props.messages.fields.approverPlaceholder}
                type="text"
                value={approver}
                onChange={(event) => setApprover(event.currentTarget.value)}
              />
            </label>
            <label className="field-stack">
              <span>{props.messages.fields.maxStakeFirstOrder}</span>
              <input
                inputMode="decimal"
                type="text"
                value={maxStakeFirstOrder}
                onChange={(event) => setMaxStakeFirstOrder(event.currentTarget.value)}
              />
            </label>
            <label className="field-stack">
              <span>{props.messages.fields.maxMarketExposure}</span>
              <input
                inputMode="decimal"
                type="text"
                value={maxMarketExposure}
                onChange={(event) => setMaxMarketExposure(event.currentTarget.value)}
              />
            </label>
          </div>

          <section className="legal-approval-checks" aria-labelledby="legal-checks-title">
            <h3 id="legal-checks-title">{props.messages.checksTitle}</h3>
            <p>{props.messages.checksIntro}</p>
            <ul className="legal-declaration-list">
              {LEGAL_APPROVAL_CHECK_KEYS.map((key) => (
                <li key={key}>{props.messages.checks[key]}</li>
              ))}
            </ul>
          </section>

          <label className="terminal-checkbox legal-master-approval-row">
            <input
              checked={approvalAcknowledged}
              type="checkbox"
              onChange={(event) => setApprovalAcknowledged(event.currentTarget.checked)}
            />
            <span>{props.messages.singleApprovalToggle}</span>
          </label>
          <p className="panel-note">{props.messages.singleApprovalNote}</p>
        </div>

        <footer className="credential-wizard-footer">
          <button
            className="local-submit-button secondary"
            type="button"
            onClick={props.onClose}
          >
            {props.messages.actions.cancel}
          </button>
          <button className="local-submit-button" disabled={submitting} type="submit">
            {props.messages.actions.submit}
          </button>
        </footer>
      </form>
    </div>
  );
}

function createLegalApprovalChecks(
  approved: boolean,
): LegalApprovalSubmitRequest["checks"] {
  return {
    platformEligible: approved,
    realOperator: approved,
    realBeneficialOwners: approved,
    realAccountOwner: approved,
    noGeoblockBypass: approved,
    noVpnBypass: approved,
    noFakeKyc: approved,
    noSanctionsBypass: approved,
    noCustody: approved,
    c0ReviewPass: approved,
    c1RiskAccepted: approved,
    auditEnabled: approved,
    firstLiveSmokeOnly: approved,
    noDepositsOrWithdrawals: approved,
    understandsRisk: approved,
  };
}

function OrderValidationAlert(props: {
  alert: OrderValidationAlertState;
  messages: TerminalMessages;
  onClose: () => void;
}) {
  const alert = props.messages.riskAlerts;
  const facts = [
    { label: props.messages.labels.side, value: props.alert.side },
    { label: props.messages.labels.price, value: props.alert.price },
    { label: props.messages.labels.stake, value: props.alert.stake },
  ].filter((fact): fact is { label: string; value: string } => fact.value !== null);
  const diagnosticFacts = props.alert.diagnosticFacts.map((fact) => ({
    label: alert.diagnostics[fact.key],
    value: fact.value,
  }));
  const showFundsNote = props.alert.reasons.includes(
    "insufficient_available_funds",
  );

  return (
    <div
      aria-labelledby="order-validation-alert-title"
      aria-modal="true"
      className="risk-alert-backdrop"
      role="dialog"
    >
      <section className="risk-alert">
        <header className="risk-alert-header">
          <div>
            <p className="panel-eyebrow">{props.messages.sections.risk}</p>
            <h2 id="order-validation-alert-title">{alert.title}</h2>
          </div>
          <button
            aria-label={alert.close}
            className="icon-button"
            type="button"
            onClick={props.onClose}
          >
            x
          </button>
        </header>

        <div className="risk-alert-body">
          <p>{alert.summary}</p>
          {facts.length === 0 ? null : (
            <dl className="compact-facts two-column risk-alert-facts">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {diagnosticFacts.length === 0 ? null : (
            <section className="risk-alert-diagnostics">
              <h3>{alert.diagnosticsTitle}</h3>
              <dl className="compact-facts two-column risk-alert-facts">
                {diagnosticFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {showFundsNote ? (
                <p className="risk-alert-note">{alert.fundsDiagnosticNote}</p>
              ) : null}
            </section>
          )}
          <h3>{alert.reasonsTitle}</h3>
          <ul className="risk-alert-reasons">
            {props.alert.reasons.map((reason) => (
              <li key={`${props.alert.intentSequence}-${reason}`}>
                <strong>{getOrderRejectionReasonMessage(props.messages, reason)}</strong>
                <small>
                  {alert.codeLabel}: {formatOrderRejectionReasonCode(reason)}
                </small>
              </li>
            ))}
          </ul>
        </div>

        <footer className="risk-alert-footer">
          <button className="local-submit-button" type="button" onClick={props.onClose}>
            {alert.close}
          </button>
        </footer>
      </section>
    </div>
  );
}

function CredentialGuideStep(props: {
  messages: ProviderOnboardingMessages;
  providerId: OnboardingProviderId;
}) {
  return (
    <section className="credential-step" aria-label={props.messages.guideAria}>
      <p className="panel-note">{props.messages.guideIntro}</p>
      <ul className="credential-guide-list">
        {props.messages.guides[props.providerId].map((guide) => (
          <li key={guide.url}>
            <span className="credential-guide-title">{guide.title}</span>
            <small>{guide.url}</small>
            <p>{guide.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CredentialReferenceStep(props: {
  kalshiApiKeyId: string;
  kalshiKeyFilePath: string;
  messages: ProviderOnboardingMessages;
  polymarketSignerFilePath: string;
  polymarketSignatureType: PolymarketSignatureType;
  polymarketTradingAddress: string;
  providerId: OnboardingProviderId;
  onOpenPolymarketMagicExport: () => Promise<void>;
  onKalshiApiKeyIdChange: (value: string) => void;
  onKalshiKeyFilePathChange: (value: string) => void;
  onPolymarketClipboardImport: () => Promise<void>;
  onPolymarketSignerFilePathChange: (value: string) => void;
  onPolymarketSignatureTypeChange: (value: PolymarketSignatureType) => void;
  onPolymarketTradingAddressChange: (value: string) => void;
}) {
  if (props.providerId === "polymarket") {
    return (
      <section
        className="credential-step"
        aria-label={props.messages.polymarket.secureImportAria}
      >
        <div className="credential-source-panel">
          <strong>{props.messages.recommendedImport}</strong>
          <p>{props.messages.polymarket.description}</p>
          <div className="credential-quick-import">
            <div>
              <strong>{props.messages.polymarket.magicExportTitle}</strong>
              <p>{props.messages.polymarket.magicExportDescription}</p>
            </div>
            <div className="credential-quick-actions">
              <button
                className="credential-action-button"
                type="button"
                onClick={() => void props.onOpenPolymarketMagicExport()}
              >
                {props.messages.polymarket.magicExportButton}
              </button>
              <button
                className="credential-action-button primary"
                type="button"
                onClick={() => void props.onPolymarketClipboardImport()}
              >
                {props.messages.polymarket.clipboardImportButton}
              </button>
            </div>
            <p className="panel-note">{props.messages.polymarket.clipboardImportNote}</p>
          </div>
          <label className="field-stack">
            <span>{props.messages.polymarket.tradingAddressLabel}</span>
            <input
              autoComplete="off"
              placeholder={props.messages.polymarket.tradingAddressPlaceholder}
              type="text"
              value={props.polymarketTradingAddress}
              onChange={(event) =>
                props.onPolymarketTradingAddressChange(event.currentTarget.value)
              }
            />
          </label>
          <label className="field-stack">
            <span>{props.messages.polymarket.signatureTypeLabel}</span>
            <select
              value={props.polymarketSignatureType}
              onChange={(event) =>
                props.onPolymarketSignatureTypeChange(
                  event.currentTarget.value as PolymarketSignatureType,
                )
              }
            >
              <option value="proxy">
                {props.messages.polymarket.signatureTypeOptions.proxy}
              </option>
              <option value="poly_1271">
                {props.messages.polymarket.signatureTypeOptions.poly1271}
              </option>
              <option value="gnosis_safe">
                {props.messages.polymarket.signatureTypeOptions.gnosisSafe}
              </option>
              <option value="eoa">
                {props.messages.polymarket.signatureTypeOptions.eoa}
              </option>
            </select>
          </label>
          <p className="panel-note">{props.messages.polymarket.tradingAddressNote}</p>
          <ol>
            {props.messages.polymarket.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <details className="credential-advanced-import">
          <summary>{props.messages.polymarket.advancedImportLabel}</summary>
          <label className="field-stack">
            <span>{props.messages.polymarket.signerSourceLabel}</span>
            <input
              autoComplete="off"
              placeholder={props.messages.polymarket.signerSourcePlaceholder}
              type="text"
              value={props.polymarketSignerFilePath}
              onChange={(event) =>
                props.onPolymarketSignerFilePathChange(event.currentTarget.value)
              }
            />
          </label>
          <p className="panel-note">{props.messages.polymarket.importNote}</p>
        </details>
      </section>
    );
  }

  return (
    <section
      className="credential-step"
      aria-label={props.messages.kalshi.secureImportAria}
    >
      <div className="credential-source-panel">
        <strong>{props.messages.recommendedImport}</strong>
        <p>{props.messages.kalshi.description}</p>
        <ol>
          {props.messages.kalshi.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <label className="field-stack">
        <span>{props.messages.kalshi.apiKeyIdLabel}</span>
        <input
          autoComplete="off"
          placeholder={props.messages.kalshi.apiKeyIdPlaceholder}
          type="text"
          value={props.kalshiApiKeyId}
          onChange={(event) => props.onKalshiApiKeyIdChange(event.currentTarget.value)}
        />
      </label>
      <label className="field-stack">
        <span>{props.messages.kalshi.keySourceLabel}</span>
        <input
          autoComplete="off"
          placeholder={props.messages.kalshi.keySourcePlaceholder}
          type="text"
          value={props.kalshiKeyFilePath}
          onChange={(event) => props.onKalshiKeyFilePathChange(event.currentTarget.value)}
        />
      </label>
      <p className="panel-note">{props.messages.kalshi.importNote}</p>
    </section>
  );
}

function ProviderAccountCandidateList(props: {
  messages: ProviderOnboardingMessages;
  provider:
    | DesktopTerminalState["providerOnboarding"]["providers"][number]
    | undefined;
  onApplyCandidate?: (request: PolymarketAccountCandidateApplyRequest) => Promise<void>;
}) {
  const candidates = props.provider?.accountMetrics.accountCandidates ?? [];

  if (candidates.length === 0) {
    return null;
  }

  const displayCandidates = [...candidates]
    .sort((left, right) => Number(Boolean(right.recommended)) - Number(Boolean(left.recommended)))
    .slice(0, 4);

  return (
    <div>
      <dt>{props.messages.review.accountDiagnostics}</dt>
      <dd>
        <details className="account-candidate-diagnostics">
          <summary>{props.messages.review.candidateAccounts}</summary>
          <ul className="account-candidate-list">
            {displayCandidates.map((candidate) => {
              const portfolioValue = formatProviderMetricAmount(
                candidate.publicPortfolioValue,
              );
              const tradeReadyCash = formatProviderMetricAmount(
                candidate.tradeReadyCash,
              );
              const candidateSignatureType = isPolymarketSignatureType(
                candidate.signatureType,
              )
                ? candidate.signatureType
                : null;
              const candidateHasTradeReadyCash = hasPositiveProviderMetricAmount(
                candidate.tradeReadyCash,
              );
              const canApply =
                props.provider?.providerId === "polymarket" &&
                props.onApplyCandidate !== undefined &&
                !candidate.configured &&
                candidateSignatureType !== null &&
                (candidate.recommended === true || candidateHasTradeReadyCash);
              const meta = [
                candidate.maskedIdentifier,
                formatMachineValue(candidate.signatureType),
                candidate.configured
                  ? props.messages.review.configuredCandidate
                  : null,
              ].filter((value): value is string => value !== null);
              const label =
                candidate.signatureType === "poly_1271"
                  ? props.messages.polymarket.signatureTypeOptions.poly1271
                  : formatMachineValue(candidate.label);

              return (
                <li
                  key={`${candidate.label}-${candidate.signatureType}-${candidate.maskedIdentifier}`}
                  className={candidate.recommended ? "is-recommended" : undefined}
                >
                  <span>{label}</span>
                  {candidate.recommended ? (
                    <small className="candidate-recommendation">
                      {props.messages.review.recommendedCandidate}
                    </small>
                  ) : null}
                  <small>{meta.join(" - ")}</small>
                  <small>
                    {tradeReadyCash === null
                      ? props.messages.review.tradeReadyCashUnavailable
                      : `${props.messages.review.tradeReadyCash}: ${tradeReadyCash}`}
                  </small>
                  <small>
                    {portfolioValue === null
                      ? props.messages.review.portfolioUnavailable
                      : `${props.messages.review.publicPortfolio}: ${portfolioValue}`}
                  </small>
                  {canApply ? (
                    <button
                      className="candidate-apply-button"
                      type="button"
                      onClick={() =>
                        props.onApplyCandidate?.({
                          label: candidate.label,
                          signatureType: candidateSignatureType,
                        })
                      }
                    >
                      {props.messages.review.useCandidate}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      </dd>
    </div>
  );
}

function CredentialReviewStep(props: {
  messages: ProviderOnboardingMessages;
  provider:
    | DesktopTerminalState["providerOnboarding"]["providers"][number]
    | undefined;
  providerId: OnboardingProviderId;
  onPolymarketAccountCandidateApply: (
    request: PolymarketAccountCandidateApplyRequest,
  ) => Promise<void>;
}) {
  const credentialStatus = props.provider?.credential.status ?? "unknown";
  const accountMetricsStatus = props.provider?.accountMetrics.status ?? "unknown";
  const availableFunds = formatProviderMetricAmount(
    props.provider?.accountMetrics.availableFunds,
  );
  const publicPortfolioValue = formatProviderMetricAmount(
    props.provider?.accountMetrics.publicPortfolioValue,
  );

  return (
    <section className="credential-step" aria-label={props.messages.review.aria}>
      <dl className="credential-review-grid">
        <div>
          <dt>{props.messages.review.provider}</dt>
          <dd>{formatProviderLabel(props.providerId)}</dd>
        </div>
        <div>
          <dt>{props.messages.review.credential}</dt>
          <dd>{formatMachineValue(credentialStatus)}</dd>
        </div>
        <div>
          <dt>{props.messages.review.accountMetrics}</dt>
          <dd>
            <span>{formatMachineValue(accountMetricsStatus)}</span>
            {availableFunds === null ? null : (
              <small>
                {props.messages.review.tradeReadyCash}: {availableFunds}
              </small>
            )}
            {publicPortfolioValue === null ? null : (
              <small>
                {props.messages.review.publicPortfolio}: {publicPortfolioValue}
              </small>
            )}
          </dd>
        </div>
        <ProviderAccountCandidateList
          messages={props.messages}
          provider={props.provider}
          onApplyCandidate={props.onPolymarketAccountCandidateApply}
        />
        <div>
          <dt>{props.messages.review.liveSubmit}</dt>
          <dd>{props.messages.review.liveSubmitBlocked}</dd>
        </div>
      </dl>
      <OnboardingReasonList messages={props.messages} provider={props.provider} />
      <p className="panel-note">{props.messages.review.note}</p>
    </section>
  );
}

function createCredentialConnectRequest(
  props: Pick<
    Parameters<typeof ProviderCredentialWizard>[0],
    | "kalshiApiKeyId"
    | "kalshiKeyFilePath"
    | "polymarketSignerFilePath"
    | "polymarketSignatureType"
    | "polymarketTradingAddress"
    | "providerId"
  >,
): ProviderCredentialConnectRequest {
  if (props.providerId === "polymarket") {
    return {
      providerId: "polymarket",
      credentialSource: "explicit_local_provider",
      polymarketSignerFilePath: props.polymarketSignerFilePath.trim(),
      polymarketTradingAddress: props.polymarketTradingAddress.trim(),
      polymarketSignatureType: props.polymarketSignatureType,
    };
  }

  return {
    providerId: "kalshi",
    credentialSource: "explicit_local_provider",
    kalshiApiKeyId: props.kalshiApiKeyId.trim(),
    kalshiKeyFilePath: props.kalshiKeyFilePath.trim(),
  };
}

function OnboardingReasonList(props: {
  messages: ProviderOnboardingMessages;
  provider:
    | DesktopTerminalState["providerOnboarding"]["providers"][number]
    | undefined;
}) {
  if (props.provider === undefined || props.provider.reasons.length === 0) {
    return null;
  }

  return (
    <ul className="gate-reason-list">
      {props.provider.reasons.slice(0, 4).map((reason) => (
        <li key={reason}>{getOnboardingReasonMessage(props.messages, reason)}</li>
      ))}
    </ul>
  );
}

function getProviderGateReasonMessage(
  messages: TerminalMessages,
  reason: string,
): string {
  return getOnboardingReasonMessage(messages.providerOnboarding, reason);
}

function getOnboardingReasonMessage(
  messages: ProviderOnboardingMessages,
  reason: string,
): string {
  return messages.review.reasonMessages[reason] ?? formatMachineValue(reason);
}

function ExecutionModeButton(props: {
  messages: AppMessages;
  mode: ExecutionModeOption;
  onExecutionModeChange: (executionMode: DesktopOrderExecutionMode) => void;
}) {
  const label = props.messages.common.statusLabels.executionModes[props.mode.id];
  const detail = props.mode.blockingReasons[0] ?? props.mode.availability;

  return (
    <button
      aria-pressed={props.mode.current}
      className={props.mode.current ? "mode-button is-current" : "mode-button"}
      title={props.mode.summary}
      type="button"
      onClick={() => props.onExecutionModeChange(props.mode.id)}
    >
      <span>{label}</span>
      <small>{formatMachineValue(detail)}</small>
    </button>
  );
}

function MetricsPanel(props: {
  messages: TerminalMessages;
  metricGroups: readonly MetricGroup[];
}) {
  const visibleMetricGroups = props.metricGroups
    .filter((group) => group.scope === "provider")
    .map((group) => ({
      ...group,
      subject: formatProviderLabel(MARKET_RAIL_PROVIDER_ID),
    }));

  if (visibleMetricGroups.length === 0) {
    return null;
  }

  return (
    <section className="rail-section" aria-labelledby="metrics-title">
      <h3 id="metrics-title">{props.messages.sections.metrics}</h3>
      <div className="metric-groups">
        {visibleMetricGroups.map((group) => (
          <article className="metric-group" key={group.scope}>
            <div className="metric-group-title">
              <strong>{formatMachineValue(group.scope)}</strong>
              <span>{group.subject}</span>
            </div>
            <dl>
              {group.metrics.map((metric) => (
                <div key={metric.key}>
                  <dt>{props.messages.metrics[metric.key]}</dt>
                  <dd>{metric.displayValue}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function BottomStatusStrip(props: {
  messages: TerminalMessages;
  state: DesktopTerminalState;
}) {
  return (
    <footer className="bottom-strip">
      <span>
        {props.messages.labels.websocket}:{" "}
        <strong>{formatMachineValue(props.state.subscription.status)}</strong>
      </span>
      <span>
        {props.messages.labels.dataFreshness}:{" "}
        <strong>{formatMachineValue(props.state.dataFreshness)}</strong>
      </span>
      <span>
        {props.messages.labels.mode}:{" "}
        <strong>{formatMachineValue(props.state.execution.currentMode)}</strong>
      </span>
      <span>
        {props.messages.labels.audit}:{" "}
        <strong>{formatMachineValue(props.state.auditLog.status)}</strong>
      </span>
      <span>
        {props.messages.labels.build}: <strong>{props.state.buildChannel}</strong>
      </span>
    </footer>
  );
}

function PanelHeader(props: { eyebrow: string; id: string; title: string }) {
  return (
    <header className="panel-header">
      <p className="panel-eyebrow">{props.eyebrow}</p>
      <h2 id={props.id}>{props.title}</h2>
    </header>
  );
}

function StatusChip(props: {
  label: string;
  tone: "danger" | "info" | "muted" | "warning";
  value: string;
}) {
  return (
    <span className={`status-chip ${props.tone}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </span>
  );
}

function VenueBadge(props: { providerId: "polymarket" | "kalshi" }) {
  return (
    <span className={`venue-badge ${props.providerId}`} aria-label={formatProviderLabel(props.providerId)}>
      <span className="venue-mark" aria-hidden="true" />
      {props.providerId === "polymarket" ? "Polymarket" : "Kalshi"}
    </span>
  );
}

function getConnectionTone(
  status: DesktopTerminalState["subscription"]["status"],
): "danger" | "info" | "muted" | "warning" {
  if (status === "connected") {
    return "info";
  }

  if (status === "connecting" || status === "reconnecting" || status === "stale") {
    return "warning";
  }

  if (status === "disconnected") {
    return "muted";
  }

  return "danger";
}

function getCredentialTone(
  status: string | undefined,
): "danger" | "info" | "muted" | "warning" {
  switch (status) {
    case "ready":
      return "info";
    case "invalid":
    case "blocked":
      return "danger";
    case "missing":
      return "warning";
    default:
      return "muted";
  }
}

function getSelectedProviderLabel(state: DesktopTerminalState) {
  return state.providers.find((provider) => provider.id === state.selectedProviderId)?.label ?? "";
}

function formatProviderLabel(providerId: "polymarket" | "kalshi") {
  return providerId === "polymarket" ? "Polymarket" : "Kalshi";
}

function resolveActiveLegalApprovalProviderId(
  state: DesktopTerminalState,
): OnboardingProviderId {
  const polymarket = state.providerOnboarding.providers.find(
    (provider) => provider.providerId === "polymarket",
  );

  if (polymarket?.credential.status === "ready") {
    return "polymarket";
  }

  return state.selectedProviderId === "kalshi" ? "kalshi" : "polymarket";
}

function selectLegalApprovalStatusForProvider(
  status: LegalApprovalStatusCommandResponse | null,
  providerId: OnboardingProviderId,
): LegalApprovalStatusCommandResponse | null {
  return status?.providerId === providerId ? status : null;
}

function createPolymarketConnectedBannerModel(
  provider:
    | DesktopTerminalState["providerOnboarding"]["providers"][number]
    | undefined,
  messages: ProviderOnboardingMessages,
):
  | {
      accountLabel: string;
      maskedIdentifier: string;
      tradeReadyCash: string | null;
    }
  | null {
  if (provider?.providerId !== "polymarket" || provider.credential.status !== "ready") {
    return null;
  }

  const candidates = provider.accountMetrics.accountCandidates ?? [];
  const candidate =
    candidates.find(
      (account) => account.configured && hasPositiveProviderMetricAmount(account.tradeReadyCash),
    ) ??
    candidates.find(
      (account) =>
        account.recommended === true &&
        hasPositiveProviderMetricAmount(account.tradeReadyCash),
    ) ??
    candidates.find((account) => account.configured) ??
    candidates.find((account) => account.recommended === true);
  const maskedIdentifier =
    candidate?.maskedIdentifier ??
    provider.credential.maskedIdentifier ??
    provider.credential.message;
  const tradeReadyCash = formatProviderMetricAmount(
    candidate?.tradeReadyCash ?? provider.accountMetrics.availableFunds,
  );

  return {
    accountLabel: formatPolymarketAccountLabel(candidate?.signatureType, messages),
    maskedIdentifier,
    tradeReadyCash,
  };
}

function formatPolymarketAccountLabel(
  signatureType: string | undefined,
  messages: ProviderOnboardingMessages,
) {
  switch (signatureType) {
    case "poly_1271":
      return messages.polymarket.signatureTypeOptions.poly1271;
    case "proxy":
      return messages.polymarket.signatureTypeOptions.proxy;
    case "gnosis_safe":
      return messages.polymarket.signatureTypeOptions.gnosisSafe;
    case "eoa":
      return messages.polymarket.signatureTypeOptions.eoa;
    default:
      return "Polymarket";
  }
}

function isPolymarketSignatureType(value: string): value is PolymarketSignatureType {
  return (
    value === "eoa" ||
    value === "proxy" ||
    value === "gnosis_safe" ||
    value === "poly_1271"
  );
}

function formatProviderMetricAmount(metric: ProviderMetricAmount | undefined) {
  return metric === undefined ? null : `${metric.amount} ${metric.currency}`;
}

function formatMachineValue(value: string) {
  return value.replace(/_/g, " ");
}

function formatOptionalDecimal(value: string | null | undefined) {
  return value ?? "--";
}

function getLadderCellClassName(row: LadderDisplayRow, side: "ask" | "bid") {
  const baseClassName = side === "bid" ? "bid-cell" : "ask-cell";

  if (row.status !== "provider_snapshot") {
    return `${baseClassName} is-empty`;
  }

  if ((side === "bid" && row.isBestBid) || (side === "ask" && row.isBestAsk)) {
    return `${baseClassName} is-best`;
  }

  return baseClassName;
}

function getLadderActionLabel(
  messages: TerminalMessages,
  row: LadderDisplayRow,
  side: "ask" | "bid",
) {
  const sideLabel = side === "bid" ? messages.labels.back : messages.labels.lay;
  const size = side === "bid" ? row.bidSize : row.askSize;
  const price = row.price ?? messages.placeholders.unknown;

  return `${sideLabel} ${price}. ${messages.labels.available}: ${formatOptionalDecimal(size)}. ${messages.placeholders.ladderClickBlocked}`;
}

function getLadderRowKey(row: LadderDisplayRow) {
  return row.price === null ? `placeholder-${row.level}` : `snapshot-${row.price}`;
}
