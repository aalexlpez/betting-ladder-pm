# Desktop App Design Taskpack for Codex

Use this taskpack when the next task is to make the Tauri app look and behave like a professional Windows trading terminal instead of a generic dashboard.

## Required context

Read:

- `AGENTS.md`
- `docs/ai/CONTEXT_INDEX.md` Route J
- `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
- `docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md`
- `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
- `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
- `docs/desktop/DESKTOP_APP_COMPETITIVE_UI_NOTES.md`
- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/RISK_POLICY_SPEC.md`

Use skills:

- `desktop-terminal-design`
- `tauri-desktop-shell`
- `tauri-windows-native-polish` if touching menus/window/status bar/shortcuts/packaging cues
- `tauri-ux-quality-review` after implementation

## Implementation sequence

### Phase 1 — Layout skeleton

Build the full terminal layout with provider-ready states:

- native menu placeholder;
- top command/status strip;
- left market watch;
- central ladder;
- right risk/order rail;
- bottom orders/audit/status panel.

### Phase 2 — Trading state visibility

Add persistent surfaces for execution mode, market data status, one-click armed/off, selected stake, legal/geo/credential gate, kill switch, and last audit event.

### Phase 3 — Ladder fidelity

Improve ladder credibility with fixed row heights, tabular numerics, bid/price/ask alignment, best bid/ask markers, spread display, disabled/live-blocked states, and hover preview states.

### Phase 4 — Desktop polish

Add or plan menu skeleton, safe keyboard shortcuts, shortcut help panel, pane resizing placeholder, status bar connection details, and settings placeholder for local credential posture.

### Phase 5 — Review

Run `tauri-ux-quality-review` and document pass/conditional/fail, top issues, fixes before demo, fixes later, and any live-trading UX blockers.

## Copy-paste goal

```txt
/goal Apply the desktop terminal design pass to the Tauri app.

Read first:
- AGENTS.md
- docs/ai/CONTEXT_INDEX.md Route J
- docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md

Use skills:
- desktop-terminal-design
- tauri-desktop-shell
- tauri-windows-native-polish if touching menus/window/status bar/shortcuts/packaging cues

Implement a professional Windows trading terminal layout with a central ladder, market rail, risk rail, status strip, bottom audit/orders panel, and visible paper/live/live-dry-run gates. Use honest no-market/loading/empty/error states until real provider data is wired. Do not present mock liquidity as product data and do not add live execution in this task.

After implementation, use:
- tauri-ux-quality-review

Acceptance criteria:
- the ladder is the main visual workspace
- the UI is not a generic dashboard
- risk/live state is always visible
- one-click is off by default
- build/typecheck/lint pass or blockers are documented
- docs/ai/context-handoff.md is updated
```
