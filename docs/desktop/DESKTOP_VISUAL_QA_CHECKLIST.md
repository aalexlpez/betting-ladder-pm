# Desktop Visual QA Checklist

Use this checklist after the first Tauri desktop UI is implemented.

## Screenshots to capture when feasible

- Initial app launch.
- Mock market with ladder populated.
- Paper mode order intent preview.
- Live dry-run mode with gates visible.
- Live blocked state.
- Kill switch active state.
- Stale/disconnected market data state.
- Rejected order state.
- Settings/live gate panel.
- 1280x820 and 1440x900 window sizes.

## Visual pass criteria

The reviewer should understand within 5 seconds:

1. This is a Windows desktop trading terminal.
2. The selected provider and market are visible.
3. The ladder is the central workspace.
4. The current execution mode is paper, dry-run, live-blocked, or live.
5. One-click is off or armed.
6. Legal/geo/credential/risk gates are visible.
7. There is a clear path to cancel/observe orders.
8. The app is not a generic SaaS dashboard.

## Failure patterns

Flag as FAIL:

- blank Tauri window;
- ladder not central;
- generic dashboard cards dominate the screen;
- live/paper state hidden or ambiguous;
- one-click state ambiguous;
- kill switch missing;
- legal/geo/credential gate hidden;
- secrets visible;
- fake trading metrics or fake PnL;
- missing or fake provider/account metrics;
- fake exchange logos or competitor screenshots;
- illegible dense table;
- no focus state;
- disabled/rejected/pending states missing.

## Accessibility checks

- Keyboard focus visible.
- Main controls reachable by keyboard.
- Contrast acceptable for dense numbers.
- Text labels do not rely on color only.
- Motion/animation is minimal and not required to understand state.

## Output

Record:

- screenshot method;
- screenshots captured or why unavailable;
- pass/fail by state;
- top fixes before demo;
- whether visual QA is complete, partial, or blocked.
