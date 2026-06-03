import { describe, expect, it } from "vitest";

import { desktopBootstrapConfig, getDesktopBootChecks } from "./appConfig";

describe("desktop bootstrap config", () => {
  it("starts with live trading and one-click disabled", () => {
    expect(desktopBootstrapConfig.executionMode).toBe("disabled");
    expect(desktopBootstrapConfig.liveTradingEnabled).toBe(false);
    expect(desktopBootstrapConfig.oneClickArmed).toBe(false);
  });

  it("states the renderer safety checks", () => {
    expect(getDesktopBootChecks()).toContain(
      "Renderer has no filesystem, shell, provider SDK, or secret access",
    );
  });
});
