export type MarketDataBootstrapStatus = {
  packageName: string;
  boundary: string;
  boundaryReady: boolean;
  implementationStatus: "scaffold_only";
};

export function createMarketDataBootstrapStatus(): MarketDataBootstrapStatus {
  return {
    packageName: "@prediction-ladder/market-data",
    boundary: "provider-neutral read-only market data ports and adapters",
    boundaryReady: true,
    implementationStatus: "scaffold_only",
  };
}
