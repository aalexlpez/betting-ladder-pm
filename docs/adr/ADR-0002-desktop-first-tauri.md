# ADR-0002 - Desktop-First Windows App with Tauri/Vite

Date: 2026-06-01

## Status

Accepted, updated 2026-06-02

## Context

A trading ladder terminal benefits from local-first credentials, hotkeys, persistent focus, and a professional desktop UX. The assignment is time-boxed to 5 days / 40 hours, so the stack must be fast for Codex-driven TypeScript development.

## Decision

Build a Windows-oriented desktop app using Tauri + Vite + React + TypeScript. Use Tauri Windows bundles for packaging. Build the public landing as a Vite + React static app. Use Vitest, ESLint, Prettier, and CSS variables/CSS modules first.

## Reason

This keeps the app, landing, domain, UI, market-data, and execution code in one monorepo while putting privileged desktop behavior behind a smaller Tauri/Rust command surface. Tauri has more bootstrap/toolchain risk than a pure all-JavaScript desktop stack, but the tighter command/capability boundary is a better match for local credentials and live-ready trading safety.

## Alternatives considered

- Web app as main trading product.
- Native C#/.NET Windows app.
- Broader all-JavaScript desktop runtime.
- Next.js landing.

## Rejected alternatives

- Web trading surface: weaker credential/no-custody posture.
- Native Windows: too slow for 40h Codex-driven build.
- Broader all-JavaScript desktop runtime: faster for bootstrap, but a broader desktop runtime surface than the current safety model wants.
- Next.js landing: unnecessary without SSR/server features.

## Evidence

- Tauri official docs: commands, permissions, capabilities, runtime authority, and Windows packaging.
- Vite official docs: fast React/TypeScript frontend tooling.
- Vitest official docs: Vite-native test runner.
- Tauri official docs: Windows `.msi`/NSIS packaging and code signing.

## See also

- `docs/adr/ADR-0009-bootstrap-stack-and-quality-gates.md`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`


## Source / evidence

- Tauri documentation: https://v2.tauri.app/
- Vite documentation: https://vite.dev/
- Tauri Windows installer documentation: https://v2.tauri.app/distribute/windows-installer/
