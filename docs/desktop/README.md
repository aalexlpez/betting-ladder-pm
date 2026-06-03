# Desktop App Design Docs

This directory contains the canonical desktop design context Codex should read for Route J. It is intentionally small to prevent context bloat.

## Canonical reading order

1. `DESKTOP_APP_DESIGN_BRIEF.md`
2. `DESKTOP_APP_DESIGN_SYSTEM.md`
3. `DESKTOP_APP_LAYOUT_SPEC.md`
4. `DESKTOP_APP_INTERACTION_SPEC.md`
5. `DESKTOP_APP_COMPETITIVE_UI_NOTES.md`
6. `DESKTOP_VISUAL_QA_CHECKLIST.md` only after implementation or when doing visual review

## Related specs

- `docs/specs/FUNCTIONAL_SPEC.md`
- `docs/specs/RISK_POLICY_SPEC.md`
- `docs/specs/LIVE_EXECUTION_SPEC.md` only if touching live flows

## Related AI taskpack

- `docs/ai/DESKTOP_APP_DESIGN_TASKPACK.md`

## Related skills

- `.agents/skills/desktop-terminal-design/SKILL.md`
- `.agents/skills/tauri-desktop-shell/SKILL.md`
- `.agents/skills/tauri-windows-native-polish/SKILL.md`
- `.agents/skills/tauri-ux-quality-review/SKILL.md` after implementation

## Rule

Do not load landing docs for desktop UI work unless the task explicitly touches marketing screenshots or public product copy.
