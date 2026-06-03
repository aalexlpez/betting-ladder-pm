export type ExecutionBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "scaffold_only";
};

export function createExecutionBootstrapStatus(): ExecutionBootstrapStatus {
  return {
    packageName: "@prediction-ladder/execution",
    boundary: "paper, live-dry-run, and gated live execution ports",
    boundaryReady: true,
    implementationStatus: "scaffold_only",
  };
}
