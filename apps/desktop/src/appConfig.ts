import { createCoreBootstrapStatus } from "@prediction-ladder/core";

export const desktopBootstrapConfig = {
  productName: "Prediction Ladder",
  executionMode: "disabled",
  oneClickArmed: false,
  liveTradingEnabled: false,
  core: createCoreBootstrapStatus(),
} as const;

export function getDesktopBootChecks(): string[] {
  return [
    "Live execution disabled by default",
    "One-click trading off by default",
    "Renderer has no filesystem, shell, provider SDK, or secret access",
    "Provider integrations intentionally deferred until market-data goal",
  ];
}
