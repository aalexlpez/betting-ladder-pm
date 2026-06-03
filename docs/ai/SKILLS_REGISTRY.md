# Skills Registry

This registry lists the canonical local repository skills that Codex should use. Skills are intentionally task-specific so Codex can load only the context needed for the current goal.

## Core skills

| Skill | Purpose |
|---|---|
| `context-router` | Select the minimum required project context for each task. |
| `monorepo-architect` | Maintain the pnpm/Turborepo architecture and package boundaries. |
| `domain-tdd-ladder` | Build the ladder, order intent, risk, audit, financial metrics, and execution domain using tests first. |
| `polymarket-live-adapter` | Integrate Polymarket market data and gated live execution where explicitly scoped. |
| `legal-live-safety-gate` | Prevent unsafe live trading, custody, geoblock evasion, KYC misuse, or criminal-risk paths. |
| `release-readiness-review` | Run final review gates before demo, launch, or handoff. |

## Landing skills

| Skill | Purpose |
|---|---|
| `landing-conversion-strategist` | Plan and critique landing copy, structure, CTA, trust signals, and competitive differentiation. |
| `frontend-design` | Build distinctive, product-specific landing/frontend UI without generic AI aesthetics or unsupported claims. |
| `web-interface-guidelines-review` | Review landing/UI code for accessibility, responsiveness, motion, performance, and UX correctness after implementation. |

## Desktop skills

| Skill | Purpose |
|---|---|
| `desktop-terminal-design` | Design and implement the desktop app as a professional, non-generic trading terminal. |
| `tauri-desktop-shell` | Build the Windows desktop trading terminal shell with Tauri commands, capabilities, and safe renderer boundaries. |
| `tauri-windows-native-polish` | Improve Windows-native desktop polish: menus, title/status bars, shortcuts, settings, packaging cues, and secure defaults. |
| `tauri-ux-quality-review` | Review desktop UX, Windows polish, terminal credibility, keyboard behavior, Tauri safety, and live-state visibility. |

## Loading rules

For landing work:

1. `context-router`
2. `landing-conversion-strategist`
3. `frontend-design`
4. `web-interface-guidelines-review` after implementation

For desktop UI work:

1. `context-router`
2. `desktop-terminal-design`
3. `tauri-desktop-shell`
4. `tauri-windows-native-polish` when native shell behavior or packaging cues are involved
5. `tauri-ux-quality-review` after implementation

For trading/live execution work:

1. `context-router`
2. `domain-tdd-ladder` or provider adapter skill
3. `legal-live-safety-gate`
4. `release-readiness-review`

## External skills policy

External skills may be used only after auditing their `SKILL.md`, scripts, permissions, and fit with project ADRs. For this repository, frontend and desktop design guidance has been adapted into local skills instead of blindly installing broad external dependencies.
