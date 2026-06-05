# Dependency Boundaries

## Allowed imports

| From | May import |
|---|---|
| `apps/desktop` | `packages/ui`, `packages/i18n`, `packages/core`, `packages/market-data`, `packages/execution` |
| `apps/landing` | `packages/ui`, `packages/i18n`, plus static product docs if needed |
| `packages/ui` | `packages/core`, `packages/i18n` if shared components need localized labels |
| `packages/i18n` | no internal packages |
| `packages/market-data` | `packages/core` |
| `packages/execution` | `packages/core` |
| `packages/core` | no internal packages |

Provider SDK/source-of-truth API client dependencies for Goal 04B must live on
the Tauri-owned provider runtime side, or in a future provider-runtime package
that is never imported by the React renderer. If a new package is introduced, it
needs a README and an explicit boundary explanation.

## Forbidden imports

- `packages/core` importing anything from apps, React, Tauri, provider SDKs, filesystem, process env, or network clients.
- `packages/i18n` importing apps, React components, provider SDKs, execution adapters, credentials, filesystem, process env, or network clients.
- `packages/ui` importing Polymarket/Kalshi SDKs or placing orders.
- `apps/landing` importing live execution code.
- `packages/market-data` importing execution code.
- Any package importing secrets from `.env` except the Tauri shell or credential provider layer.
- Provider SDK objects, WebSocket clients, raw auth headers, request signatures, private keys, or API secrets crossing into `packages/core`, `packages/ui`, `packages/i18n`, or renderer-imported code.

## Reason

This keeps the domain testable and lets the product support both a landing page and a desktop trading surface without duplicating or coupling business logic. Localization is presentation/content infrastructure only; translated labels must not become trading state.
