import { describe, expect, it } from "vitest";
import { getMessages, supportedLocales } from "@prediction-ladder/i18n";

import mainCapability from "../src-tauri/capabilities/main.json";
import appTradingCommandsPermission from "../src-tauri/permissions/app-trading-commands.toml?raw";
import tauriMainSource from "../src-tauri/src/main.rs?raw";
import tauriConfig from "../src-tauri/tauri.conf.json";
import appSource from "./App.tsx?raw";
import liveExecutionCommandsSource from "./liveExecutionCommands.ts?raw";
import providerOnboardingCommandsSource from "./providerOnboardingCommands.ts?raw";

const tauriProductionSource = tauriMainSource.split("#[cfg(test)]")[0] ?? tauriMainSource;
const rendererCommandSource = [
  appSource,
  liveExecutionCommandsSource,
  providerOnboardingCommandsSource,
].join("\n");

describe("Tauri desktop shell security posture", () => {
  it("keeps the main trading window aligned with the desktop terminal spec", () => {
    expect(tauriConfig.app.windows).toHaveLength(1);

    const mainWindow = tauriConfig.app.windows[0];

    expect(mainWindow).toBeDefined();
    expect(mainWindow?.label).toBe("main");
    expect(mainWindow?.minWidth).toBeGreaterThanOrEqual(1280);
    expect(mainWindow?.minHeight).toBeGreaterThanOrEqual(720);
  });

  it("keeps renderer privileges and remote connections explicitly constrained", () => {
    const csp = tauriConfig.app.security.csp;

    expect(tauriConfig.app.withGlobalTauri).toBe(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/\bhttps?:\/\//u);
    expect(csp).not.toMatch(/\bwss?:\/\//u);
  });

  it("keeps capabilities scoped to the main window without fs, shell, or dialog grants", () => {
    const permissions = mainCapability.permissions;
    const forbiddenPermissionFragments = [
      "dialog",
      "fs",
      "http",
      "opener",
      "process",
      "shell",
      "upload",
      "websocket",
      "window:create",
    ];

    expect(mainCapability.windows).toEqual(["main"]);
    expect(permissions).toEqual(["core:default", "app-trading-commands"]);
    expect(mainCapability.description.toLowerCase()).toContain("no filesystem");
    expect(mainCapability.description.toLowerCase()).toContain("shell");

    for (const fragment of forbiddenPermissionFragments) {
      expect(permissions.some((permission) => permission.includes(fragment))).toBe(
        false,
      );
    }
  });

  it("allows only the app-owned Tauri command boundary from the main window", () => {
    const requiredCommands = [
      "app_get_status",
      "market_search",
      "market_get_order_book",
      "market_subscribe",
      "live_gate_status",
      "legal_approval_status",
      "legal_approval_submit",
      "provider_onboarding_status",
      "provider_connect_account",
      "provider_open_credential_reference",
      "provider_import_polymarket_signer_from_clipboard",
      "provider_apply_polymarket_account_candidate",
      "live_preflight_status",
      "order_submit_live",
      "order_cancel",
    ];

    expect(appTradingCommandsPermission).toContain(
      'identifier = "app-trading-commands"',
    );
    for (const command of requiredCommands) {
      expect(appTradingCommandsPermission).toContain(`"${command}"`);
    }
    expect(appTradingCommandsPermission).not.toMatch(
      /fs:|shell:|dialog:|http:|opener:|process:|websocket:/u,
    );
  });

  it("registers market-data commands without exposing provider secrets to React", () => {
    expect(tauriMainSource).toContain("market_search");
    expect(tauriMainSource).toContain("market_get_order_book");
    expect(tauriMainSource).toContain("market_subscribe");
    expect(tauriMainSource).toContain("provider_open_credential_reference");
    expect(tauriMainSource).toContain(
      "provider_import_polymarket_signer_from_clipboard",
    );
    expect(tauriMainSource).toContain("legal_approval_status");
    expect(tauriMainSource).toContain("legal_approval_submit");
    expect(tauriMainSource).toContain("build_local_approval_from_submit");
    expect(tauriMainSource).toContain("POLYMARKET_MAGIC_EXPORT_URL");
    expect(tauriMainSource).toContain("allowed_credential_reference_url");
    expect(tauriMainSource).toContain("credentials-required");
    expect(tauriMainSource).toContain("secret_free: true");
    expect(tauriMainSource).toContain("Polymarket official Rust SDK returned");
    expect(tauriMainSource).toContain("KALSHI_BASE_URLS");
    expect(tauriMainSource).toContain("PROVIDER_REQUEST_TIMEOUT");
    expect(tauriMainSource).toContain("UpdateBalanceAllowanceRequest");
    expect(tauriMainSource).toContain("refresh_polymarket_collateral_balance_allowance");
    expect(tauriMainSource).toContain("load_polymarket_collateral_balance_allowance");
    expect(tauriProductionSource).toContain("RsaPrivateKey");
    expect(rendererCommandSource).not.toMatch(/private[_-]?key\s*[:=]/i);
    expect(rendererCommandSource).not.toMatch(/api[_-]?secret/i);
    expect(rendererCommandSource).not.toMatch(/passphrase\s*[:=]/i);
    expect(rendererCommandSource).not.toMatch(/auth[_-]?header/i);
    expect(rendererCommandSource).not.toMatch(/signed[_-]?payload/i);
    expect(rendererCommandSource).not.toContain("KALSHI-ACCESS");
  });

  it("renders provider onboarding as a guided modal instead of fixed rail credential forms", () => {
    expect(appSource).toContain("credential-wizard");
    expect(appSource).toContain("legal-approval-wizard");
    expect(appSource).toContain('role="dialog"');
    expect(appSource).toContain("providerOnboarding");
    expect(appSource).toContain("legalApproval");
    expect(appSource).toContain("ProviderOnboardingMessages");
    expect(appSource).toContain("LegalApprovalMessages");
    expect(appSource).toContain("onOpenPolymarketMagicExport");
    expect(appSource).toContain("importPolymarketSignerFromClipboard");
    expect(appSource).toContain("legalApprovalSubmit");
    expect(appSource).toContain("LEGAL_APPROVAL_CHECK_KEYS");
    expect(appSource).toContain("createLegalApprovalChecks(approvalAcknowledged)");
    expect(appSource).toContain("legal-master-approval-row");
    expect(appSource).toContain("isProviderCredentialReady");
    expect(appSource).toContain("handleOpenLegalApprovalWizard(request.providerId)");
    expect(appSource).toContain("onFirstLiveAckChange");
    expect(appSource).toContain('setCredentialWizardStep("review")');
    expect(appSource).toContain("shouldFinishPolymarketClipboardImport");
    expect(appSource).toContain("shouldAdvanceReadyPolymarketProfile");
    expect(appSource).toContain("resolveActiveLegalApprovalProviderId");
    expect(appSource).toContain("selectLegalApprovalStatusForProvider");
    expect(appSource).toContain("legalApprovalProviderId");
    expect(appSource).toContain('props.onOpenLegalApprovalWizard("polymarket")');
    expect(appSource).toContain('props.polymarketSignerFilePath.trim() === ""');
    expect(appSource).not.toContain("providerId={props.state.selectedProviderId}");
    expect(appSource).toContain("onSubmitLiveOrder");
    expect(appSource).toContain("onCancelLiveOrder");
    expect(appSource).toContain("createLiveProviderOrderRecord");
    expect(appSource).toContain("orderSubmitLive");
    expect(appSource).toContain("orderCancel");
    expect(appSource).not.toContain("Provider account setup");
    expect(appSource).not.toContain("Recommended app-managed import");
    expect(appSource).not.toContain("One-time signer import source path");
    expect(appSource).not.toContain("One-time .key import source path");
    expect(appSource).not.toContain('<form className="provider-onboarding-card"');
    expect(appSource).not.toMatch(/PolymarketClobClient|LocalSigner|RsaPrivateKey|PRIVATE KEY|authHeader|signedPayload|apiSecret/u);

    for (const locale of supportedLocales) {
      const onboarding = getMessages(locale).desktop.terminal.providerOnboarding;

      expect(onboarding.steps.reference).toBeTruthy();
      expect(onboarding.guides.polymarket[0]?.url).toBe(
        "https://docs.polymarket.com/api-reference/authentication",
      );
      expect(onboarding.guides.kalshi[0]?.url).toBe(
        "https://docs.kalshi.com/getting_started/api_keys",
      );
      expect(onboarding.polymarket.signerSourceLabel).toBeTruthy();
      expect(onboarding.kalshi.keySourceLabel).toBeTruthy();
      expect(onboarding.polymarket.magicExportButton).toContain("Magic");
      expect(onboarding.polymarket.steps.join(" ")).toContain(
        "https://reveal.magic.link/polymarket",
      );
      expect(onboarding.polymarket.steps.join(" ")).toContain("clipboard");
      expect(onboarding.polymarket.steps.join(" ")).toContain("pUSD");
      expect(onboarding.polymarket.steps.join(" ")).toContain(
        "https://polymarket.com/settings",
      );
      expect(onboarding.polymarket.description).toMatch(/API|Perfil|Profile/u);
      expect(
        onboarding.review.reasonMessages.polymarket_trading_address_signer_mismatch,
      ).toMatch(/Magic|Proxy/u);
      expect(onboarding.kalshi.steps.join(" ")).toContain("Create New API Key");
      expect(onboarding.kalshi.steps.join(" ")).toContain("kalshi_key_file_invalid");
      const legalApproval = getMessages(locale).desktop.terminal.legalApproval;

      expect(legalApproval.openAction).toBeTruthy();
      expect(legalApproval.singleApprovalToggle).toBeTruthy();
      expect(legalApproval.checksIntro).toBeTruthy();
      expect(legalApproval.checks.noGeoblockBypass).toBeTruthy();
      expect(legalApproval.checks.noVpnBypass).toBeTruthy();
      expect(legalApproval.checks.noFakeKyc).toBeTruthy();
      expect(legalApproval.checks.firstLiveSmokeOnly).toBeTruthy();
    }
  });

  it("registers only narrow live order commands with Tauri-side gate checks", () => {
    expect(tauriMainSource).toContain("live_gate_status");
    expect(tauriMainSource).toContain("order_submit_live");
    expect(tauriMainSource).toContain("order_cancel");
    expect(tauriMainSource).toContain("LiveProviderRuntime");
    expect(tauriMainSource).toContain("PolymarketLiveProviderRuntime");
    expect(tauriMainSource).toContain("POLYMARKET_LIVE_RUNTIME_MODE");
    expect(tauriMainSource).toContain("ACCOUNT_METRICS_SOURCE");
    expect(tauriMainSource).toContain("LOCAL_ACCOUNT_METRICS_FILE");
    expect(tauriMainSource).toContain("account_metrics_source_missing");
    expect(tauriMainSource).toContain("account_metrics_values_source_missing");
    expect(tauriMainSource).toContain("place_limit_order");
    expect(tauriMainSource).toContain("post_only(true)");
    expect(tauriMainSource).toContain("provider_live_adapter_not_configured");
    expect(tauriMainSource).toContain("evaluate_live_gate_status");
    expect(tauriMainSource).toContain("load_local_approval_gate");
    expect(tauriMainSource).toContain(".local/legal-gate.local.json");
    expect(tauriMainSource).toContain("credential_source_ready");
    expect(tauriMainSource).toContain("explicit_live_ack");
    expect(tauriMainSource).toContain("marketable_order_blocked");
    expect(tauriMainSource).toContain("estimated_order_cost_exceeds_stake_amount");
    expect(tauriMainSource).toContain("stake_exceeds_local_approval");
    expect(tauriMainSource).toContain("exposure_exceeds_local_approval");
    expect(tauriMainSource).toContain("kill_switch_active");
    expect(tauriMainSource).toContain("secret_free: true");
    expect(tauriMainSource).not.toMatch(/\bplace_order\b/i);
    expect(tauriMainSource).not.toMatch(/\bsubmit_order\b/i);
  });
});
