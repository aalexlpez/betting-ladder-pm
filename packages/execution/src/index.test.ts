import { describe, expect, it } from "vitest";

import { createExecutionBootstrapStatus } from "./index";

describe("execution bootstrap status", () => {
  it("states that live execution belongs behind execution ports", () => {
    expect(createExecutionBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/execution",
      boundary: "paper, live-dry-run, and gated live execution ports",
      boundaryReady: true,
      implementationStatus: "scaffold_only",
    });
  });
});
