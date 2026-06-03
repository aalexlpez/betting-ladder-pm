import { describe, expect, it } from "vitest";

import { createMarketDataBootstrapStatus } from "./index";

describe("market-data bootstrap status", () => {
  it("keeps provider integration scoped outside the core package", () => {
    expect(createMarketDataBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/market-data",
      boundary: "provider-neutral read-only market data ports and adapters",
      boundaryReady: true,
      implementationStatus: "scaffold_only",
    });
  });
});
