# Dependency Boundaries

## Allowed imports

| From | May import |
|---|---|
| `apps/desktop` | `packages/ui`, `packages/core`, `packages/market-data`, `packages/execution` |
| `apps/landing` | `packages/ui` only, plus static product docs if needed |
| `packages/ui` | `packages/core` |
| `packages/market-data` | `packages/core` |
| `packages/execution` | `packages/core` |
| `packages/core` | no internal packages |

## Forbidden imports

- `packages/core` importing anything from apps, React, Tauri, provider SDKs, filesystem, process env, or network clients.
- `packages/ui` importing Polymarket/Kalshi SDKs or placing orders.
- `apps/landing` importing live execution code.
- `packages/market-data` importing execution code.
- Any package importing secrets from `.env` except the Tauri shell or credential provider layer.

## Reason

This keeps the domain testable and lets the product support both a landing page and a desktop trading surface without duplicating or coupling business logic.
