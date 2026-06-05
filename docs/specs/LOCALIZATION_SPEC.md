# Localization Specification

Status: active for implementation.
Last updated: 2026-06-03.

## Scope

This specification applies to visible product copy in `apps/desktop` and `apps/landing`.

The MVP supported locales are:

- `en` English;
- `es` Spanish;
- `ca` Catalan.

`en` is the canonical fallback because active product, architecture, and legal documentation are maintained in English.

## Runtime behavior

- The apps resolve the initial locale from a non-sensitive stored preference first.
- If no valid preference exists, the apps resolve from `navigator.languages`.
- Locale variants resolve to their base locale when supported, for example `es-ES -> es`, `ca-ES -> ca`, and `en-US -> en`.
- Unknown or unsupported locales fall back to `en`.
- Manual selection persists only the locale code in `localStorage` under `prediction-ladder.locale`.
- The active locale updates the root document `lang` attribute.

## Package boundary

`packages/i18n` owns:

- supported locale codes;
- fallback locale;
- typed message catalogs split by locale under `packages/i18n/src/catalogs/`;
- shared message and surface types in `packages/i18n/src/types.ts`;
- locale resolution helpers;
- browser-safe locale preference helpers for apps;
- visible labels for desktop, landing, status values, and legal notes.

`packages/i18n` must remain content-only:

- no trading logic;
- no provider adapters;
- no live execution behavior;
- no credential handling;
- no network or filesystem access;
- no dependency on apps.

Apps may import `packages/i18n` and map internal keys, enums, or state to localized labels at render time.

## Translation rules

- Internal execution modes, provider IDs, audit codes, risk decisions, and adapter state remain canonical typed values, not translated data models.
- Prices, stake values, exposure values, and provider-currency identifiers must not be reformatted in a way that changes trading meaning.
- Legal and live-safety notes must preserve the same warnings in every locale. Translations must not weaken geoblock, KYC, sanctions, platform restriction, jurisdiction, credential, risk, audit, or explicit-approval language.
- Landing copy must continue to avoid fake testimonials, fake logos, fake metrics, profit guarantees, broad legal availability claims, or geoblock bypass language.

## Adding a locale

To add another language:

1. Add the locale code to `supportedLocales` in `packages/i18n`.
2. Add a complete catalog file under `packages/i18n/src/catalogs/` with the same key tree as `en`.
3. Register the catalog in `packages/i18n/src/catalogs/index.ts`.
4. Add or update locale resolution tests for the expected language variants.
5. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
6. If public legal or launch copy changes materially, review against `docs/legal/LEGAL_OPERATING_MODEL.md`.
