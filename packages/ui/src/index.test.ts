import { describe, expect, it } from "vitest";

import { createUiBootstrapStatus } from "./index";

describe("ui bootstrap status", () => {
  it("documents the UI package boundary", () => {
    expect(createUiBootstrapStatus()).toEqual({
      packageName: "@prediction-ladder/ui",
      boundary: "shared React-facing presentation primitives",
      boundaryReady: true,
      implementationStatus: "scaffold_only",
    });
  });
});
