# Start Here for Codex

## Canonical repository declaration

This repository version is canonical. Earlier generated packs, Day 1 variants, and files under `docs/archive/` are non-canonical and must not be used as implementation context unless explicitly requested.

## First reading order

1. `AGENTS.md`
2. `docs/ai/CONTEXT_INDEX.md`
3. `docs/ai/context-handoff.md`
4. One context route only
5. The minimum relevant local skills only
6. One goal from `docs/ai/CODEX_GOALS.md`

## Strategic instruction

Build a real, live-ready Windows desktop product in a monorepo within the 40-hour test budget. This file is an entry guide; `docs/ai/context-handoff.md` controls the current phase, blockers, validation status, and next action.

- Desktop shell: Tauri + Vite + React + TypeScript.
- Landing: Vite + React + TypeScript static site for distribution, trust, and beta/demo conversion; not a trading surface.
- Venues: Polymarket and Kalshi are both required integrations; provider behavior lives in adapters behind venue-neutral ports.
- Legal posture: live execution only after gates.
- Paper mode: harness/fallback, not final product. The product target includes real live place/cancel capability; if gates cannot pass, the demo must show real data + live-dry-run/paper + exact gate status.
- Screen recordings: not evaluated and not necessary; they must not consume implementation time.

## Goal catalog

Use `docs/ai/context-handoff.md` to decide which goal is current. The reusable goal templates live in `docs/ai/CODEX_GOALS.md`.

1. `Goal 01 - Repo bootstrap`.
2. `Goal 02 - Domain core with tests`.
3. `Goal 03 - Desktop shell with provider-ready states`.
4. `Goal 04 - Complete provider read-only data`.
5. `Goal 05 - Paper/live-dry-run/audit`.
6. `Goal 06 - Gated live execution vertical slice`.

Do not jump to Polymarket SDK, live execution, landing polish, or desktop polish unless the handoff explicitly routes there.

## Landing page work

For landing page strategy or implementation, use Route I and the landing taskpack. The landing must be competitor-aware, desktop-first, live-ready but safety-gated, no-custody/local-first in posture, visually distinctive, and free from fake testimonials, fake metrics, profit claims, and broad legal availability claims.

## Non-negotiable safety posture

- C0 criminal/severe compliance risk blocks.
- C1 administrative/regulatory risk requires business-owner sign-off.
- No geoblock evasion.
- No fake KYC or fake beneficial ownership.
- No custody of user funds or private keys.
- No live execution without all gates approved: legal, jurisdiction/geoblock, credential source, max stake, max exposure, C0 clear, C1 approval if required, explicit live acknowledgement, and audit log enabled.
