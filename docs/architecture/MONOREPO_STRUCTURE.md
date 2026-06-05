# Monorepo Structure

## Decision

Use a single pnpm + Turborepo monorepo for all product, code, docs, scripts, and agent operating instructions.

## Why monorepo

- Shared domain logic between desktop and landing/dev shells.
- One place for legal gates, ADRs, time logs, and daily reports.
- Easier context routing for Codex.
- Faster refactors across packages.
- Consistent typecheck/test/build gates.

## Package map

```txt
apps/desktop
  Tauri shell, Rust-side commands/capabilities, React renderer, desktop packaging.

apps/landing
  Landing page, marketing copy, download instructions, legal disclaimers.

packages/core
  Pure domain logic. No network, no React, no Tauri.

packages/market-data
  Provider-neutral market data port plus Polymarket and Kalshi adapters.

packages/execution
  Paper, live-dry-run, and provider-specific live execution adapters.

packages/ui
  Shared React components.

packages/i18n
  Typed locale catalogs and locale resolution helpers for visible product copy.

packages/config
  Shared TypeScript, lint, test, and build config.
```

## Dependency direction

```txt
apps/*
  -> packages/i18n
  -> packages/ui
  -> packages/execution
  -> packages/market-data
  -> packages/core

packages/ui
  -> packages/core

packages/i18n
  -> no internal packages

packages/execution
  -> packages/core

packages/market-data
  -> packages/core

packages/core
  -> no internal packages
```

`packages/core` must remain pure and deterministic.

## Forbidden dependencies

- `packages/core` must not import React, Tauri, provider SDKs, filesystem, environment variables, or network clients.
- `packages/ui` must not place orders directly.
- `apps/desktop` must not bypass `packages/execution`.
- `packages/execution` must not bypass risk guard or legal gate.
- Provider-specific code must not leak into `packages/core` except through normalized provider IDs and domain types.
