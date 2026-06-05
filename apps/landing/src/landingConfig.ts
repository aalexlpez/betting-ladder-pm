import { createUiBootstrapStatus } from "@prediction-ladder/ui";

export type LandingDownloadStateKey = "installer_pending_bootstrap";
export type LandingTrustNoteKey = "desktopDistribution" | "noCustody" | "installerPending";

export const landingBootstrapConfig = {
  tradingSurface: false,
  downloadState: "installer_pending_bootstrap" satisfies LandingDownloadStateKey,
  ui: createUiBootstrapStatus(),
} as const;

export function getLandingTrustNoteKeys(): LandingTrustNoteKey[] {
  return [
    "desktopDistribution",
    "noCustody",
    "installerPending",
  ];
}
