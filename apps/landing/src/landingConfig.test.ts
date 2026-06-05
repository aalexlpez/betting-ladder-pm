import { describe, expect, it } from "vitest";

import { getLandingTrustNoteKeys, landingBootstrapConfig } from "./landingConfig";

describe("landing bootstrap config", () => {
  it("keeps the landing app outside the trading surface", () => {
    expect(landingBootstrapConfig.tradingSurface).toBe(false);
  });

  it("makes installer availability explicit", () => {
    expect(landingBootstrapConfig.downloadState).toBe("installer_pending_bootstrap");
    expect(getLandingTrustNoteKeys()).toContain("installerPending");
  });
});
