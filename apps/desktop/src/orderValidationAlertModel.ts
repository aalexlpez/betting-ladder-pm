import type { OrderRejectionReason } from "@prediction-ladder/core";

import type { DesktopTerminalState } from "./appConfig";
import type { OrderEntryState } from "./orderIntentWorkflow";
import type {
  LivePreflightProviderStatus,
  LivePreflightStatusCommandResponse,
  ProviderMetricAmount,
} from "./providerOnboardingCommands";

export type OrderValidationDiagnosticFactKey =
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

export type OrderValidationDiagnosticFact = {
  key: OrderValidationDiagnosticFactKey;
  value: string;
};

export type OrderValidationAlertState = {
  intentSequence: number;
  side: string | null;
  price: string | null;
  stake: string | null;
  reasons: readonly OrderRejectionReason[];
  diagnosticFacts: readonly OrderValidationDiagnosticFact[];
};

export function createOrderValidationAlertState(
  orderEntry: OrderEntryState,
  state: DesktopTerminalState,
  livePreflightStatus: LivePreflightStatusCommandResponse | null,
): OrderValidationAlertState | null {
  if (
    orderEntry.validation?.status !== "rejected" ||
    orderEntry.validationReasons.length === 0
  ) {
    return null;
  }

  const provider = livePreflightStatus?.providers.find(
    (candidate) => candidate.providerId === state.selectedProviderId,
  );
  const providerSurface = state.providers.find(
    (candidate) => candidate.id === state.selectedProviderId,
  );

  return {
    intentSequence: orderEntry.intentSequence,
    side: orderEntry.latestIntent?.side ?? null,
    price: orderEntry.latestIntent?.price ?? null,
    stake:
      orderEntry.latestIntent === null
        ? null
        : `${orderEntry.latestIntent.stakeAmount.amount} ${orderEntry.latestIntent.stakeAmount.currency}`,
    reasons: orderEntry.validationReasons,
    diagnosticFacts: createDiagnosticFacts({
      orderEntry,
      provider,
      providerLabel: providerSurface?.label ?? state.selectedProviderId,
      state,
    }),
  };
}

function createDiagnosticFacts(input: {
  orderEntry: OrderEntryState;
  provider: LivePreflightProviderStatus | undefined;
  providerLabel: string;
  state: DesktopTerminalState;
}): readonly OrderValidationDiagnosticFact[] {
  const accountMetrics = input.provider?.accountMetrics;
  const fallbackCurrency =
    input.orderEntry.latestIntent?.stakeAmount.currency ??
    input.state.selectedMarket?.currency ??
    "";
  const availableFunds =
    accountMetrics?.availableFunds === undefined
      ? formatFallbackAmount(input.orderEntry.availableFunds, fallbackCurrency)
      : formatMetricAmount(accountMetrics.availableFunds);
  const providerExposure =
    accountMetrics?.providerExposure === undefined
      ? null
      : formatMetricAmount(accountMetrics.providerExposure);
  const marketExposure =
    accountMetrics?.marketExposure === undefined
      ? null
      : formatMetricAmount(accountMetrics.marketExposure);
  const openOrderAmount =
    accountMetrics?.openOrderAmount === undefined
      ? null
      : formatMetricAmount(accountMetrics.openOrderAmount);
  const positionExposure =
    accountMetrics?.positionExposure === undefined
      ? null
      : formatMetricAmount(accountMetrics.positionExposure);

  return [
    createFact("provider", input.providerLabel),
    createFact("market", input.state.selectedMarket?.title ?? null),
    createFact(
      "accountMetrics",
      accountMetrics?.status ?? input.orderEntry.accountMetricsSourceStatus,
    ),
    createFact("metricsSource", accountMetrics?.source ?? null),
    createFact("availableFundsRead", availableFunds),
    createFact("openOrderAmount", openOrderAmount),
    createFact("positionExposure", positionExposure),
    createFact("providerExposure", providerExposure),
    createFact("marketExposure", marketExposure),
    createFact("checkedAt", accountMetrics?.checkedAt ?? null),
  ].filter(
    (fact): fact is OrderValidationDiagnosticFact =>
      fact !== null && fact.value.trim() !== "",
  );
}

function createFact(
  key: OrderValidationDiagnosticFactKey,
  value: string | null,
): OrderValidationDiagnosticFact | null {
  return value === null ? null : { key, value };
}

function formatMetricAmount(metric: ProviderMetricAmount): string {
  return `${metric.amount} ${metric.currency}`;
}

function formatFallbackAmount(amount: string, currency: string): string {
  if (amount === "unknown") {
    return "unknown";
  }

  return currency.trim() === "" ? amount : `${amount} ${currency}`;
}
