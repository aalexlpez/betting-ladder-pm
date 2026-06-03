# Codex Operating Model

## Objective

Make Codex produce consistent, reviewable, high-quality output in a high-risk, time-limited product build.

The repository uses a compact operating system:

```txt
AGENTS.md
  -> CONTEXT_INDEX.md
  -> route-specific docs
  -> local Codex skill
  -> small goal
  -> quality gate
  -> context handoff update
```

## Principles

1. Small goals beat huge prompts.
2. Route context instead of loading the whole repo.
3. Codex can optimize implementation speed, but not legal judgment.
4. Domain logic must be deterministic and tested before UI polish.
5. Live execution requires gates, feature flags, local approval state, and audit logging.
6. Refuse scope expansion unless it advances 40-hour delivery readiness.
7. Do not use external AI tools in autonomous agent mode.

## Workflow

1. Start with `pnpm ai:session-start`.
2. Select one goal from `docs/ai/CODEX_GOALS.md`.
3. Read the minimum context route.
4. Use the relevant local Codex skill from `.agents/skills`.
5. Make a short implementation plan.
6. Edit files.
7. Run the quality gate.
8. Ask Codex to review its own diff.
9. Update `docs/ai/context-handoff.md`.
10. Update the time log and daily report.

## Codex prompt standard

Every Codex goal should include:

- goal;
- files to read;
- files allowed to edit;
- forbidden changes;
- implementation steps;
- validation commands;
- stop conditions;
- documentation updates.

## Context compaction

At the end of each substantial work block, summarize:

- what changed;
- what decisions were made;
- what commands passed or failed;
- what is blocked;
- the exact next task.

Put the summary in `docs/ai/context-handoff.md`. This prevents context bloat.

## Review roles

Use review roles for critique and research, not for uncontrolled simultaneous edits. Review roles must not run as external autonomous agents. If parallel coding is needed, use separate branches/worktrees and integrate manually.
