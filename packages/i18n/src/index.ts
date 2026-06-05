export {
  applyDocumentLocale,
  getRuntimePreferredLanguages,
  getStoredLocale,
  persistBrowserLocale,
  resolveBrowserLocale,
  type LocaleBrowserRuntime,
} from "./browser";
export { catalogs } from "./catalogs";
export {
  getMessages,
  isLocaleCode,
  resolveInitialLocale,
  resolveLocale,
  type LocalePreferenceInput,
} from "./locale";
export {
  fallbackLocale,
  localeStorageKey,
  supportedLocales,
  type AppMessages,
  type DesktopGateLabelKey,
  type DesktopLadderStateLabelKey,
  type DesktopMetricLabelKey,
  type DesktopBootCheckKey,
  type ExecutionModeLabelKey,
  type ImplementationStatusLabelKey,
  type LandingDownloadStateKey,
  type LandingTrustNoteKey,
  type LegalNoteKey,
  type LocaleCode,
} from "./types";
