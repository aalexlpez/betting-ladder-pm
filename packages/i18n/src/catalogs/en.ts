import { localeNames } from "./localeNames";
import type { AppMessages } from "../types";

export const en = {
  common: {
    productName: "Prediction Ladder",
    languageLabel: "Language",
    localeNames,
    statusLabels: {
      booleans: {
        no: "no",
        yes: "yes",
      },
      executionModes: {
        disabled: "disabled",
        live: "live",
        live_blocked: "live blocked",
        live_dry_run: "live dry-run",
        paper: "paper",
      },
      implementationStatuses: {
        contracts_ready: "contracts ready",
        domain_core_complete: "domain core complete",
        official_runtime_streaming_ready: "official runtime streaming ready",
        read_only_adapters_ready: "read-only adapters ready",
        scaffold_only: "scaffold only",
        tooling_ready: "tooling ready",
      },
      landingDownloadStates: {
        installer_pending_bootstrap: "installer pending bootstrap",
      },
      liveTrading: {
        blocked: "blocked",
        enabled: "enabled",
      },
      oneClick: {
        armed: "armed",
        off: "off",
      },
    },
    legalNotes: {
      jurisdictionRestrictions:
        "Prediction markets may be restricted by jurisdiction; live use must pass legal and platform eligibility gates.",
      liveRequiresApproval:
        "Live trading remains blocked until legal, geographic, credential, risk, audit, and explicit acknowledgement gates pass.",
      noBypass:
        "The product must not be used to bypass geoblocks, KYC, sanctions, platform restrictions, or applicable law.",
    },
  },
  desktop: {
    eyebrow: "Windows desktop terminal bootstrap",
    summary:
      "Tauri, Vite, React, and TypeScript are wired. Trading features remain gated until domain, provider, risk, audit, and live approval goals are implemented.",
    statusGridAria: "Bootstrap status",
    checksAria: "Safety checks",
    statusLabels: {
      coreBoundary: "Core boundary",
      executionMode: "Execution mode",
      liveTrading: "Live trading",
      oneClick: "One-click",
    },
    statusValues: {
      coreBoundary: "domain boundary ready",
    },
    checks: {
      liveExecutionDisabledByDefault: "Live execution disabled by default",
      oneClickOffByDefault: "One-click trading off by default",
      rendererSecretSafe:
        "Renderer has no filesystem, shell, provider SDK, or secret access",
      providersDeferred:
        "Provider integrations intentionally deferred until market-data goal",
    },
    terminal: {
      ariaLabel: "Prediction Ladder terminal shell",
      title: "Provider-ready ladder terminal",
      subtitle:
        "First-pass Windows trading shell with honest provider, ladder, risk, gate, and audit states. No external provider APIs are called in this goal.",
      sections: {
        auditLog: "Audit log",
        executionModes: "Execution modes",
        gates: "Live gate summary",
        ladder: "Ladder workspace",
        marketSearch: "Market search",
        metrics: "Financial metrics",
        openOrders: "Open orders",
        orderPreview: "Order preview",
        providers: "Providers",
        risk: "Risk controls",
        riskLimits: "Risk limits",
        stake: "Stake presets",
        venueHealth: "Venue health",
      },
      labels: {
        account: "Account",
        allVenues: "All venues",
        allVenuesShort: "All",
        adapter: "Adapter",
        askSize: "Ask size",
        audit: "Audit",
        available: "Available",
        back: "Back",
        bidSize: "Bid size",
        build: "Build",
        connection: "Connection",
        current: "Current",
        dataFreshness: "Data freshness",
        gate: "Gate",
        killSwitch: "Kill switch",
        market: "Market",
        manualStake: "Manual stake",
        maxExposure: "Max exposure",
        maxStake: "Max stake",
        mode: "Mode",
        moreAvailable: "More available",
        noLiveData: "No live data",
        oneClick: "One-click",
        pageEnd: "Page end",
        price: "Price",
        keyboard: "Keyboard",
        lay: "Lay",
        provider: "Provider",
        resultCount: "Results",
        selected: "Selected",
        side: "Side",
        status: "Status",
        stake: "Stake",
        submit: "Submit",
        cancel: "Cancel",
        subject: "Subject",
        quantity: "Quantity",
        unified: "Unified",
        websocket: "Stream",
      },
      actions: {
        armed: "Armed",
        cancelLiveOrder: "Cancel live order",
        createPaperOrder: "Create paper order",
        killSwitch: "Kill switch visible",
        loadMore: "Load more",
        loadingMore: "Loading more",
        liveCancelPending: "Cancelling",
        off: "Off",
        previewOnly: "Preview only",
        runFirstLiveSmoke: "Create live order",
        liveSmokePending: "Submitting live order",
        liveSmokeResult: "Live order result",
        runDryRun: "Run dry-run check",
        search: "Search",
        searching: "Searching",
      },
      placeholders: {
        accountMetricsPending:
          "Provider account metrics are intentionally unknown until read-only adapters and credential-safe account summaries exist.",
        ladderNoBook: "No order book loaded",
        marketSearch: "Search ready, adapters pending",
        notConnected: "not connected",
        notQueried: "not queried",
        noAuditEvents: "No audit events loaded",
        keyboardShortcutsPending:
          "Keyboard order shortcuts are not wired yet; Back/Lay cell clicks create safe order-intent previews.",
        ladderClickBlocked:
          "The price column is preview-only; Back/Lay cells create order-intent previews through risk and audit checks.",
        manualStake: "Enter stake",
        noMarketSelected: "No market selected",
        noOpenOrders: "No open orders loaded",
        noSubmitPath: "No submit path exposed",
        liveSubmitPath: "Tauri live route ready",
        unknown: "Unknown",
      },
      ladderStates: {
        disconnected: "disconnected",
        empty: "empty",
        error: "error",
        fresh: "fresh",
        loading: "loading",
        no_market: "no market",
        stale: "stale",
      },
      gates: {
        account_metrics: "Account metrics",
        acknowledgement: "Acknowledgement",
        audit: "Audit",
        credential: "Credential",
        geo: "Geo",
        legal: "Legal",
        local_approval: "Local approval",
        live: "Live",
      },
      metrics: {
        available_funds: "Available funds",
        exposure: "Exposure",
        open_order_amount: "Open-order amount",
        pnl: "PnL",
      },
      riskAlerts: {
        title: "Order blocked",
        summary:
          "The ladder click created a preview, but deterministic risk validation blocked the order.",
        diagnosticsTitle: "Account read used",
        fundsDiagnosticNote:
          "Prediction Ladder refreshes the Polymarket CLOB balance/allowance cache before this read. If the website shows a different value, confirm whether it is portfolio value or trade-ready pUSD cash, then check that the signer, funder, signature type, allowance, and deposit-wallet setup all belong to the same account.",
        reasonsTitle: "Blocking reasons",
        codeLabel: "Code",
        close: "Close",
        diagnostics: {
          provider: "Provider",
          market: "Market",
          accountMetrics: "Account metrics",
          metricsSource: "Metrics source",
          availableFundsRead: "Available funds read",
          openOrderAmount: "Open-order amount",
          positionExposure: "Position exposure",
          providerExposure: "Provider exposure",
          marketExposure: "Market exposure",
          checkedAt: "Checked at",
        },
        reasons: {
          market_not_selected: "Select a market before creating an order.",
          order_book_not_fresh: "The order book is not fresh enough for an order.",
          price_not_aligned_to_tick:
            "The price is not aligned with this market tick size.",
          stake_not_configured: "Choose a stake amount before ordering.",
          execution_disabled: "Execution mode is disabled.",
          kill_switch_active_for_risk_increasing_action:
            "The kill switch is active, so new risk-increasing orders are blocked.",
          legal_gate_not_approved:
            "The legal gate is not approved for live trading.",
          c1_approval_missing: "C1 administrative risk approval is missing.",
          geo_blocked:
            "Current geo or platform eligibility blocks live trading.",
          geo_unknown: "Geo or platform eligibility is unknown.",
          credentials_missing: "Provider credentials are missing.",
          local_approval_missing: "Local app approval is missing.",
          one_click_not_armed: "One-click is not armed.",
          first_live_ack_missing: "First-live acknowledgement is missing.",
          stake_exceeds_limit: "Stake exceeds the configured order limit.",
          exposure_exceeds_limit:
            "Projected exposure exceeds the configured market limit.",
          available_funds_unknown: "Available funds are unknown.",
          insufficient_available_funds:
            "Insufficient available funds for this order.",
          provider_exposure_unknown: "Provider exposure is unknown.",
          market_exposure_unknown: "Market exposure is unknown.",
          marketable_order_not_approved:
            "This price would cross the spread; marketable orders are not approved.",
          position_unknown: "Position availability is unknown.",
          c0_risk_detected: "C0 no-go risk detected.",
          fee_disclosure_missing: "Fee disclosure has not been accepted.",
          order_intent_missing: "No order intent exists to submit.",
          audit_log_not_enabled: "Audit logging is not enabled.",
          invalid_price: "Price is invalid.",
          invalid_stake: "Stake amount is invalid.",
          invalid_exposure: "Exposure value is invalid.",
          invalid_available_funds: "Available funds value is invalid.",
          invalid_risk_limit: "Risk limit configuration is invalid.",
        },
      },
      providerOnboarding: {
        setupEyebrow: "Provider account setup",
        close: "Close provider setup",
        stepsAria: "Provider setup steps",
        steps: {
          guide: "Guide",
          reference: "Secure import",
          review: "Review",
        },
        actions: {
          back: "Back",
          connect: "Connect",
          finalApproval: "Final approvals",
          next: "Next",
        },
        guideAria: "Credential guide",
        guideIntro:
          "Use this screen as a checklist. First prepare the credential in the provider account, then return here and use the one-click local import or enter only the requested ID/source file fallback. Prediction Ladder imports credential material into encrypted Tauri-owned local storage; React never asks for seed phrases, raw API secrets, passphrases, signatures, or signed payloads.",
        guideLinkAria: "Official credential reference",
        guides: {
          polymarket: [
            {
              title: "Polymarket CLOB authentication",
              url: "https://docs.polymarket.com/api-reference/authentication",
              summary:
                "Polymarket CLOB auth is signer-based. The normal desktop flow imports a local signer once into Tauri-owned encrypted storage; a website API key alone cannot sign orders.",
            },
            {
              title: "Polymarket deposit wallet guide",
              url: "https://docs.polymarket.com/trading/deposit-wallets",
              summary:
                "Review the wallet, signature type, and funder model Polymarket expects before live readiness is attempted.",
            },
            {
              title: "Polymarket pUSD collateral",
              url: "https://docs.polymarket.com/concepts/pusd",
              summary:
                "Polymarket uses pUSD as the collateral token for trading; missing pUSD funds remains a live preflight blocker.",
            },
          ],
          kalshi: [
            {
              title: "Kalshi API keys",
              url: "https://docs.kalshi.com/getting_started/api_keys",
              summary:
                "Generate the Key ID and save the one-time RSA key download; the app imports that local key into encrypted Tauri-owned storage.",
            },
            {
              title: "Kalshi profile settings",
              url: "https://kalshi.com/account/profile",
              summary:
                "Open the account profile page where Kalshi exposes the API Keys section.",
            },
          ],
        },
        recommendedImport: "Recommended app-managed import",
        polymarket: {
          secureImportAria: "Polymarket secure import",
          connectTitle: "Connect your wallet",
          description:
            "Copy the Magic export key, return here, and connect. Tauri reads the copied value in the main process, finds the matching Polymarket account candidates, and shows trade-ready pUSD without exposing the key to React. The Polymarket Settings Profile/API address is only an optional advanced fallback.",
          magicExportTitle: "Fast path for email/Magic accounts",
          magicExportDescription:
            "Open Magic, export the signer key, copy it, then connect here.",
          magicExportButton: "Export from Magic",
          signerPrivateKeyLabel: "Signer private key",
          securePastePlaceholder: "Copied Magic key or URL in clipboard",
          rememberDeviceLabel: "Remember on this device",
          connectedAsLabel: "Logged in as",
          availableSuffix: "available",
          connectButton: "Connect",
          clipboardImportButton: "Import copied key",
          clipboardImportNote:
            "Click the field or Connect after copying from Magic. The key is read by Tauri, encrypted locally, and cleared from the clipboard after a successful import.",
          advancedImportLabel: "Advanced fallback: import from a local signer file",
          steps: [
            "Click Export from Magic. The app opens https://reveal.magic.link/polymarket in your system browser, not inside the trading window.",
            "Sign in on Magic with the same email you use for Polymarket, click Export Private Key, and copy the revealed key once. Never copy a recovery phrase / seed phrase.",
            "Optionally open https://polymarket.com/settings, go to Profile, and copy the 0x address labeled for API use. Use that public Profile/API address only with Signature Type Proxy / Magic. If you leave it blank, Tauri derives Magic account candidates from the signer, adds public 0x addresses found in the Magic export, and lets you choose one later.",
            "If Polymarket has moved your account to the Deposit Wallet flow, choose Deposit wallet / POLY_1271 below and paste the deposit wallet address that holds pUSD instead of the Profile/API address.",
            "Click Import copied key. Tauri reads the Windows clipboard in the main process, validates the signer plus optional funder/signature type, stores an encrypted app-managed signer copy, clears the clipboard after a successful import, derives account candidates, preserves public Magic-export account candidates, and refreshes Polymarket CLOB balance/allowance before checking funds.",
            "If your Polymarket account was created with an external wallet instead of email/Magic, export only a dedicated wallet account key from that wallet and use the advanced local signer file fallback below.",
            "If the later preflight says pUSD balance, allowance, funder, or deposit-wallet setup is missing, fix that on Polymarket first; this app does not deposit funds, withdraw funds, create deposit wallets, or bypass provider restrictions.",
          ],
          signerSourceLabel: "One-time signer import source path",
          signerSourcePlaceholder:
            "C:\\Users\\you\\Documents\\polymarket-signer.local.key",
          tradingAddressLabel: "Optional Settings/Profile address",
          tradingAddressPlaceholder: "0x... from Polymarket Settings",
          tradingAddressNote:
            "For Proxy / Magic, the Profile/API address from Polymarket Settings > Profile is optional at import time; leaving it blank lets Tauri derive candidate accounts from the signer and inspect public 0x addresses included in the Magic export. For Deposit Wallet / POLY_1271, paste the deposit wallet address that holds pUSD or choose the masked Magic-export deposit-wallet candidate after import. The signer key signs; the selected funder address is where Polymarket checks pUSD funds, allowance, positions, and open orders.",
          signatureTypeLabel: "Signature type",
          signatureTypeOptions: {
            eoa: "EOA signer address",
            proxy: "Proxy / Magic account (recommended)",
            gnosisSafe: "Gnosis Safe",
            poly1271: "Deposit wallet / POLY_1271",
          },
          importNote:
            "Paste a Windows file path only, never the key text itself. The Tauri main process reads the file once, rejects seed-like material, writes an encrypted local copy under the app credential provider, and never returns signer material to React.",
        },
        kalshi: {
          secureImportAria: "Kalshi secure import",
          description:
            "Kalshi is configured from your account API Keys page. You copy the displayed API Key ID into this screen, and you import the downloaded `.key` file by path. Do not paste the `.key` contents into React.",
          steps: [
            "Open https://kalshi.com/account/profile in your browser and log in to the Kalshi account you intend to use.",
            "Find the API Keys section. If you are on a different settings page, use Account & security or Profile Settings, then API Keys.",
            "Click Create New API Key or Create Key. Give it a recognizable name such as Prediction Ladder if Kalshi asks for one.",
            "Before closing the Kalshi page, save the downloaded `.key` file somewhere you can find, for example Documents\\kalshi.key. If you already closed the page without saving the key file, create a new API key.",
            "Copy the API Key ID shown by Kalshi. It usually looks like a UUID, for example a952bcbe-ec3b-4b5b-b8f9-11dae589608c. Paste that value into the API Key ID field below.",
            "In Windows File Explorer, right-click the downloaded `.key` file, choose Copy as path, then paste that full path into the `.key` source path field. Remove surrounding quotes if Windows pasted them.",
            "Click Connect. Tauri validates the RSA key, imports an encrypted app-managed copy, and uses it only in the main process to sign Kalshi requests.",
            "If the app reports `kalshi_key_file_invalid`, create a new unencrypted Kalshi API key. If Kalshi returns 401/unauthorized, make sure the Key ID and `.key` file came from the same key creation screen.",
          ],
          apiKeyIdLabel: "API Key ID",
          apiKeyIdPlaceholder: "Kalshi API Key ID",
          keySourceLabel: "One-time .key import source path",
          keySourcePlaceholder: "C:\\path\\kalshi.key",
          importNote:
            "Paste the Key ID and a Windows file path only. Connect stores the Key ID plus an encrypted app-managed local copy of the key material. React never receives the key contents, auth headers, signatures, signed payloads, or full account identifiers.",
        },
        review: {
          aria: "Provider setup review",
          provider: "Provider",
          credential: "Credential",
          accountMetrics: "Account metrics",
          tradeReadyCash: "Trade-ready cash",
          publicPortfolio: "Public positions value",
          accountDiagnostics: "Advanced account diagnostics",
          candidateAccounts: "Detected account candidates",
          configuredCandidate: "configured",
          recommendedCandidate: "Recommended by account funds signal",
          tradeReadyCashUnavailable: "trade-ready cash unavailable",
          portfolioUnavailable: "portfolio value unavailable",
          useCandidate: "Use this account",
          liveSubmit: "Live submit",
          liveSubmitBlocked: "blocked until all gates pass",
          reasonMessages: {
            credentials_missing:
              "The provider credential is not ready. Check the specific credential reason below.",
            credential_source_missing:
              "No usable app-managed credential source is available for this provider.",
            polymarket_clipboard_signer_missing:
              "No Polymarket signer key was found in the Windows clipboard.",
            polymarket_clipboard_signer_invalid:
              "The copied value does not contain a valid Polymarket signer key. Copy the 0x key from Magic, or the Magic export text/URL that contains it. Do not paste seed phrases.",
            polymarket_local_signer_file_missing:
              "The Polymarket signer import source is missing.",
            polymarket_local_signer_file_invalid:
              "The Polymarket signer import source is not a valid local signer key.",
            polymarket_signature_type_missing:
              "Choose the Polymarket signature type before importing.",
            polymarket_signature_type_invalid:
              "The selected Polymarket signature type is not supported.",
            polymarket_trading_address_missing:
              "Enter the Polymarket Profile/API address from https://polymarket.com/settings.",
            polymarket_trading_address_invalid:
              "The Polymarket trading/funder address must be a valid 0x address.",
            polymarket_trading_address_zero:
              "The zero address cannot be used as the Polymarket trading/funder address.",
            polymarket_trading_address_not_allowed_for_eoa:
              "EOA mode uses the signer address directly; remove the separate trading/funder address or choose Proxy / Magic.",
            polymarket_trading_address_signer_mismatch:
              "This older local mismatch check is no longer used for Magic/Proxy accounts. Re-import the Magic signer with the Polymarket Profile/API address from settings and refresh preflight.",
            kalshi_api_key_id_missing:
              "Enter the Kalshi API Key ID from the same key creation screen as the .key file.",
            kalshi_key_file_missing:
              "Import the downloaded Kalshi .key file by local path.",
            kalshi_key_file_invalid:
              "The Kalshi .key file is not a parseable unencrypted RSA private key.",
            kalshi_key_file_encrypted_passphrase_not_supported:
              "Encrypted Kalshi .key files are not supported; create an unencrypted API key for local signing.",
          },
          note:
            "Connect stores the provider profile through Tauri plus an encrypted app-managed local credential copy where required. When credentials are ready, the onboarding flow opens the final legal/local approval step for this provider. Live trading remains disabled until preflight, legal, geo, account, market, risk, audit, kill-switch, acknowledgement, non-marketable, and adapter gates all pass.",
        },
      },
      legalApproval: {
        setupEyebrow: "Live responsibility gate",
        title: "Legal approval",
        close: "Close legal approval",
        openAction: "Open legal approval",
        statusAria: "Legal approval status",
        statusTitle: "Legal approval",
        formIntro:
          "Complete this for the provider you will operate. Tauri writes the non-committed local approval; the remaining live gates still run before any order can leave the app.",
        providerLabel: "Provider",
        fields: {
          targetJurisdiction: "Target jurisdiction",
          targetJurisdictionPlaceholder: "Country/region for live trading",
          operatorIdentity: "Operator identity",
          operatorIdentityPlaceholder: "Real authorized person or entity",
          approver: "Approver / risk owner",
          approverPlaceholder: "Responsible human approver",
          maxStakeFirstOrder: "Max stake first order",
          maxMarketExposure: "Max market exposure",
        },
        checksTitle: "Required declarations",
        checksIntro:
          "Review every declaration below. The single acknowledgement checkbox confirms all of them together; Tauri still validates each declaration separately and returns exact blockers if this acknowledgement is missing.",
        checks: {
          platformEligible:
            "I have checked provider/platform eligibility for this account and location.",
          realOperator:
            "The operator is a real authorized person or entity.",
          realBeneficialOwners:
            "Beneficial owners are real and are not hidden or fictional.",
          realAccountOwner:
            "The provider account or wallet owner is real and authorized.",
          noGeoblockBypass:
            "No geoblock, platform restriction, or blocked-region control is being bypassed.",
          noVpnBypass:
            "No VPN, proxy, region spoofing, or hidden routing is being used to bypass restrictions.",
          noFakeKyc:
            "No fake identity, fake KYC, fake entity, or fake beneficial ownership is being used.",
          noSanctionsBypass:
            "No sanctions, AML, or account restriction is being bypassed.",
          noCustody:
            "Prediction Ladder does not custody user funds, seed phrases, private keys, or backend signing.",
          c0ReviewPass:
            "C0 review is clear: no criminal, sanctions, AML/KYC evasion, custody, or unauthorized-access blocker.",
          c1RiskAccepted:
            "C1 administrative/regulatory risk is approved by the responsible business owner or not required.",
          auditEnabled:
            "Redacted local audit logging remains enabled for live attempts.",
          firstLiveSmokeOnly:
            "Live orders in this session stay BUY-only, tiny stake, limit/GTC/post-only/non-marketable, with manual cancellation available.",
          noDepositsOrWithdrawals:
            "This app will not deposit, withdraw, wrap, unwrap, or bypass provider funding restrictions.",
          understandsRisk:
            "I understand credentials and platform KYC do not by themselves authorize live trading in this app.",
        },
        singleApprovalToggle:
          "I approve all required declarations above and acknowledge the live order policy for this session.",
        singleApprovalNote:
          "This is one explicit acknowledgement for the approval flow, not a shortcut: if any declaration is not true, do not approve this gate. The session acknowledgement can still be revoked by restarting or changing state.",
        acknowledgementToggle:
          "Acknowledge the live order policy for the current session.",
        acknowledgementNote:
          "This acknowledgement is separate from legal approval and can be revoked by restarting or changing state.",
        actions: {
          submit: "Approve local gate",
          cancel: "Cancel",
        },
        readyNote:
          "Legal/local approval is ready for this provider. Preflight may still block on account metrics, market, adapter, risk, kill-switch, or acknowledgement.",
        blockedNote:
          "Legal/local approval is not ready. Complete every field and declaration for the selected provider.",
      },
    },
  },
  landing: {
    surface: "static landing",
    summary:
      "Bootstrap landing shell for the Windows prediction-market ladder terminal. The final download flow will be wired only after the Tauri installer build is available or its blocker is documented.",
    statusRowAria: "Landing bootstrap status",
    trustNotesAria: "Trust notes",
    statusLabels: {
      download: "Download",
      sharedUiStatus: "Shared UI status",
      tradingSurface: "Trading surface",
    },
    trustNotes: {
      desktopDistribution: "Desktop-first product distribution surface",
      installerPending: "Installer link remains pending until Tauri packaging succeeds",
      noCustody:
        "No deposits, custody, private keys, or trading execution in landing code",
    },
  },
} satisfies AppMessages;
