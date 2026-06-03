# Desktop App

Tauri + Vite + React + TypeScript Windows-oriented trading terminal.

## Responsibilities

- Tauri shell, Rust-side commands/capabilities, and React renderer.
- Secure command boundaries described in `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`.
- Local settings and approved local credential integration when implemented.
- Desktop UX, keyboard handling, and terminal layout.
- Route user actions through shared domain/execution packages.

## Must not

- Place orders directly from UI components.
- Store secrets in code.
- Send private keys/API secrets to renderer.
- Bypass legal/risk/geoblock gates.
- Load remote trading shell content without a new ADR.
