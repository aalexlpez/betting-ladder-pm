# Desktop App Design System

## Name

**Risk Terminal Dark**

## Direction

A compact, dark, professional trading terminal design system for a Windows Tauri app.

Attributes:

- high contrast;
- subdued surfaces;
- compact panels;
- tabular numbers;
- semantic execution-state badges;
- visible risk gates;
- restrained motion;
- Windows-native typography cues.

## Typography

Default stack:

```css
font-family: "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
```

Numerics:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1, "lnum" 1;
```

Roles:

| Role | Size | Weight | Use |
|---|---:|---:|---|
| App chrome | 12-13px | 500 | title/status bars |
| Body compact | 12px | 400 | ladder metadata, audit rows |
| Body | 14px | 400 | panels, labels |
| Body strong | 14px | 600 | selected market, active labels |
| Panel title | 13px | 700 | rail headings |
| Numeric ladder | 12-13px | 500/600 | price/size cells |
| Critical state | 12-14px | 700 | live/kill/legal warnings |

## CSS tokens

```css
:root {
  --pl-bg-root: #07090d;
  --pl-bg-panel: #0d1117;
  --pl-bg-panel-raised: #111722;
  --pl-bg-cell: #0b1018;
  --pl-bg-cell-hover: #151d2b;
  --pl-border-subtle: #1d2633;
  --pl-border-strong: #334155;

  --pl-text-primary: #e5edf7;
  --pl-text-secondary: #9aa8bb;
  --pl-text-muted: #677386;

  --pl-accent-focus: #7dd3fc;
  --pl-bid: #38bdf8;
  --pl-ask: #f97316;
  --pl-success: #22c55e;
  --pl-warning: #f59e0b;
  --pl-danger: #ef4444;
  --pl-paper: #a78bfa;
  --pl-live: #f43f5e;
}
```

Rules:

- bid/ask may use color, but must also use labels and position;
- live mode must use color + text + persistent placement;
- disabled controls must explain why;
- do not use green/red alone for meaning.

## Density

| Element | Target |
|---|---:|
| Title/command bar | 36-44px |
| Bottom status bar | 26-34px |
| Ladder row | 24-30px |
| Left market rail | 220-280px |
| Right risk rail | 300-380px |
| Button min height | 28-34px |
| Critical action height | 36-44px |

## Shell regions

1. Top command bar.
2. Left market rail.
3. Central ladder workspace.
4. Right risk/order rail.
5. Bottom status/audit bar.

## Mode badges

States:

- `DISABLED`: neutral blocked state;
- `PAPER`: simulated, safe default;
- `LIVE_DRY_RUN`: warning/testing;
- `LIVE`: high-visibility live state;
- `BLOCKED`: live disabled by gate;
- `KILL_SWITCH`: dominant block.

## Ladder row

Each row should support:

- bid size;
- price;
- ask size;
- best bid/ask marker;
- own order marker;
- hover preview;
- disabled/blocked state;
- recent update flash if implemented.

## Motion

Allowed:

- short status fades;
- subtle row update flash;
- panel slide/fade;
- focus ring transition.

Forbidden:

- animated backgrounds;
- confetti;
- casino effects;
- constantly moving rows;
- motion that hides price changes.

## Component library policy

Default to custom CSS/tokens and small reusable primitives.

Optional: use Fluent UI React primitives for buttons, inputs, menus, dialogs, and focus behavior if they do not make the app look like Microsoft 365 or an admin console.

Avoid importing generic dashboard templates.
