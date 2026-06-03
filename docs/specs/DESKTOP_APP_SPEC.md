# Desktop App Specification

## Status

Draft for Codex implementation.

## Objective

Build a Windows-oriented Tauri desktop app that demonstrates a real, live-ready prediction-market betting ladder.

## Required screens for final 40-hour demo

### Main terminal screen

Required:

- top status strip;
- selected provider and market;
- market connection status;
- execution mode indicator;
- legal/live gate indicator;
- kill switch;
- central ladder;
- stake presets;
- one-click arm/disarm control;
- order intent preview;
- order blotter;
- audit log/status bar.
- global/provider/market financial metrics.

### Settings / live gate panel

Required:

- execution mode selector;
- live gate checklist;
- credentials status, never raw secrets;
- max stake/exposure settings;
- account metrics status;
- audit log status;
- legal approval status.

## Component responsibilities

| Component | Responsibility | Forbidden |
|---|---|---|
| AppShell | arrange desktop panels and status surfaces | trading decisions |
| LadderGrid | display price/depth/user orders and emit intents | SDK calls, legal decisions |
| StakeControls | select/validate stake input state | live submission |
| ExecutionModeBanner | display mode and blockers | hiding live state |
| RiskPanel | show validation results and limits | approving C1/C0 risks |
| OrderBlotter | show order lifecycle and cancel affordance | fake fills |
| AuditLogPanel | show local audit events | secrets/raw keys |
| SettingsPanel | edit local non-secret settings | storing server-side secrets |
| MetricsPanel | display global/provider/market PnL, available funds, open-order amount, and exposure | fake metrics, cross-currency aggregation without policy |

## Minimum state coverage

- no market selected;
- loading market data;
- connected;
- stale data;
- disconnected;
- paper mode;
- live dry-run;
- live blocked;
- live armed;
- order pending;
- order rejected;
- order cancelled;
- live gate missing approval;
- credential missing;
- geoblock unknown/blocked;
- kill switch active.

## Acceptance criteria

- App feels like a desktop terminal, not landing page UI.
- Ladder is central and usable with real provider data, or with honest loading/empty/error states before provider data is available.
- Live mode cannot be confused with paper/dry-run.
- Risk and gate states are permanently visible.
- Financial metrics are visible or explicitly unknown; no fake PnL/balance/exposure.
- UI does not contain live trading implementation directly.
- Accessibility basics exist: focus, labels, contrast, keyboard reachability.
- Review with `tauri-ux-quality-review` passes or produces a prioritized fix list.

## Security boundary

Tauri implementation must follow `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`. Renderer code must not access secrets, unrestricted filesystem/shell APIs, provider SDKs, or live execution adapters directly.
