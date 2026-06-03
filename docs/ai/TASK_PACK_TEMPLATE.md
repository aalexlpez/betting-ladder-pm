# Codex Task Pack Template

```md
# Task Pack: <name>

## Goal

<one concrete outcome>

## Context route

Use Route <X> from `docs/ai/CONTEXT_INDEX.md`.

## Read first

- AGENTS.md
- docs/ai/CONTEXT_INDEX.md
- docs/ai/context-handoff.md
- <route-specific docs>

## Allowed files

- <paths Codex may edit>

## Forbidden changes

- <paths or behaviors Codex must not touch>

## Implementation steps

1. <step>
2. <step>
3. <step>

## Acceptance criteria

- <criterion>
- <criterion>

## Validation commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Required docs update

- docs/ai/context-handoff.md
- docs/status/TIME_LOG.md
- <ADR if needed>
```
