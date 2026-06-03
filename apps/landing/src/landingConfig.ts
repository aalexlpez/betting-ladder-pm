import { createUiBootstrapStatus } from "@prediction-ladder/ui";

export const landingBootstrapConfig = {
  productName: "Prediction Ladder",
  surface: "static landing",
  tradingSurface: false,
  downloadState: "installer pending bootstrap",
  ui: createUiBootstrapStatus(),
} as const;

export function getLandingTrustNotes(): string[] {
  return [
    "Desktop-first product distribution surface",
    "No deposits, custody, private keys, or trading execution in landing code",
    "Installer link remains pending until Tauri packaging succeeds",
  ];
}
