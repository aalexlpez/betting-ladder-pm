# ADR-0009 — Bootstrap Stack and Quality Gates

Date: 2026-06-01

## Status

Accepted

## Decision

Use this concrete bootstrap stack:

- Desktop app: Tauri + Vite + React + TypeScript.
- Windows packaging: Tauri bundles (`.msi` or NSIS where feasible).
- Landing app: Vite + React + TypeScript static build.
- Monorepo orchestration: pnpm workspaces + Turborepo.
- Tests: Vitest.
- Lint/format: ESLint + Prettier.
- Styling: CSS variables / CSS modules first.
- No heavy dashboard template in the MVP.
- No Next.js unless a later ADR provides a concrete reason.

Quality gates must be real. Placeholder scripts such as `echo "TODO"` must not pass.

## Reason

The assignment is a 5-day / 40-hour launch-ready test. Vite keeps desktop renderer and landing setup lightweight, Vitest aligns with Vite, and Tauri gives a tighter privileged command boundary for a local-first trading terminal. The Rust/Tauri toolchain adds bootstrap risk, but the current decision accepts that risk to avoid a later desktop-platform migration.

## Alternatives considered

- Next.js for landing.
- Native C#/.NET Windows app.
- Broader all-JavaScript desktop runtime.
- Heavy dashboard/admin template.
- Placeholder quality gates until later implementation.

## Rejected alternatives

- Next.js is rejected for the default landing because there is no SSR/server requirement and it adds framework surface area.
- Native Windows is rejected because it fragments the TypeScript stack and slows Codex-driven delivery.
- A broader all-JavaScript desktop runtime is rejected by the current decision because it would preserve a broader desktop runtime surface and create a likely migration.
- Heavy dashboard templates are rejected because the product must feel like a specialized trading terminal.
- Placeholder gates are rejected because they produce false confidence.

## Source / evidence

- Vite official docs: fast dev server and optimized static production build.
- Vitest official docs: Vite-powered test runner.
- Tauri official docs: commands, permissions/capabilities, runtime authority, and Windows packaging.
- pnpm and Turborepo docs: monorepo/workspace orchestration.
- Original assignment: 5 days, 40 hours, product/launch-readiness, traceability, tests/validation.

## Consequences

- Goal 01 must install/configure this stack before application feature code.
- Goal 01 must produce minimal source entrypoints for desktop, landing, and core tests.
- Goal 01 must generate a lockfile when dependencies are installed.
- Dependency versions should be pinned or justified; committed manifests should avoid broad `latest` ranges.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` must run real commands or fail loudly.
- The landing and desktop renderer share React/TypeScript patterns, but only the Tauri shell may access execution boundaries.

## Goal 01 done definition

Goal 01 is not complete until:

- `pnpm` is enabled via Corepack or installed in the target dev environment;
- dependency versions are pinned or intentionally ranged, avoiding accidental `latest` drift for the bootstrap baseline;
- a lockfile exists after install;
- root and workspace scripts invoke real tooling;
- minimal source entrypoints exist for `apps/desktop`, `apps/landing`, and packages touched by root scripts;
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` either pass or fail with documented concrete blockers;
- `docs/ai/context-handoff.md` states the exact validation result and next goal.
