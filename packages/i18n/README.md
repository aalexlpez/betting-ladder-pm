# @prediction-ladder/i18n

Typed locale catalogs and locale resolution helpers for presentation copy.

This package is content-only. It has no runtime dependencies, imports no apps, and must not contain trading logic, provider adapters, credentials, live execution behavior, or risk decisions.

Structure:

- `src/types.ts`: shared locale, message, and surface key types.
- `src/catalogs/`: per-locale message catalogs.
- `src/locale.ts`: locale resolution and message lookup.
- `src/browser.ts`: browser-safe locale preference helpers used by apps.

Follow repository boundaries in `docs/architecture/MONOREPO_STRUCTURE.md` and localization rules in `docs/specs/LOCALIZATION_SPEC.md`.
