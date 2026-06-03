export type UiBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "scaffold_only";
};

export function createUiBootstrapStatus(): UiBootstrapStatus {
  return {
    packageName: "@prediction-ladder/ui",
    boundary: "shared React-facing presentation primitives",
    boundaryReady: true,
    implementationStatus: "scaffold_only",
  };
}
