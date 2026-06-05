import { describe, expect, it } from "vitest";

import {
  getLandingCopyForReview,
  landingMessages,
  resolveLandingLocale,
  supportedLandingLocales,
} from "./landingContent";

describe("landing content", () => {
  it("uses product-ready access CTAs without unsupported direct-download claims", () => {
    for (const locale of supportedLandingLocales) {
      const copy = getLandingCopyForReview(locale);

      expect(landingMessages[locale].hero.primaryCta).not.toMatch(/^Download/i);
      expect(landingMessages[locale].pilot.primaryCta).not.toMatch(/^Download/i);
      expect(copy).not.toMatch(/Download Windows Beta/i);
    }
  });

  it("ships English, Spanish, and Catalan content", () => {
    expect(supportedLandingLocales).toEqual(["en", "es", "ca"]);
    expect(landingMessages.en.languageLabel).toBe("Language");
    expect(landingMessages.es.languageLabel).toBe("Idioma");
    expect(landingMessages.ca.languageLabel).toBe("Idioma");
  });

  it("resolves regional browser locales to supported landing locales", () => {
    expect(resolveLandingLocale("en-US")).toBe("en");
    expect(resolveLandingLocale("es-ES")).toBe("es");
    expect(resolveLandingLocale("ca-ES")).toBe("ca");
    expect(resolveLandingLocale("fr-FR")).toBeNull();
  });

  it("keeps live trading, custody, and credential claims constrained", () => {
    const copy = getLandingCopyForReview("en");

    expect(copy).toContain("Live execution remains gated");
    expect(copy).toContain("no-custody architecture");
    expect(copy).toContain(
      "No deposits, private keys, seed phrases, or API credentials are collected here.",
    );
  });

  it("positions the page as a specialized Windows ladder terminal", () => {
    const copy = getLandingCopyForReview("en");

    expect(copy).toContain("Windows execution terminal");
    expect(copy).toContain("order-book");
    expect(copy).toContain("provider-aware");
    expect(copy).toContain("Guarded one-click");
  });

  it("does not use prohibited marketing claims", () => {
    for (const locale of supportedLandingLocales) {
      expect(getLandingCopyForReview(locale)).not.toMatch(
        /guaranteed profits|fastest|first-to-market|legal everywhere|risk-free|fake testimonial|regulatory approval/i,
      );
    }
  });

  it("does not describe the product as a landing, beta, pilot, MVP, or development artifact", () => {
    const metaOrInProgressTerms =
      /\blanding\b|\bbeta\b|\bpilot\b|\bMVP\b|packaging|launch-readiness|in development|en desarrollo|en construcción|está construyendo|està construint/i;

    for (const locale of supportedLandingLocales) {
      expect(getLandingCopyForReview(locale)).not.toMatch(metaOrInProgressTerms);
    }
  });
});
