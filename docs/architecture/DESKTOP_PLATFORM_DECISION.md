# Desktop Platform Decision

## Decision

Build the operating product as a Windows-oriented desktop app using Tauri + Vite + React + TypeScript, plus a lightweight Vite + React landing page.

Packaging target: Tauri Windows bundles, with `.msi` or NSIS installer output attempted when the Windows toolchain is available.

## Rationale

The product is a trading terminal, not a generic web SaaS. Desktop improves:

- local-first credential posture;
- no-custody narrative;
- hotkeys and persistent focus;
- professional trader UX;
- controlled live smoke test;
- differentiation from native web interfaces.

Tauri is selected because it keeps the React/TypeScript renderer while moving privileged desktop behavior into a smaller Rust-side command surface with explicit permissions and capabilities. This better matches the safety posture for a live-ready trading app than a broad JavaScript desktop runtime. The tradeoff is Rust/Tauri toolchain setup risk, which is accepted because the project now prioritizes a single clearer technical direction over minimizing early bootstrap friction.

## Concrete bootstrap stack

- Desktop: Tauri + Vite + React + TypeScript.
- Desktop privileged layer: Rust-side Tauri commands, events, capabilities, and local secure providers.
- Packaging: Tauri CLI Windows bundles (`.msi` or NSIS where feasible).
- Landing: Vite + React + TypeScript static build.
- Tests: Vitest for TypeScript domain packages; Rust tests only where Tauri command logic becomes non-trivial.
- Lint/format: ESLint + Prettier for TypeScript; Rust formatting through the Tauri/Rust toolchain when configured.
- Styling: CSS variables / CSS modules first.
- Templates: avoid heavy dashboard templates; build terminal-specific UI.

## Product shape

```txt
Landing web
  -> explains product
  -> shows demo/screenshots
  -> downloads Windows app when packaged

Windows desktop app
  -> real terminal
  -> local credentials
  -> live-ready execution
  -> provider-aware Polymarket/Kalshi adapters
```

## Alternatives considered and rejected

### Web app as main trading product

Rejected for MVP because real trading with credentials is harder to defend in a public web app, and the professional UX is weaker.

### Native C#/.NET Windows app

Rejected because it slows Codex-driven development and fragments the TypeScript domain/UI stack.

### Broad all-JavaScript desktop runtime

Rejected by the current product decision. A broader desktop JavaScript runtime would be faster for all-JavaScript bootstrap work, but Tauri gives a tighter privileged command boundary and keeps the default desktop surface narrower.

### Next.js landing

Rejected as default because this landing has no SSR/server requirement and a static Vite build is enough for the time box.

### Tauri + web SaaS backend with cloud secrets

Rejected due to custody and secret-management risk.

## Source / evidence

- Tauri security model: permissions, capabilities, runtime authority, and WebView command boundaries.
- Tauri distribution docs: `tauri build` and Windows `.msi`/NSIS packaging.
- Vite official docs for fast dev server/static build.
- Assignment time box: 5 days / 40 hours, launch-ready or ready-to-launch product.
