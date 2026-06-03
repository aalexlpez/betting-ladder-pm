# ADR-0008 — Desktop Terminal Design and Skills

## Status

Accepted

## Context

The product is now a Windows-oriented Tauri trading terminal with a strong landing page as the acquisition surface. The operating product must not feel like a generic React dashboard inside a desktop window. It must feel like a focused prediction-market execution terminal: ladder-first, dense, risk-aware, local-first, and credible for a live-ready workflow.

The original test asks for a full product opportunity to be converted into a product, go-to-market strategy, and launched or launch-ready version in 5 days / 40 hours. A generic desktop shell would weaken that product signal.

## Decision

Use a canonical desktop design skill set:

1. `desktop-terminal-design` for non-generic trading terminal UX and visual system.
2. `tauri-desktop-shell` for Tauri technical boundaries.
3. `tauri-windows-native-polish` for menus, window behavior, shortcuts, status surfaces, and secure desktop defaults.
4. `tauri-ux-quality-review` after implementation.

Use these canonical docs for Route J:

- `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
- `docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md`
- `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
- `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
- `docs/desktop/DESKTOP_APP_COMPETITIVE_UI_NOTES.md`
- `docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md`

## Rationale

The desktop app must optimize for fast manual ladder execution, numeric readability, visible paper/live-dry-run/live states, one-click armed/off clarity, kill switch visibility, legal/geo/credential gate visibility, no-custody/local-first posture, cancellation, auditability, and Windows desktop credibility.

A generic frontend-design skill is not enough because the desktop app has operational trading risk, keyboard/focus concerns, Tauri command/capability boundaries, and state visibility requirements that do not exist on the landing page.

## Non-goals

This ADR does not approve live order submission without legal/live gates, credential custody, global hotkeys that place live orders, bots, copy trading, AI signals, fake P&L, fake metrics, competitor screenshots, or a native C#/.NET rewrite.
