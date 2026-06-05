export const supportedLocales = ["en", "es", "ca"] as const;

export type LocaleCode = (typeof supportedLocales)[number];

export const fallbackLocale: LocaleCode = "en";
export const localeStorageKey = "prediction-ladder.locale";

export type ExecutionModeLabelKey =
  | "disabled"
  | "paper"
  | "live_dry_run"
  | "live"
  | "live_blocked";
export type ImplementationStatusLabelKey =
  | "contracts_ready"
  | "domain_core_complete"
  | "official_runtime_streaming_ready"
  | "read_only_adapters_ready"
  | "scaffold_only"
  | "tooling_ready";
export type LandingDownloadStateKey = "installer_pending_bootstrap";

export type DesktopLadderStateLabelKey =
  | "no_market"
  | "loading"
  | "fresh"
  | "empty"
  | "stale"
  | "disconnected"
  | "error";

export type DesktopGateLabelKey =
  | "legal"
  | "geo"
  | "credential"
  | "local_approval"
  | "acknowledgement"
  | "account_metrics"
  | "audit"
  | "live";

export type DesktopMetricLabelKey =
  | "pnl"
  | "available_funds"
  | "open_order_amount"
  | "exposure";

export type DesktopOrderRejectionReasonKey =
  | "market_not_selected"
  | "order_book_not_fresh"
  | "price_not_aligned_to_tick"
  | "stake_not_configured"
  | "execution_disabled"
  | "kill_switch_active_for_risk_increasing_action"
  | "legal_gate_not_approved"
  | "c1_approval_missing"
  | "geo_blocked"
  | "geo_unknown"
  | "credentials_missing"
  | "local_approval_missing"
  | "one_click_not_armed"
  | "first_live_ack_missing"
  | "stake_exceeds_limit"
  | "exposure_exceeds_limit"
  | "available_funds_unknown"
  | "insufficient_available_funds"
  | "provider_exposure_unknown"
  | "market_exposure_unknown"
  | "marketable_order_not_approved"
  | "position_unknown"
  | "c0_risk_detected"
  | "fee_disclosure_missing"
  | "order_intent_missing"
  | "audit_log_not_enabled"
  | "invalid_price"
  | "invalid_stake"
  | "invalid_exposure"
  | "invalid_available_funds"
  | "invalid_risk_limit";

export type DesktopRiskAlertDiagnosticKey =
  | "provider"
  | "market"
  | "accountMetrics"
  | "metricsSource"
  | "availableFundsRead"
  | "openOrderAmount"
  | "positionExposure"
  | "providerExposure"
  | "marketExposure"
  | "checkedAt";

export type DesktopBootCheckKey =
  | "liveExecutionDisabledByDefault"
  | "oneClickOffByDefault"
  | "rendererSecretSafe"
  | "providersDeferred";

export type LandingTrustNoteKey =
  | "desktopDistribution"
  | "noCustody"
  | "installerPending";

export type LegalNoteKey =
  | "jurisdictionRestrictions"
  | "liveRequiresApproval"
  | "noBypass";

export type AppMessages = {
  common: {
    productName: string;
    languageLabel: string;
    localeNames: Record<LocaleCode, string>;
    statusLabels: {
      booleans: {
        no: string;
        yes: string;
      };
      executionModes: Record<ExecutionModeLabelKey, string>;
      implementationStatuses: Record<ImplementationStatusLabelKey, string>;
      landingDownloadStates: Record<LandingDownloadStateKey, string>;
      liveTrading: {
        blocked: string;
        enabled: string;
      };
      oneClick: {
        armed: string;
        off: string;
      };
    };
    legalNotes: Record<LegalNoteKey, string>;
  };
  desktop: {
    eyebrow: string;
    summary: string;
    statusGridAria: string;
    checksAria: string;
    statusLabels: {
      coreBoundary: string;
      executionMode: string;
      liveTrading: string;
      oneClick: string;
    };
    statusValues: {
      coreBoundary: string;
    };
    checks: Record<DesktopBootCheckKey, string>;
    terminal: {
      ariaLabel: string;
      title: string;
      subtitle: string;
      sections: {
        auditLog: string;
        executionModes: string;
        gates: string;
        ladder: string;
        marketSearch: string;
        metrics: string;
        openOrders: string;
        orderPreview: string;
        providers: string;
        risk: string;
        riskLimits: string;
        stake: string;
        venueHealth: string;
      };
      labels: {
        account: string;
        allVenues: string;
        allVenuesShort: string;
        adapter: string;
        askSize: string;
        audit: string;
        available: string;
        back: string;
        bidSize: string;
        build: string;
        connection: string;
        current: string;
        dataFreshness: string;
        gate: string;
        killSwitch: string;
        market: string;
        manualStake: string;
        maxExposure: string;
        maxStake: string;
        mode: string;
        moreAvailable: string;
        noLiveData: string;
        oneClick: string;
        pageEnd: string;
        price: string;
        keyboard: string;
        lay: string;
        provider: string;
        resultCount: string;
        selected: string;
        side: string;
        status: string;
        stake: string;
        submit: string;
        cancel: string;
        subject: string;
        quantity: string;
        unified: string;
        websocket: string;
      };
      actions: {
        armed: string;
        cancelLiveOrder: string;
        createPaperOrder: string;
        killSwitch: string;
        loadMore: string;
        loadingMore: string;
        liveCancelPending: string;
        off: string;
        previewOnly: string;
        runFirstLiveSmoke: string;
        liveSmokePending: string;
        liveSmokeResult: string;
        runDryRun: string;
        search: string;
        searching: string;
      };
      placeholders: {
        accountMetricsPending: string;
        ladderNoBook: string;
        marketSearch: string;
        notConnected: string;
        notQueried: string;
        noAuditEvents: string;
        keyboardShortcutsPending: string;
        ladderClickBlocked: string;
        manualStake: string;
        noMarketSelected: string;
        noOpenOrders: string;
        noSubmitPath: string;
        liveSubmitPath: string;
        unknown: string;
      };
      ladderStates: Record<DesktopLadderStateLabelKey, string>;
      gates: Record<DesktopGateLabelKey, string>;
      metrics: Record<DesktopMetricLabelKey, string>;
      riskAlerts: {
        title: string;
        summary: string;
        diagnosticsTitle: string;
        fundsDiagnosticNote: string;
        reasonsTitle: string;
        codeLabel: string;
        close: string;
        diagnostics: Record<DesktopRiskAlertDiagnosticKey, string>;
        reasons: Record<DesktopOrderRejectionReasonKey, string>;
      };
      providerOnboarding: {
        setupEyebrow: string;
        close: string;
        stepsAria: string;
        steps: {
          guide: string;
          reference: string;
          review: string;
        };
        actions: {
          back: string;
          connect: string;
          finalApproval: string;
          next: string;
        };
        guideAria: string;
        guideIntro: string;
        guideLinkAria: string;
        guides: {
          polymarket: readonly {
            title: string;
            url: string;
            summary: string;
          }[];
          kalshi: readonly {
            title: string;
            url: string;
            summary: string;
          }[];
        };
        recommendedImport: string;
        polymarket: {
          secureImportAria: string;
          connectTitle: string;
          description: string;
          magicExportTitle: string;
          magicExportDescription: string;
          magicExportButton: string;
          signerPrivateKeyLabel: string;
          securePastePlaceholder: string;
          rememberDeviceLabel: string;
          connectedAsLabel: string;
          availableSuffix: string;
          connectButton: string;
          clipboardImportButton: string;
          clipboardImportNote: string;
          advancedImportLabel: string;
          steps: readonly string[];
          signerSourceLabel: string;
          signerSourcePlaceholder: string;
          tradingAddressLabel: string;
          tradingAddressPlaceholder: string;
          tradingAddressNote: string;
          signatureTypeLabel: string;
          signatureTypeOptions: {
            eoa: string;
            proxy: string;
            gnosisSafe: string;
            poly1271: string;
          };
          importNote: string;
        };
        kalshi: {
          secureImportAria: string;
          description: string;
          steps: readonly string[];
          apiKeyIdLabel: string;
          apiKeyIdPlaceholder: string;
          keySourceLabel: string;
          keySourcePlaceholder: string;
          importNote: string;
        };
        review: {
          aria: string;
          provider: string;
          credential: string;
          accountMetrics: string;
          tradeReadyCash: string;
          publicPortfolio: string;
          accountDiagnostics: string;
          candidateAccounts: string;
          configuredCandidate: string;
          recommendedCandidate: string;
          tradeReadyCashUnavailable: string;
          portfolioUnavailable: string;
          useCandidate: string;
          liveSubmit: string;
          liveSubmitBlocked: string;
          reasonMessages: Record<string, string>;
          note: string;
        };
      };
      legalApproval: {
        setupEyebrow: string;
        title: string;
        close: string;
        openAction: string;
        statusAria: string;
        statusTitle: string;
        formIntro: string;
        providerLabel: string;
        fields: {
          targetJurisdiction: string;
          targetJurisdictionPlaceholder: string;
          operatorIdentity: string;
          operatorIdentityPlaceholder: string;
          approver: string;
          approverPlaceholder: string;
          maxStakeFirstOrder: string;
          maxMarketExposure: string;
        };
        checksTitle: string;
        checksIntro: string;
        checks: {
          platformEligible: string;
          realOperator: string;
          realBeneficialOwners: string;
          realAccountOwner: string;
          noGeoblockBypass: string;
          noVpnBypass: string;
          noFakeKyc: string;
          noSanctionsBypass: string;
          noCustody: string;
          c0ReviewPass: string;
          c1RiskAccepted: string;
          auditEnabled: string;
          firstLiveSmokeOnly: string;
          noDepositsOrWithdrawals: string;
          understandsRisk: string;
        };
        singleApprovalToggle: string;
        singleApprovalNote: string;
        acknowledgementToggle: string;
        acknowledgementNote: string;
        actions: {
          submit: string;
          cancel: string;
        };
        readyNote: string;
        blockedNote: string;
      };
    };
  };
  landing: {
    surface: string;
    summary: string;
    statusRowAria: string;
    trustNotesAria: string;
    statusLabels: {
      download: string;
      sharedUiStatus: string;
      tradingSurface: string;
    };
    trustNotes: Record<LandingTrustNoteKey, string>;
  };
};
