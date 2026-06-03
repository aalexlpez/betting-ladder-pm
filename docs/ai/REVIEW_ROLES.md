# Review Roles Operating Model

Review roles are lightweight Codex review prompts, not autonomous external agents.

## Constraint

The assignment is clarified as using `gpt-5.5`/Codex-style AI assistance, but not external AI tools running in autonomous agent mode unless explicitly approved. Therefore:

- use Codex goals as the single implementation driver;
- use review roles only for critique, test planning, risk review, or context reduction;
- do not let external tools edit the repository autonomously;
- do not run uncontrolled parallel implementation streams;
- if parallel coding is ever needed, use explicit branches/worktrees and integrate manually.

## Recommended review roles

| Role | Use for |
|---|---|
| Domain reviewer | Check order semantics, exposure math, rejection reasons, and tests. |
| Legal/safety reviewer | Check C0/C1 gates, custody, geoblock, identity, and live execution constraints. |
| Desktop UX reviewer | Check that the Tauri app behaves like a trading terminal, not a generic dashboard. |
| Launch reviewer | Check release readiness, demo path, known issues, and final live/no-live decision. |

## Operating rules

- Keep review prompts scoped to one goal or one diff.
- Treat review output as advice that must be applied by the main Codex session.
- Document only decisions that materially affect product, architecture, legal/safety, roadmap, or launch readiness.
