---
name: tauri-ux-quality-review
description: Review Tauri desktop app UX, Windows polish, terminal credibility, keyboard behavior, Tauri safety posture, and safety-state visibility before demo.
---

# Tauri UX Quality Review Skill

Use this after implementing or modifying `apps/desktop` UI. This is a review skill, not a build skill.

## Review objective

Ensure the desktop app feels like a credible Windows trading terminal and does not regress into generic web dashboard patterns or unsafe live-trading UX.

## Read first

- `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
- `docs/desktop/DESKTOP_APP_DESIGN_SYSTEM.md`
- `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
- `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
- `.agents/skills/desktop-terminal-design/SKILL.md`
- `.agents/skills/tauri-desktop-shell/SKILL.md`
- `docs/specs/RISK_POLICY_SPEC.md`

## Review dimensions

1. Desktop credibility: native menu/status bar, keyboard affordances, focused interaction states, no browser-only navigation patterns.
2. Ladder credibility: central ladder dominance, bid/ask/price alignment, best prices, spread, stake, exposure, pending orders, and audit state.
3. Risk visibility: execution mode always visible, one-click off by default, live mode explicitly armed, blocked reasons readable, kill switch obvious.
4. Tauri safety posture: no unrestricted commands/capabilities, no direct filesystem/shell/provider access in renderer, no remote content in trading shell, no secrets in UI/logs.
5. Non-generic visual quality: no generic SaaS cards, fake AI/crypto clichés, decorative charts, marketing hero styles, or weak default tables.

## Output format

Return:

1. `PASS`, `CONDITIONAL_PASS`, or `FAIL`.
2. Top 5 issues.
3. Fixes required before demo.
4. Fixes that can wait.
5. Any live-trading UX blockers.
6. Whether `docs/ai/context-handoff.md` needs an update.
