import { catalogs } from "./catalogs";
import { fallbackLocale, supportedLocales, type AppMessages, type LocaleCode } from "./types";

export type LocalePreferenceInput = {
  preferredLanguages?: readonly string[] | string | null;
  storedLocale?: string | null;
};

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && (supportedLocales as readonly string[]).includes(value);
}

export function resolveLocale(
  preferredLanguages: readonly string[] | string | null | undefined,
): LocaleCode {
  const candidates =
    typeof preferredLanguages === "string" ? [preferredLanguages] : (preferredLanguages ?? []);

  for (const candidate of candidates) {
    const supportedLocale = toSupportedLocale(candidate);

    if (supportedLocale) {
      return supportedLocale;
    }
  }

  return fallbackLocale;
}

export function resolveInitialLocale(input: LocalePreferenceInput = {}): LocaleCode {
  if (isLocaleCode(input.storedLocale)) {
    return input.storedLocale;
  }

  return resolveLocale(input.preferredLanguages);
}

export function getMessages(locale: LocaleCode | string | null | undefined): AppMessages {
  return catalogs[isLocaleCode(locale) ? locale : fallbackLocale];
}

function toSupportedLocale(value: string): LocaleCode | undefined {
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");

  if (isLocaleCode(normalized)) {
    return normalized;
  }

  const [baseLocale] = normalized.split("-");

  if (isLocaleCode(baseLocale)) {
    return baseLocale;
  }

  return undefined;
}
