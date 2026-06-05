import { describe, expect, it } from "vitest";

import providerOnboardingCommandsSource from "./providerOnboardingCommands?raw";
import {
  createLivePreflightUnavailableResponse,
  createProviderOnboardingUnavailableResponse,
  hasPositiveProviderMetricAmount,
  selectPolymarketAutoApplyCandidate,
  tauriProviderOnboardingCommandClient,
  type LivePreflightStatusCommandRequest,
  type ProviderAccountCandidateStatus,
  type ProviderOnboardingStatusCommandResponse,
} from "./providerOnboardingCommands";

describe("provider onboarding command client", () => {
  const preflightRequest: LivePreflightStatusCommandRequest = {
    providerId: "polymarket",
    marketId: "pm-election-2026",
    outcomeId: "pm-token-yes",
    selectedMarket: true,
    orderBookFreshness: "fresh",
    explicitLiveAck: false,
    auditLogEnabled: true,
    killSwitchActive: false,
    stakeAmount: "5",
    maxStakePerOrder: "5",
    maxMarketExposure: "25",
    nonMarketable: true,
  };

  it("returns secret-free unavailable onboarding status outside Tauri", async () => {
    const response = await tauriProviderOnboardingCommandClient.status();
    const serialized = JSON.stringify(response);

    expect(response.command).toBe("provider_onboarding_status");
    expect(response.secretFree).toBe(true);
    expect(response.providers.map((provider) => provider.providerId)).toEqual([
      "polymarket",
      "kalshi",
    ]);
    expect(serialized).not.toMatch(
      /apiSecret|authHeader|signedPayload|signature|seedPhrase|walletAddress|PRIVATE KEY/u,
    );
  });

  it("returns secret-free unavailable preflight status outside Tauri", async () => {
    const response =
      await tauriProviderOnboardingCommandClient.preflightStatus(preflightRequest);
    const serialized = JSON.stringify(response);

    expect(response.command).toBe("live_preflight_status");
    expect(response.secretFree).toBe(true);
    expect(response.ready).toBe(false);
    expect(response.providers).toHaveLength(2);
    expect(serialized).toContain("tauri_command_bridge_unavailable");
    expect(serialized).not.toMatch(
      /apiSecret|authHeader|signedPayload|signature|seedPhrase|walletAddress|PRIVATE KEY/u,
    );
  });

  it("keeps credential reference opening behind the Tauri command bridge", async () => {
    const response =
      await tauriProviderOnboardingCommandClient.openCredentialReference({
        providerId: "polymarket",
        referenceId: "polymarket_magic_export",
      });

    expect(response.command).toBe("provider_open_credential_reference");
    expect(response.status).toBe("unavailable");
    expect(response.secretFree).toBe(true);
    expect(JSON.stringify(response)).not.toContain("reveal.magic.link");
  });

  it("keeps renderer onboarding plumbing free of live submit and cancel commands", () => {
    expect(Object.keys(tauriProviderOnboardingCommandClient)).toEqual([
      "status",
      "connect",
      "openCredentialReference",
      "importPolymarketSignerFromClipboard",
      "applyPolymarketAccountCandidate",
      "preflightStatus",
    ]);
    expect(providerOnboardingCommandsSource).toContain("provider_connect_account");
    expect(providerOnboardingCommandsSource).toContain(
      "provider_open_credential_reference",
    );
    expect(providerOnboardingCommandsSource).toContain(
      "provider_import_polymarket_signer_from_clipboard",
    );
    expect(providerOnboardingCommandsSource).toContain(
      "provider_apply_polymarket_account_candidate",
    );
    expect(providerOnboardingCommandsSource).toContain("live_preflight_status");
    expect(providerOnboardingCommandsSource).not.toContain("order_submit_live");
    expect(providerOnboardingCommandsSource).not.toContain("order_cancel");
    expect(providerOnboardingCommandsSource).not.toMatch(
      /apiSecret|authHeader|signedPayload|seedPhrase|walletAddress|polymarketSignerSecret/u,
    );
  });

  it("constructs deterministic fallback states without provider code", () => {
    expect(createProviderOnboardingUnavailableResponse().providers).toHaveLength(2);
    expect(createLivePreflightUnavailableResponse()).toMatchObject({
      command: "live_preflight_status",
      status: "unavailable",
      ready: false,
      secretFree: true,
    });
  });

  it("auto-selects a recommended Polymarket candidate only when trade-ready cash is positive", () => {
    const response = createOnboardingResponseWithPolymarketCandidates([
      {
        label: "configured_funder",
        signatureType: "proxy",
        configured: true,
        maskedIdentifier: "0xd8...76C6",
        tradeReadyCash: { amount: "0", currency: "pUSD" },
      },
      {
        label: "magic_export_deposit_wallet",
        signatureType: "poly_1271",
        configured: false,
        maskedIdentifier: "0x00fb...2e49",
        recommended: true,
        tradeReadyCash: { amount: "5.00", currency: "pUSD" },
      },
    ]);

    expect(selectPolymarketAutoApplyCandidate(response)).toEqual({
      label: "magic_export_deposit_wallet",
      signatureType: "poly_1271",
    });
  });

  it("does not auto-apply public-only, configured, invalid, or ambiguous candidates", () => {
    expect(
      selectPolymarketAutoApplyCandidate(
        createOnboardingResponseWithPolymarketCandidates([
          {
            label: "sdk_proxy",
            signatureType: "proxy",
            configured: false,
            maskedIdentifier: "0xd8...76C6",
            recommended: true,
            publicPortfolioValue: { amount: "50", currency: "pUSD" },
          },
        ]),
      ),
    ).toBeNull();

    expect(
      selectPolymarketAutoApplyCandidate(
        createOnboardingResponseWithPolymarketCandidates([
          {
            label: "configured_funder",
            signatureType: "poly_1271",
            configured: true,
            maskedIdentifier: "0x00fb...2e49",
            recommended: true,
            tradeReadyCash: { amount: "5", currency: "pUSD" },
          },
        ]),
      ),
    ).toBeNull();

    expect(
      selectPolymarketAutoApplyCandidate(
        createOnboardingResponseWithPolymarketCandidates([
          {
            label: "candidate_a",
            signatureType: "poly_1271",
            configured: false,
            maskedIdentifier: "0x00fb...2e49",
            recommended: true,
            tradeReadyCash: { amount: "5", currency: "pUSD" },
          },
          {
            label: "candidate_b",
            signatureType: "proxy",
            configured: false,
            maskedIdentifier: "0xd8...76C6",
            recommended: true,
            tradeReadyCash: { amount: "6", currency: "pUSD" },
          },
        ]),
      ),
    ).toBeNull();
  });

  it("checks positive provider metric amounts without lossy number parsing", () => {
    expect(hasPositiveProviderMetricAmount({ amount: "0.000", currency: "pUSD" }))
      .toBe(false);
    expect(hasPositiveProviderMetricAmount({ amount: "0005.00", currency: "pUSD" }))
      .toBe(true);
    expect(hasPositiveProviderMetricAmount({ amount: "1e-9", currency: "pUSD" }))
      .toBe(false);
  });
});

function createOnboardingResponseWithPolymarketCandidates(
  candidates: readonly TestPolymarketAccountCandidate[],
): ProviderOnboardingStatusCommandResponse {
  const response = createProviderOnboardingUnavailableResponse();

  return {
    ...response,
    providers: response.providers.map((provider) =>
      provider.providerId === "polymarket"
        ? {
            ...provider,
            credential: {
              ...provider.credential,
              status: "ready",
              maskedIdentifier: "proxy:0xd8...76C6",
            },
            accountMetrics: {
              ...provider.accountMetrics,
              accountCandidates: candidates.map((candidate) => ({
                status: "ready",
                reasons: [],
                ...candidate,
              })),
            },
          }
        : provider,
    ),
  };
}

type TestPolymarketAccountCandidate = Pick<
  ProviderAccountCandidateStatus,
  "configured" | "label" | "maskedIdentifier" | "signatureType"
> &
  Partial<ProviderAccountCandidateStatus>;
