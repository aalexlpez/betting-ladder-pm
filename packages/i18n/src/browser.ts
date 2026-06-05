import { localeStorageKey, type LocaleCode } from "./types";
import { resolveInitialLocale } from "./locale";

export type LocaleBrowserRuntime = {
  documentElement?: {
    lang: string;
  };
  language?: string;
  languages?: readonly string[];
  storage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
};

export function resolveBrowserLocale(runtime = getDefaultLocaleBrowserRuntime()): LocaleCode {
  return resolveInitialLocale({
    preferredLanguages: getRuntimePreferredLanguages(runtime),
    storedLocale: getStoredLocale(runtime),
  });
}

export function persistBrowserLocale(locale: LocaleCode, runtime = getDefaultLocaleBrowserRuntime()) {
  try {
    runtime.storage?.setItem(localeStorageKey, locale);
  } catch {
    return;
  }
}

export function applyDocumentLocale(locale: LocaleCode, runtime = getDefaultLocaleBrowserRuntime()) {
  if (runtime.documentElement) {
    runtime.documentElement.lang = locale;
  }
}

export function getRuntimePreferredLanguages(runtime: LocaleBrowserRuntime): readonly string[] {
  if (runtime.languages && runtime.languages.length > 0) {
    return runtime.languages;
  }

  return runtime.language ? [runtime.language] : [];
}

export function getStoredLocale(runtime: LocaleBrowserRuntime): string | null {
  try {
    return runtime.storage?.getItem(localeStorageKey) ?? null;
  } catch {
    return null;
  }
}

function getDefaultLocaleBrowserRuntime(): LocaleBrowserRuntime {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    documentElement: window.document.documentElement,
    language: window.navigator.language,
    languages: window.navigator.languages,
    storage: window.localStorage,
  };
}
