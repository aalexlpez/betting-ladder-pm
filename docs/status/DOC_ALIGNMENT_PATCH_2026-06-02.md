# Documentation Alignment Patch — 2026-06-02

## Status

Applied before application feature coding. This patch aligns the framework with Day 2 and the 40-working-hour delivery budget.

## Why this patch exists

The repository was strong enough to begin controlled implementation, but several active documents still contained stale or ambiguous planning language. The governing delivery constraint is the 5-workday / 40-hour technical-test budget. Day 1 is closed at 8 hours, and Day 2 starts implementation.

## Decisions applied

- Replaced calendar-weekday demo language with final 40-hour delivery language.
- Marked Day 1 as closed at 8.0 hours and Day 2 as active.
- Clarified that the default valid demo is real market data plus gated paper/live-dry-run and audit log.
- Kept real live execution gated; later human clarification treats real live trading as an intended capability and live smoke target, still only if all legal, geo, credential, risk, user-confirmation, and audit gates pass.
- Corrected Codex routing so Goal 05 is paper/live-dry-run/audit and Goal 06 is the optional approved live execution slice.
- Changed default credential posture in `.env.example` to `CREDENTIAL_SOURCE=none`.
- Replaced autonomous-sounding agent language with review roles.
- Removed obsolete active-context files and moved compact superseded placeholders to `docs/archive/superseded/`.
- Corrected the previous invalid evaluator-brief path reference.
- Added additional acceptance details for bootstrap, market-data fixtures, order rejection tests, live approval source, and desktop security boundaries.

## Still not implemented

- Application source code.
- Dependency installation / lockfile.
- Domain tests.
- Desktop shell.
- Polymarket read-only adapter.
- Paper/live-dry-run execution.
- Landing static build.

## Files to read next

1. `AGENTS.md`
2. `docs/START_HERE_FOR_CODEX.md`
3. `docs/ai/CONTEXT_INDEX.md`
4. `docs/ai/context-handoff.md`
5. `docs/ai/CODEX_GOALS.md#goal-01--repo-bootstrap`

## Decision

The framework is ready to start controlled coding with Goal 01. Do not ask Codex to build the entire app in one pass.
