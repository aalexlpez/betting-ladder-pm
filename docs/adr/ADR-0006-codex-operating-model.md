# ADR-0006 — Codex Operating Model

Date: 2026-06-01

## Status

Accepted

## Context

The project is time-limited and context-heavy. Without structure, Codex may repeatedly reread irrelevant context, overbuild, or introduce inconsistent decisions.

## Decision

Use:

- `AGENTS.md` as stable instructions;
- `docs/ai/CONTEXT_INDEX.md` for context routing;
- local skills in `.agents/skills`;
- small goals in `docs/ai/CODEX_GOALS.md`;
- quality gates;
- `docs/ai/context-handoff.md` for compact session memory.

## Consequences

- Codex tasks become smaller and reviewable.
- Context bloat is reduced.
- Live safety instructions are consistently available.
- Documentation remains part of the implementation process.

## Rejected alternatives

- One giant prompt: too brittle.
- No agent docs: inconsistent outcomes.
- Too many external skills/plugins: security and context risk.
