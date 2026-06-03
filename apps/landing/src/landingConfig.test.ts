import { describe, expect, it } from "vitest";

import { getLandingTrustNotes, landingBootstrapConfig } from "./landingConfig";

describe("landing bootstrap config", () => {
  it("keeps the landing app outside the trading surface", () => {
    expect(landingBootstrapConfig.tradingSurface).toBe(false);
  });

  it("makes installer availability explicit", () => {
    expect(getLandingTrustNotes()).toContain("Installer link remains pending until Tauri packaging succeeds");
  });
});
