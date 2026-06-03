# Context Handoff

Last updated: 2026-06-03.

## Canonical context

This repository version is canonical. Earlier generated packs, Day 1 variants, files under `docs/archive/`, and superseded status reports are non-canonical implementation context unless explicitly requested.

`docs/ai/CONTEXT_INDEX.md` is the canonical route map and source-of-truth map.

## Current timing state

- Total budget: 40 hours.
- Day 1 is closed and logged as 8 hours.
- Day 2 is logged as 8 hours after the product-definition contrast report, repo bootstrap, corrected decisions, and validation pass.
- Current phase: Day 2 complete / next implementation block is Goal 03 Tauri desktop shell with provider-ready states.
- Delivery target: launched or launch-ready first version by the end of the 40-hour budget.

## Current status

Goal 01 repo bootstrap is complete. The repository now has a working pnpm/Turborepo workspace with minimal Tauri/Vite/React desktop and Vite/React landing entrypoints, real workspace scripts, strict TypeScript, ESLint, Vitest smoke tests, and a generated `pnpm-lock.yaml`.

Goal 01 audit result on 2026-06-02: **CONDITIONAL_PASS**. No critical blocker was found before Goal 02, and Goal 02 is now complete.

Goal 02 domain core with tests is complete after audit-blocker fixes on 2026-06-03. The fix added `decimal.js` as a real `@prediction-ladder/core` dependency, replaced the temporary bigint decimal engine with `decimal.js`-backed helpers, added deterministic economic-value rejection paths, added the live/live-dry-run audit log safety gate, and expanded the core suite to 44 deterministic tests.

Post-Goal-02 canonical state correction on 2026-06-03 resolved stale Goal 02 next-action text in `AGENTS.md`, `README.md`, `docs/START_HERE_FOR_CODEX.md`, and `docs/status/TIME_LOG.md`; marked the Day 1 daily report as historical/superseded for implementation decisions; replaced misleading package `ready: true` status objects with `boundaryReady` plus `implementationStatus`; and kept active `gpt-5.5`/screen-recording references intentional rather than claiming they were absent.

Documentation authority reduction on 2026-06-03 made this handoff the only detailed current-state and next-action source, moved the authority model into `docs/ai/CONTEXT_INDEX.md`, shortened entry docs into pointers instead of competing roadmaps, and marked support/status/launch traceability docs so they cannot override the current handoff.

Git/GitHub preparation on 2026-06-03 initialized the local repository plan for the empty `aalexlpez/betting-ladder-pm` GitHub remote, strengthened ignore/line-ending/editor conventions, and kept local/generated/sensitive files out of the first commit.

Remaining environment caveats:

- In the Codex sandbox, plain `pnpm` is not visible without approval because the installed shim lives under the user-level npm bin path. The required pnpm validations pass when the user-level pnpm command is allowed to run.
- Local Node.js is `22.1.0`, below Vite's preferred supported range of `20.19+` or `22.12+`; this is documented in root `package.json` and builds still pass.
- `rustc` and `cargo` are not on PATH, so Windows installer packaging was not run during the audit. This is deferred to the installer/distribution goal.
- Git commands in the Codex sandbox required adding this workspace to Git `safe.directory` because the sandbox user differs from the Windows workspace owner.

Latest bootstrap changes applied:

- installed `pnpm@10.0.0` and generated `pnpm-lock.yaml`;
- added root engine metadata for Vite's supported Node range: `>=20.19.0 <21 || >=22.12.0`;
- added minimal source entrypoints and Vitest smoke tests for `packages/core`, `packages/ui`, `packages/market-data`, `packages/execution`, and `packages/config`;
- added `apps/desktop` Vite React renderer entrypoint with disabled-mode bootstrap screen and no provider/live execution logic;
- added `apps/desktop/src-tauri` Tauri v2 shell scaffold with one secret-safe `app_get_status` command and only `core:default` capability permissions;
- added `apps/landing` Vite React static entrypoint with explicit non-trading bootstrap copy;
- renamed ESLint flat config to `eslint.config.mjs` so workspace lint commands load it correctly;
- expanded ESLint global ignores so nested generated artifacts such as `apps/desktop/dist` and `apps/landing/dist` are not linted after builds;
- pinned `@rolldown/binding-win32-x64-msvc@1.0.0-rc.15` because the Windows Vite/Vitest path required the native Rolldown binding;
- allowed only `esbuild` as an approved pnpm built dependency;
- started Vite dev servers for browser smoke verification at `http://127.0.0.1:1420/` and `http://127.0.0.1:5174/`.

Latest critical documentation fixes applied:

- updated `docs/status/TIME_LOG.md` to log Day 1 and Day 2 as 8-hour daily blocks with traceability to the Day 1 consolidated report and Day 2 contrast report; running total is now 16h of 40h;
- rewrote `docs/status/PRODUCT_DEFINITION_REPORT_2026-06-02.md` as a non-redundant Spanish Day 2 contrast report against the Day 1 report, focused only on deltas, corrected decisions, completed bootstrap work, validation, and remaining open questions;
- committed manifests and desktop README now point to Tauri;
- repository-wide documentation language is now Tauri-first, with the old desktop-runtime wording removed from active, status, and temporary docs;
- dependency versions in committed package manifests are pinned for the bootstrap baseline;
- live execution, launch, environment examples, and preflight are provider-aware instead of Polymarket-only;
- human clarification on 2026-06-02 says the product needs downloadable installer/distribution from landing, real Polymarket + Kalshi integrations, real live trading capability, paper only as harness/fallback, landing/GTM as sufficient commercial proof, simple human-readable reports, no screen recording requirement, and `gpt-5.5` as the stated tool target;
- Polymarket and Kalshi are now both required first-version integrations; fixtures are test artifacts only and do not count as provider integration;
- AI helper scripts now use Node `.mjs` runners instead of Bash so normal Codex workflow commands are Windows-first and do not require WSL;
- `docs/product/ASSIGNMENT_TRACEABILITY.md` now includes original-brief source status, confidence levels, a missing-brief ambiguity register, and a protocol for adding a sanitized brief, permitted excerpts, or human validation note;
- order-entry semantics use provider-currency stake/exposure terms rather than USDC-only domain names;
- monetization wording uses provider-approved paid routing/revenue share as a disabled-by-default hypothesis, not builder attribution as a canonical default.
- missing-versioned-brief risk is closed for current implementation by explicit human validation on 2026-06-02; exact brief wording remains optional archival evidence, not a blocker before Goal 01;
- historical pre-code audit language about "Polymarket-first, Kalshi deferred" is now explicitly marked superseded by the current dual-provider requirement;
- Goal 02 decimal arithmetic now uses `decimal.js` internally while preserving `DecimalString` boundaries;
- ADR-0001 live execution wording now treats real live place/cancel as an intended gated capability, not an ungated default or optional afterthought;
- Goal 04 now begins with a Kalshi official-access spike before implementing or documenting a Kalshi read-only blocker.
- post-Goal-02 canonical state docs now point to Goal 03 instead of Goal 02;
- package bootstrap statuses no longer use `ready: true`: `core` is `domain_core_complete`, `config` is `tooling_ready`, and `ui`, `market-data`, and `execution` remain `scaffold_only`;
- `docs/status/DAILY_REPORT_2026-06-01.md` now carries a visible historical/superseded note for Polymarket-first, mock-data-first, and live-not-default language.
- `docs/ai/CONTEXT_INDEX.md` now explicitly separates current-state authority, context routing, goal templates, canonical decisions, implementation specs, support/research docs, historical/status traceability, and archive/superseded docs.
- `AGENTS.md`, `README.md`, and `docs/START_HERE_FOR_CODEX.md` now defer detailed current phase, blockers, validation, and next action to this handoff instead of restating a roadmap.
- `docs/product/ASSIGNMENT_TRACEABILITY.md`, `docs/launch/LAUNCH_PLAN.md`, `docs/launch/LAUNCH_READINESS_CHECKLIST.md`, and `docs/launch/LIVE_SMOKE_TEST.md` are explicitly marked as support/reference docs for their current role.
- historical/status files such as `docs/status/TIME_LOG.md`, Day 1/Day 2 daily reports, and pre-code reports are explicitly marked or worded as traceability artifacts rather than implementation authority.
- `docs/adr/ADR-0001-live-ready-product.md` now defers current phase and next action to this handoff while preserving the live-ready product decision.
- repository hygiene now includes expanded `.gitignore` coverage for nested dependencies, Vite/Turbo/build outputs, Tauri/Rust package artifacts, logs, local Codex state, and real env files while keeping `.env.example`, `.env.local-smoke.example`, and `pnpm-lock.yaml` commit-ready.
- `.gitattributes` and `.editorconfig` now define stable line-ending/editor conventions for the monorepo.
- obsolete empty `.agents/skills/electron-*` directories were removed so the committed local skills match the active Tauri-first direction.

The active technical direction is:

- desktop: Tauri + Vite + React + TypeScript;
- landing: Vite + React + TypeScript static build;
- providers: complete Polymarket and Kalshi integration through provider-neutral ports and provider-specific adapters; fixtures are allowed only for deterministic tests;
- live execution: real gated place/cancel capability is a product target; if gates fail, show the exact blocker and do not bypass;
- domain: provider-neutral TypeScript package with deterministic tests;
- metrics: global, provider-level, and market-level PnL, available funds, open-order amount, and exposure;
- monetization: provider-approved disclosed fees/revenue share are the preferred commercial hypothesis, subscription is a fallback/private-team option, and all paid routing remains disabled by default;
- screen recordings: not evaluated and not necessary; they must not consume implementation time.

## Next action

1. Run `Goal 03 - Tauri desktop shell with provider-ready states`.
2. Then add complete real Polymarket and Kalshi read-only market data adapters, starting with a Kalshi official-access spike.
3. Then add paper/live-dry-run order intent and audit log.
4. Then add the gated real live execution vertical slice.
5. Then build/package the Windows installer or document the concrete blocker.
6. Then build/update the landing static page with truthful download/access flow.
7. Then perform release readiness review.

Do not start authenticated provider trading, live credentials, paid routing, or UI polish before the Goal 03 shell and provider-ready states exist.

## Vertical slice priority

```txt
repo bootstrap
  -> provider-neutral risk/order/metrics tests
  -> Tauri desktop ladder shell with provider-ready states
  -> real Polymarket and Kalshi read-only order books
  -> paper/live-dry-run order intent
  -> audit log
  -> gated real live place/cancel capability
  -> Windows installer/distribution artifact
  -> landing static
  -> release readiness
```

Real live execution is an intended capability and smoke target, but all live risk-increasing behavior remains blocked unless every gate is explicitly approved.

## Gates that block real live execution

- legal gate approved;
- jurisdiction/geoblock/platform eligibility pass for the selected provider;
- credential source ready;
- explicit local approval source or equivalent provider available outside committed repo state;
- max stake configured;
- max exposure configured;
- required provider/account metrics available;
- C0 clear;
- C1 human approval if required;
- paid-routing disclosure accepted if any paid routing is enabled;
- audit log enabled;
- explicit live acknowledgement.

Live must not be reachable by only flipping `ENABLE_LIVE_TRADING=true`.

## Documentation authority after cleanup

- Current state and next action: `docs/ai/context-handoff.md` only.
- Authority routing and source map: `docs/ai/CONTEXT_INDEX.md`.
- Entry pointers and guardrail summaries: `AGENTS.md`, `README.md`, and `docs/START_HERE_FOR_CODEX.md`; these defer current phase, blockers, validation, and next action to this handoff.
- Canonical product/technical/legal decisions remain in the product, architecture, legal, spec, and ADR files listed by `docs/ai/CONTEXT_INDEX.md`, including `docs/product/PROJECT_BRIEF.md`, `docs/product/MVP_SCOPE.md`, `docs/product/MONETIZATION_MODEL.md`, `docs/architecture/`, `docs/specs/`, `docs/legal/`, and active `docs/adr/` decisions.
- Support/reference docs now include `docs/product/ASSIGNMENT_TRACEABILITY.md`, `docs/launch/LAUNCH_PLAN.md`, `docs/launch/LAUNCH_READINESS_CHECKLIST.md`, `docs/launch/LIVE_SMOKE_TEST.md`, research notes, landing/desktop support docs, review roles, and source-quality notes. They support implementation but do not define the current next action.
- Historical/status traceability docs include `docs/status/`, daily reports, time logs, pre-code reports, and launch/status reports where marked. They preserve evaluator evidence and cannot override this handoff.
- Archived/superseded docs under `docs/archive/` remain non-canonical implementation context unless a human explicitly requests historical reconstruction.

## Validation status

- `pnpm typecheck`: passed on 2026-06-03 after Goal 02 audit-blocker fixes.
- `pnpm lint`: passed on 2026-06-03 after Goal 02 audit-blocker fixes.
- `pnpm test`: passed on 2026-06-03 after Goal 02 audit-blocker fixes.
- `pnpm build`: passed on 2026-06-03 after Goal 02 audit-blocker fixes.
- `pnpm ai:quality-gate`: passed on 2026-06-03 after the post-Goal-02 canonical state correction.
- `pnpm ai:quality-gate`: passed on 2026-06-03 after the documentation authority reduction; the default sandbox still cannot see `pnpm`, but the user-level pnpm path passes with the known Node.js `22.1.0` Vite engine warning.
- `pnpm ai:quality-gate`: passed on 2026-06-03 before the initial Git commit/push preparation; the default sandbox still could not see `pnpm`, but the user-level pnpm path passed with the known Node.js `22.1.0` Vite engine warning.

Environment notes:

- `corepack prepare pnpm@10.0.0 --activate` succeeded, but `corepack enable pnpm` could not write shims under `C:\Program Files\nodejs`; `pnpm@10.0.0` was installed through the user-level npm bin path instead.
- Vite warns that local Node.js `22.1.0` is below its preferred supported floor of `20.19+` or `22.12+`; the root `package.json` now declares the expected engine range and the build still passed.
- Tauri packaging command is configured as `pnpm package:win`, but packaging/building the Windows installer is deferred to the installer/distribution goal.

## Latest validation result

- `pnpm --filter @prediction-ladder/core typecheck`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm --filter @prediction-ladder/core lint`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm --filter @prediction-ladder/core test`: passed on 2026-06-03; 44 tests passed with the known Node engine warning.
- `pnpm --filter @prediction-ladder/core build`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm typecheck`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm lint`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm test`: passed on 2026-06-03 with the known Node engine warning.
- `pnpm build`: passed on 2026-06-03 with the known Node engine warning. Vite still warns that Node.js 22.1.0 is below its preferred 22.12+ floor, but the build passes.
- Goal 02 audit blockers fixed: `decimal.js` is present in `packages/core/package.json` and `pnpm-lock.yaml`; no custom bigint decimal engine remains in `packages/core/src/index.ts`; invalid price/stake/exposure/funds/risk-limit paths return deterministic rejections; live/live-dry-run risk-increasing validation now requires `auditLogEnabled`.
- `node --preserve-symlinks-main scripts/ai/check-no-fake-gates.mjs`: passed; no fake-positive quality gate scripts detected.
- `node --preserve-symlinks-main scripts/ai/session-start.mjs`: passed after follow-up cleanup; it reads `docs/ai/context-handoff.md` for the current next action.
- `pnpm --version`: passed with approval/user-level pnpm path; version is `10.0.0`.
- `pnpm typecheck`: passed with the known Node engine warning.
- `pnpm lint`: passed with the known Node engine warning.
- `pnpm test`: passed with the known Node engine warning.
- `pnpm build`: passed with the known Node engine warning.
- `node --preserve-symlinks-main scripts/ai/quality-gate.mjs`: failed in the default sandbox because `pnpm` was not visible on PATH; passed with approval/user-level pnpm path and internally ran `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Optional `pnpm --filter @prediction-ladder/desktop build`: passed with the known Node engine warning.
- Optional `pnpm package:win`: not run because `rustc` and `cargo` are not on PATH in this environment.
- Browser DOM smoke passed for the landing page at `http://127.0.0.1:5174/`: title `Prediction Ladder`, one `Prediction Ladder` heading, and three trust notes.
- Browser DOM smoke passed for the desktop renderer at `http://127.0.0.1:1420/`: title `Prediction Ladder Desktop`, one `Prediction Ladder` heading, four safety checks, and disabled execution mode visible.
- Browser screenshot capture timed out in the browser backend, so the smoke result is DOM-based.
- `node --preserve-symlinks-main scripts/ai/live-preflight.mjs`: failed as expected because `LEGAL_GATE_STATUS` is not approved.
- Documentation search found no active Bash `.sh` workflow scripts. Remaining `.sh` text only appears inside external `skills.sh` URLs.
- Active documentation now treats Polymarket and Kalshi as required first-version integrations. Fixture/mock data is acceptable only for tests and must not be presented as product integration.
- The standard pnpm quality gate is no longer blocked; pnpm is available through the user-level npm installation.
- Bash/WSL is no longer required for the normal `pnpm ai:*` helper scripts; they now run through Node `.mjs` files.
- This workspace is not currently a Git repository, so change review used direct file/search validation instead of `git status`.
- Assignment traceability now closes the missing-versioned-brief issue for implementation through explicit human validation; exact brief text remains optional archival evidence if it becomes available later.
- Human brief-clarification answers have been incorporated into assignment traceability, project brief, MVP scope, launch plan, live execution spec, GTM docs, legal model, and AI/review workflow docs.
- Documentation search found intentional active references to `gpt-5.5` and screen recordings; those references document human clarification and keep recordings out of the critical implementation path.
- `pnpm ai:quality-gate`: first failed in the default sandbox because `pnpm` was not visible on PATH; passed with approval/user-level pnpm after the canonical state correction and internally ran `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Final `pnpm ai:quality-gate` rerun after the handoff update also passed with the known Node.js `22.1.0` Vite engine warning.
- An earlier uncached correction-pass run emitted non-blocking Turborepo "no output files found" cache warnings for tasks that intentionally emit no build artifacts.
- Documentation authority checks passed on 2026-06-03: targeted searches found the detailed Goal 03 next implementation block only in this handoff; remaining active next-action/current-phase mentions are pointers to this handoff or explicitly historical/support wording; `docs/archive/README.md` still marks archived files as non-canonical.
- Git ignore checks passed before the initial commit: `.codex/`, `.local/`, `.turbo/`, nested `node_modules/`, app `dist/` outputs, and real `.env` files are ignored; `.env.example`, `.env.local-smoke.example`, `pnpm-lock.yaml`, source, docs, scripts, and active `.agents/skills` are commit-ready.

## Known remaining domain/spec caveats

- Rounding metadata is not yet exposed when order quantity/cost/proceeds are rounded down by decimal precision.
- Mixed known/unknown financial metric aggregation can hide unknown provider/account data unless provider adapters and live guards handle those unknowns conservatively.
- Executable/tradable paths need required `outcomeId` or a separate `TradableMarketRef`; current core `MarketRef` still allows `outcomeId` to be omitted for non-trading metric/display cases.
- Live SELL must remain blocked unless a provider adapter proves position availability and that the order is genuinely reducing exposure.

## Open human validation

- Kalshi read-only data is required for the first provider-data goal. Goal 04 must start with a Kalshi official-access spike; if official access/auth/API constraints block it, document that as a blocker rather than replacing it with fixtures.
- Validate Kalshi commercial/provider terms before any fee, revenue-share, broker, or live execution path.
- Confirm whether USD and USDC should remain separate in global metrics or whether a later ADR should define a conversion policy.
