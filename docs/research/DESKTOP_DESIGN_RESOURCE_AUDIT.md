# Desktop Design Resource Audit

Purpose: record which external design resources should influence the Tauri desktop trading terminal. This audit prevents generic UI decisions and records why resources were accepted or rejected.

## Accepted inputs

1. Microsoft Windows design guidance for desktop expectations, focus behavior, command bars, typography, and accessibility.
2. Tauri official documentation for command/capability boundaries, runtime authority, permissions, packaging, and Windows distribution.
3. Professional trading terminal patterns: dense ladder, tabular numerics, persistent mode/risk/account state, audit/blotter visibility, and conservative keyboard behavior.

## Rejected inputs

- Generic SaaS dashboards as the primary desktop layout.
- Marketing hero sections inside the trading app.
- Competitor screenshots, logos, or copied layouts.
- Generic desktop skills as the sole UX source of truth.

## Decision

Use the local desktop skills and docs as canonical implementation context:

- `.agents/skills/desktop-terminal-design/SKILL.md`
- `.agents/skills/tauri-desktop-shell/SKILL.md`
- `.agents/skills/tauri-windows-native-polish/SKILL.md`
- `.agents/skills/tauri-ux-quality-review/SKILL.md`
- `docs/desktop/`
- `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`

## Rationale

The app needs a credible trading terminal surface, not just a working desktop wrapper. Tauri and Windows docs help with shell/security mechanics, but product-specific requirements come from the ladder, risk, account metrics, live gates, and audit specs.
