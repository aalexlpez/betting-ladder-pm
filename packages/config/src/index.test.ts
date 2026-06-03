import { describe, expect, it } from "vitest";

import { createConfigBootstrapStatus } from "./index";

describe("config bootstrap status", () => {
  it("exposes the shared tooling package boundary", () => {
    expect(createConfigBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/config",
      boundary: "shared build and tooling configuration",
      boundaryReady: true,
      implementationStatus: "tooling_ready",
    });
  });
});
