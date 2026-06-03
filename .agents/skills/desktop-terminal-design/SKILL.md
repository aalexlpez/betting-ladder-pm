---
name: desktop-terminal-design
description: Design and implement a distinctive Windows desktop trading terminal UI for Tauri without generic SaaS/dashboard aesthetics.
---

# Desktop Terminal Design Skill

Use this skill when designing or implementing `apps/desktop`, especially the trading ladder workspace, shell layout, command surfaces, live/paper state, risk panels, hotkeys, and terminal visual language.

This skill is intentionally different from generic frontend design. The product is a professional execution terminal, not a marketing dashboard, admin panel, crypto landing page, or generic AI SaaS app.

## Primary objective

Make the desktop app feel like a focused, trustworthy, high-density prediction-market execution terminal:

- fast to scan;
- keyboard-aware;
- risk-aware;
- local-first/no-custody in posture;
- visually distinct from web dashboards;
- credible against Betfair/DOM/ladder products;
- safe enough for gated live trading workflows.

## Read first

- `AGENTS.md`
- `docs/ai/CONTEXT_INDEX.md` Route J
- `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
- `docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md`
- `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
- `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
- `docs/desktop/DESKTOP_APP_COMPETITIVE_UI_NOTES.md`
- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/RISK_POLICY_SPEC.md`
- `docs/legal/LEGAL_OPERATING_MODEL.md` if changing live-trading language

## Non-generic design principles

### 1. Terminal, not dashboard

Do not create a card-heavy analytics dashboard. The center of gravity must be the ladder and execution context.

Default layout:

```txt
Top command/status strip
Left rail / market watchlist
Center / ladder workspace
Right rail / order ticket, risk, position, live gate
Bottom / audit log, fills, orders, connectivity
```

### 2. Dense but controlled

A trading terminal can be dense, but density must serve scan speed. Use tabular alignment, monospaced or tabular numerics, fixed row heights, clear bid/ask/price columns, visible best bid/ask/spread/last trade markers, compact status chips, and persistent risk state.

Avoid oversized marketing cards, decorative gradients in the ladder, and vague icons.

### 3. Live mode is a visual state

`paper`, `live_dry_run`, and `live` must be visually unmistakable. Never hide live state in settings only.

### 4. One-click is armed, never ambient

One-click controls must look like a dangerous-mode arm/disarm system, not a casual toggle. Show armed/off state, selected stake, max stake, market exposure, kill switch, and last action/audit result.

### 5. Desktop-native cues matter

Use desktop patterns deliberately: menu bar, keyboard shortcut legend, status bar, resizable panes or stable panels, focused keyboard navigation, and local settings.

### 6. No fake sophistication

Do not add charts, heatmaps, AI insights, synthetic PnL, fake users, or fake execution metrics unless implemented or clearly marked as mock. A credible ladder is better than a fake Bloomberg terminal.

## Visual language

- dark terminal base;
- restrained high-contrast accents;
- strong tabular grid;
- minimal ornament;
- numeric precision;
- explicit warning states;
- Windows desktop polish;
- professional trading context.

## Done when

- The app clearly reads as a desktop trading terminal.
- The ladder is visually dominant.
- Live/paper/stale/blocked states are impossible to confuse.
- The UI has no generic AI SaaS sections.
- Keyboard and focus behavior are considered.
- No unsafe live action bypasses domain gates.
