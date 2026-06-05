import { describe, expect, it } from "vitest";

import {
  fallbackLocale,
  getRuntimePreferredLanguages,
  getMessages,
  getStoredLocale,
  localeStorageKey,
  persistBrowserLocale,
  applyDocumentLocale,
  resolveBrowserLocale,
  resolveInitialLocale,
  resolveLocale,
  supportedLocales,
  type LocaleBrowserRuntime,
} from "./index";

describe("i18n locale support", () => {
  it("supports the exact MVP locales", () => {
    expect(supportedLocales).toEqual(["en", "es", "ca"]);
    expect(fallbackLocale).toBe("en");
  });

  it("falls back unknown locales to English", () => {
    expect(resolveLocale(["fr-FR", "de-DE"])).toBe("en");
    expect(getMessages("fr").common.productName).toBe(getMessages("en").common.productName);
  });

  it("labels the contracts-ready package status", () => {
    for (const locale of supportedLocales) {
      expect(getMessages(locale).common.statusLabels.implementationStatuses.contracts_ready).toBeTruthy();
      expect(getMessages(locale).common.statusLabels.implementationStatuses.official_runtime_streaming_ready).toBeTruthy();
      expect(getMessages(locale).common.statusLabels.implementationStatuses.read_only_adapters_ready).toBeTruthy();
    }
  });

  it("resolves locale variants to supported base locales", () => {
    expect(resolveLocale(["es-ES"])).toBe("es");
    expect(resolveLocale(["ca-ES"])).toBe("ca");
    expect(resolveLocale(["en-US"])).toBe("en");
    expect(resolveLocale("es_MX")).toBe("es");
  });

  it("prefers a stored locale over runtime language detection", () => {
    expect(resolveInitialLocale({ preferredLanguages: ["en-US"], storedLocale: "ca" })).toBe("ca");
  });

  it("resolves browser locale from stored preference before navigator languages", () => {
    const runtime = createRuntime({
      language: "en-US",
      languages: ["es-ES", "en-US"],
      storedLocale: "ca",
    });

    expect(resolveBrowserLocale(runtime)).toBe("ca");
  });

  it("uses navigator language fallback when languages is empty", () => {
    const runtime = createRuntime({
      language: "es-MX",
      languages: [],
      storedLocale: null,
    });

    expect(getRuntimePreferredLanguages(runtime)).toEqual(["es-MX"]);
    expect(resolveBrowserLocale(runtime)).toBe("es");
  });

  it("safely reads and writes browser locale preference", () => {
    const runtime = createRuntime({
      language: "en-US",
      languages: ["en-US"],
      storedLocale: null,
    });

    expect(getStoredLocale(runtime)).toBeNull();

    persistBrowserLocale("es", runtime);

    expect(getStoredLocale(runtime)).toBe("es");
  });

  it("applies the document language when a document element exists", () => {
    const runtime = createRuntime({
      language: "en-US",
      languages: ["en-US"],
      storedLocale: null,
    });

    applyDocumentLocale("ca", runtime);

    expect(runtime.documentElement?.lang).toBe("ca");
  });

  it("keeps the message tree aligned across all catalogs", () => {
    const referenceShape = collectShape(getMessages("en"));

    for (const locale of supportedLocales) {
      expect(collectShape(getMessages(locale))).toEqual(referenceShape);
    }
  });

  it("does not describe implemented ladder intent clicks as pending Goal 05 work", () => {
    for (const locale of supportedLocales) {
      const placeholders = getMessages(locale).desktop.terminal.placeholders;
      const labels = getMessages(locale).desktop.terminal.labels;

      expect(placeholders.keyboardShortcutsPending).not.toMatch(/Goal 05/u);
      expect(placeholders.ladderClickBlocked).not.toMatch(/Goal 05/u);
      expect(placeholders.keyboardShortcutsPending).toMatch(/Back\/Lay/u);
      expect(placeholders.ladderClickBlocked).toMatch(/Back\/Lay/u);
      expect(labels.manualStake).toBeTruthy();
      expect(placeholders.manualStake).toBeTruthy();
    }
  });

  it("localizes provider onboarding wizard copy for every desktop locale", () => {
    for (const locale of supportedLocales) {
      const onboarding = getMessages(locale).desktop.terminal.providerOnboarding;

      expect(onboarding.setupEyebrow).toBeTruthy();
      expect(onboarding.steps.guide).toBeTruthy();
      expect(onboarding.steps.reference).toBeTruthy();
      expect(onboarding.actions.connect).toBeTruthy();
      expect(onboarding.actions.finalApproval).toBeTruthy();
      expect(onboarding.guides.polymarket).toHaveLength(3);
      expect(onboarding.guides.kalshi).toHaveLength(2);
      expect(onboarding.polymarket.description).toBeTruthy();
      expect(onboarding.kalshi.description).toBeTruthy();
      expect(onboarding.polymarket.steps).toHaveLength(7);
      expect(onboarding.kalshi.steps).toHaveLength(8);
      expect(onboarding.guides.polymarket[2]?.url).toBe(
        "https://docs.polymarket.com/concepts/pusd",
      );
      expect(onboarding.polymarket.magicExportButton).toContain("Magic");
      expect(onboarding.polymarket.clipboardImportButton).toBeTruthy();
      expect(onboarding.polymarket.steps.join(" ")).toContain(
        "https://reveal.magic.link/polymarket",
      );
      expect(onboarding.polymarket.steps.join(" ")).toContain("clipboard");
      expect(onboarding.polymarket.steps.join(" ")).toContain("pUSD");
      expect(onboarding.polymarket.steps.join(" ")).toContain(
        "https://polymarket.com/settings",
      );
      expect(onboarding.polymarket.description).toMatch(/API|Perfil|Profile/u);
      expect(onboarding.polymarket.tradingAddressNote).toMatch(/API|Perfil|Profile/u);
      expect(
        onboarding.review.reasonMessages.polymarket_trading_address_signer_mismatch,
      ).toMatch(/Magic|Proxy/u);
      expect(onboarding.kalshi.steps.join(" ")).toContain(
        "https://kalshi.com/account/profile",
      );
      expect(onboarding.kalshi.steps.join(" ")).toContain("Create New API Key");
      expect(onboarding.kalshi.steps.join(" ")).toContain("Copy as path");
      expect(onboarding.kalshi.steps.join(" ")).toContain("kalshi_key_file_invalid");
      expect(onboarding.review.note).toBeTruthy();
    }

    const spanishPolymarketSteps = getMessages("es")
      .desktop.terminal.providerOnboarding.polymarket.steps.join(" ");

    expect(spanishPolymarketSteps).not.toContain(
      "confirma que la cuenta/wallet es elegible",
    );
    expect(spanishPolymarketSteps).not.toContain("Confirma el modelo de wallet/funder");
    expect(spanishPolymarketSteps).toContain("Importar key copiada");
  });

  it("localizes legal approval onboarding checks for every desktop locale", () => {
    const requiredCheckKeys = [
      "platformEligible",
      "realOperator",
      "realBeneficialOwners",
      "realAccountOwner",
      "noGeoblockBypass",
      "noVpnBypass",
      "noFakeKyc",
      "noSanctionsBypass",
      "noCustody",
      "c0ReviewPass",
      "c1RiskAccepted",
      "auditEnabled",
      "firstLiveSmokeOnly",
      "noDepositsOrWithdrawals",
      "understandsRisk",
    ] as const;

    for (const locale of supportedLocales) {
      const legalApproval = getMessages(locale).desktop.terminal.legalApproval;

      expect(legalApproval.setupEyebrow).toBeTruthy();
      expect(legalApproval.openAction).toBeTruthy();
      expect(legalApproval.fields.targetJurisdiction).toBeTruthy();
      expect(legalApproval.fields.operatorIdentity).toBeTruthy();
      expect(legalApproval.actions.submit).toBeTruthy();
      expect(legalApproval.checksIntro).toBeTruthy();
      expect(legalApproval.singleApprovalToggle).toBeTruthy();
      expect(legalApproval.singleApprovalNote).toBeTruthy();
      expect(requiredCheckKeys.map((key) => legalApproval.checks[key])).toHaveLength(15);
      for (const key of requiredCheckKeys) {
        expect(legalApproval.checks[key]).toBeTruthy();
      }
    }

    const spanishLegalChecks = Object.values(
      getMessages("es").desktop.terminal.legalApproval.checks,
    ).join(" ");

    expect(spanishLegalChecks).toContain("No se usa VPN");
    expect(spanishLegalChecks).toContain("KYC falso");
    expect(spanishLegalChecks).toContain("ordenes live");
  });
});

function collectShape(value: unknown, path = "root"): string[] {
  if (Array.isArray(value)) {
    return [
      path,
      ...value.flatMap((entry, index) => collectShape(entry, `${path}[${index}]`)),
    ];
  }

  if (value && typeof value === "object") {
    return [
      path,
      ...Object.entries(value as Record<string, unknown>)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .flatMap(([key, entry]) => collectShape(entry, `${path}.${key}`)),
    ];
  }

  return [path];
}

function createRuntime(input: {
  language: string;
  languages: readonly string[];
  storedLocale: string | null;
}): LocaleBrowserRuntime {
  const values = new Map<string, string>();

  if (input.storedLocale) {
    values.set(localeStorageKey, input.storedLocale);
  }

  return {
    documentElement: {
      lang: "en",
    },
    language: input.language,
    languages: input.languages,
    storage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };
}
