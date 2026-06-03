---
name: tauri-desktop-shell
description: Build Windows-oriented Tauri shell without mixing domain logic into UI.
---

# Tauri Desktop Shell Skill

Use this for `apps/desktop` Tauri shell structure, Rust-side commands, capabilities/permissions, app startup, native menu, local settings shell, packaging hooks, and desktop-safe command boundaries.

## Rules

- UI displays state; domain decides validity.
- Tauri command/capability boundaries must be explicit.
- Do not expose unrestricted filesystem, shell/process, or provider SDK access to the renderer.
- Keep live controls visually obvious.
- One-click must be off by default.
- Add keyboard shortcuts only after risk guard is enforced.
- Renderer code must not receive private keys, seed phrases, raw auth headers, or unredacted secrets.
- Trading actions must go through domain/execution ports, not directly from React components.

## Pairing rules

For visible desktop UI design and non-generic terminal polish, use `desktop-terminal-design` before or alongside this skill.

If touching menus, title/status bars, window behavior, local settings, Tauri commands/capabilities, shortcuts, or packaging cues, also use `tauri-windows-native-polish`.

After implementation, use `tauri-ux-quality-review`.
