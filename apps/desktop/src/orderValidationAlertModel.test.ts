import type { OrderIntent } from "@prediction-ladder/core";
import { describe, expect, it } from "vitest";

import { createDesktopTerminalState } from "./appConfig";
import {
  createOrderValidationAlertState,
  type OrderValidationDiagnosticFact,
} from "./orderValidationAlertModel";
import { createInitialOrderEntryState } from "./orderIntentWorkflow";
import type { LivePreflightStatusCommandResponse } from "./providerOnboardingCommands";

describe("order validation alert model", () => {
  it("shows the exact authenticated funds value used by the ladder risk guard", () => {
    const preflight = createPreflightStatus({
      availableFunds: "0",
      providerExposure: "4",
      marketExposure: "1",
      openOrderAmount: "2",
      positionExposure: "2",
    });
    const orderEntry = {
      ...createInitialOrderEntryState(),
      accountMetricsSourceStatus: "ready" as const,
      availableFunds: "0",
      intentSequence: 7,
      latestIntent: createIntent(),
      validation: {
        status: "rejected" as const,
        reasons: ["insufficient_available_funds" as const],
      },
      validationReasons: ["insufficient_available_funds" as const],
    };
    const state = createDesktopTerminalState({
      livePreflightStatus: preflight,
      orderEntry,
    });

    const alert = createOrderValidationAlertState(orderEntry, state, preflight);

    expect(alert?.stake).toBe("1 USDC");
    expect(factValue(alert?.diagnosticFacts, "availableFundsRead")).toBe("0 USDC");
    expect(factValue(alert?.diagnosticFacts, "accountMetrics")).toBe("ready");
    expect(factValue(alert?.diagnosticFacts, "metricsSource")).toBe(
      "provider_owned_account_metrics",
    );
    expect(factValue(alert?.diagnosticFacts, "openOrderAmount")).toBe("2 USDC");
    expect(factValue(alert?.diagnosticFacts, "positionExposure")).toBe("2 USDC");
    expect(factValue(alert?.diagnosticFacts, "providerExposure")).toBe("4 USDC");
    expect(factValue(alert?.diagnosticFacts, "marketExposure")).toBe("1 USDC");
  });

  it("does not open an alert when validation is approved", () => {
    const orderEntry = {
      ...createInitialOrderEntryState(),
      validation: { status: "approved" as const },
      validationReasons: [],
    };

    expect(
      createOrderValidationAlertState(
        orderEntry,
        createDesktopTerminalState({ orderEntry }),
        null,
      ),
    ).toBeNull();
  });
});

function factValue(
  facts: readonly OrderValidationDiagnosticFact[] | undefined,
  key: OrderValidationDiagnosticFact["key"],
): string | undefined {
  return facts?.find((fact) => fact.key === key)?.value;
}

function createIntent(): OrderIntent {
  return {
    id: "intent-7",
    providerId: "polymarket",
    marketRef: {
      providerId: "polymarket",
      marketId: "pm-market-1",
      outcomeId: "yes",
      currency: "USDC",
    },
    side: "BUY",
    type: "limit",
    timeInForce: "GTC",
    price: "0.49",
    stakeAmount: { amount: "1", currency: "USDC" },
    quantity: "2.040816326530612244",
    marketable: false,
    createdAt: "2026-06-05T10:00:00.000Z",
  };
}

function createPreflightStatus(input: {
  availableFunds: string;
  providerExposure: string;
  marketExposure: string;
  openOrderAmount: string;
  positionExposure: string;
}): LivePreflightStatusCommandResponse {
  return {
    command: "live_preflight_status",
    status: "blocked",
    message: "Live preflight is blocked; account metrics are loaded for display.",
    secretFree: true,
    ready: false,
    providers: [
      {
        providerId: "polymarket",
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
          checkedAt: "2026-06-05T10:00:00.000Z",
        },
        accountMetrics: {
          status: "ready",
          source: "provider_owned_account_metrics",
          message: "Authenticated account metrics loaded.",
          reasons: [],
          checkedAt: "2026-06-05T10:00:00.000Z",
          availableFunds: { amount: input.availableFunds, currency: "USDC" },
          providerExposure: { amount: input.providerExposure, currency: "USDC" },
          marketExposure: { amount: input.marketExposure, currency: "USDC" },
          openOrderAmount: { amount: input.openOrderAmount, currency: "USDC" },
          positionExposure: { amount: input.positionExposure, currency: "USDC" },
        },
        gates: [],
      },
    ],
  };
}
