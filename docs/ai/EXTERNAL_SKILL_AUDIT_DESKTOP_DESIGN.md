# External Skill / Resource Audit - Desktop Design

## Decision

Do not install a broad external desktop skill blindly. Use canonical local project-specific skills instead:

- `desktop-terminal-design`
- `tauri-desktop-shell`
- `tauri-windows-native-polish`
- `tauri-ux-quality-review`

The missing layer is not only Tauri syntax. It is product-specific desktop trading UI design: ladder dominance, state visibility, risk/account surfaces, keyboard safety, and non-generic Windows terminal polish.

## Useful external references

### Microsoft Windows design guidance

Useful for desktop expectations: layout, navigation, input, typography, motion, command bars, and consistent controls. Use as inspiration without pretending the Tauri/React app is native WinUI.

### Tauri official docs

Required for:

- commands and invoke boundary;
- capabilities and permissions;
- runtime authority;
- plugin scopes;
- window/navigation controls;
- Windows packaging.

Sources:

- https://v2.tauri.app/security/
- https://v2.tauri.app/security/runtime-authority/
- https://v2.tauri.app/distribute/windows-installer/

## Risk

Generic desktop skills optimize implementation mechanics but not trading-product UX. If Codex only uses a generic skill, it may build a web dashboard inside Tauri, a generic admin panel, hidden live risk/account states, a visually weak ladder, unsafe global hotkeys, or a desktop shell without professional terminal polish.

## Canonical local sequence

```txt
context-router
  -> desktop-terminal-design
  -> tauri-desktop-shell
  -> tauri-windows-native-polish when needed
  -> tauri-ux-quality-review after implementation
```
