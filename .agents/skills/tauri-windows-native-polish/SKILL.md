---
name: tauri-windows-native-polish
description: Improve Tauri/Windows desktop app shell polish, including window chrome, menus, shortcuts, local settings, command boundaries, native-feeling interaction, packaging cues, and secure desktop defaults.
---

# Tauri Windows Native Polish Skill

Use this skill when the task involves the Tauri shell, native desktop feel, Windows packaging readiness, secure command/capability boundaries, or desktop behavior that should not feel like a web page in a wrapper.

## Purpose

Make the Tauri app feel like a deliberate Windows desktop trading terminal, not a browser tab pasted into a native window.

## Required context

Read:

1. `AGENTS.md`
2. `docs/ai/CONTEXT_INDEX.md` Route E and Route J
3. `docs/architecture/DESKTOP_PLATFORM_DECISION.md`
4. `docs/desktop/DESKTOP_APP_DESIGN_BRIEF.md`
5. `docs/desktop/DESKTOP_APP_LAYOUT_SPEC.md`
6. `docs/desktop/DESKTOP_APP_INTERACTION_SPEC.md`
7. `.agents/skills/tauri-desktop-shell/SKILL.md`

If credentials, live execution, or storage are touched, also use `legal-live-safety-gate` and Route F.

## Native polish checklist

- Define sane minimum window size for ladder usability.
- Support resize without breaking density.
- Avoid browser-like navigation UI.
- External links should open in the system browser.
- Use a desktop-appropriate title/app bar.
- Include connection status, execution mode, and kill switch in persistent chrome.
- Keyboard shortcuts must be explicit and documented.
- Focus state must be clear on dense tables.
- Keep Tauri capabilities and permissions minimal and explicit.
- Keep renderer access to filesystem, shell/process, provider SDKs, and secrets blocked.
- No secrets in renderer logs.
- Package commands may be placeholders if blockers are documented.
