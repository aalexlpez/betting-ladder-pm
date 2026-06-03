export type ConfigBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "tooling_ready";
};

export function createConfigBootstrapStatus(): ConfigBootstrapStatus {
  return {
    packageName: "@prediction-ladder/config",
    boundary: "shared build and tooling configuration",
    boundaryReady: true,
    implementationStatus: "tooling_ready",
  };
}
