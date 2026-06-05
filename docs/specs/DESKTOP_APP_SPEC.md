# Desktop App Specification

## Status

Draft for Codex implementation.

Goal 04C implementation note, 2026-06-03: the main terminal screen now exposes
one unified market-data workflow. The left rail has one search form for
Polymarket/Kalshi results with compact venue badges, direct venue filters, and
bounded load-more/infinite-scroll pagination. The direct all/Polymarket/Kalshi
filters show visible result counts for the current unified list. A compact
per-venue diagnostic strip next to the unified search summary shows provider
status, connection mode, freshness, visible result count, next-page
availability, and the latest
provider message/error so partial Kalshi/Polymarket blockers remain visible
while browsing. Selecting
an outcome calls the Tauri `market_get_order_book` command and renders
normalized ladder levels when an official snapshot is available; the selection
also calls
`market_subscribe` and shows the returned stream state in the ladder header and
bottom strip. Execution controls remain disabled/gated, account metrics remain
unknown, and no order placement/cancellation path is exposed.

Ladder-first UI correction, 2026-06-04: the main terminal should not optimize
for a card/dashboard market board as the primary product shape. Unified market
search, venue filters, and infinite scroll are access tools. The central
workspace is the product: a Betfair-style vertical ladder with Back/Lay
liquidity cells, a central price column, stake presets next to the ladder,
visible one-click state, keyboard affordance placeholders, and neutral
price-column targets that preview price levels without placing orders.

Goal 05 implementation note, 2026-06-04: fresh provider-backed ladder Back/Lay
cells now create local order-intent previews. The renderer emits the UI intent
and displays state; deterministic validation lives in `@prediction-ladder/core`
and paper/live-dry-run handling plus redacted local audit logging live in
`@prediction-ladder/execution`. One-click remains off and cannot arm. The right
rail shows selected intent details, validation reasons, local paper order rows,
and recent redacted audit events. Paper confirmation creates local paper records
only; live dry-run checks never submit externally; live remains blocked with no
provider submission command or credential path.

Goal 06/07 implementation note: the right rail now models local approval,
explicit live acknowledgement, account metrics, and provider live-adapter
readiness as separate visible live blockers. Gate rows render exact reason
codes, and the order preview model exposes `canSubmitLive` only when a minimal
BUY/limit/GTC/non-marketable intent is approved and every selected-provider
Tauri gate is clear. The desktop gate model includes
`account_metrics_source_missing` so a renderer state with typed funds/exposure
cannot self-certify live readiness. The Tauri live commands exist as narrow
secret-free command boundaries. Polymarket live placement/cancel is configured
in the Tauri runtime by default but still requires app-managed signer material,
provider-owned account metrics, and every live gate before a provider call;
Kalshi live remains blocked with `provider_live_adapter_not_configured`.

Goal 06 audit correction, 2026-06-04: the renderer threads Tauri-owned blocker
reasons into the visible gate panel. The UI must render Tauri-side reasons such
as `tauri_command_bridge_unavailable`, `account_metrics_values_source_missing`,
`credential_source_missing`, and `local_approval_not_approved` as live blockers
even if the local renderer model appears ready.

Goal 07 implementation note, 2026-06-04: the right rail now includes compact
provider status cards that open a modal onboarding wizard for Polymarket and
Kalshi. The wizard links to official Polymarket CLOB/deposit-wallet
documentation and Kalshi API-key/profile documentation before collecting local
references. Follow-up UX correction, 2026-06-04: the normal product path is now
an app-managed secure import, not a permanent manual file path. Polymarket does
not provide a simple dashboard API-key download for this path; the operator
prepares a dedicated local signer import source through an approved
wallet/key-management workflow, and Tauri reads it once, rejects seed-like
material, then stores an encrypted app-managed local copy. Kalshi credentials
come from Profile Settings / API Keys / Create New API Key, where the operator
copies the Key ID and saves the one-time key download; Tauri imports that file
once, validates the RSA key, and stores an encrypted app-managed local copy.
Legacy/manual local file references remain compatibility/dev-smoke fallback
behavior rather than the normal operator path. The renderer can display
credential/account-metrics/preflight status and exact blocker reasons, but it
never receives private keys, API secrets, passphrases, auth headers, signatures,
signed payloads, provider SDK objects, raw provider payloads, or full
wallet/account identifiers. The order preview model consumes Tauri-owned
`live_preflight_status` blockers so React cannot self-certify live readiness.
Metrics display Tauri-returned account metric values only when preflight marks
them ready, including authenticated available funds, open-order amount,
provider exposure, and market exposure. Otherwise they remain unknown with
explicit reasons. Polymarket account metrics may now come from the Tauri-owned
provider runtime; Kalshi account metrics may now come from the Tauri-owned
RSA-PSS signed portfolio runtime. React exposes only a Tauri command bridge for
`order_submit_live`/`order_cancel`, not direct provider execution, and provider
live adapter readiness can still block live even when account metrics are
ready.

Goal 07 legal onboarding follow-up, 2026-06-05: the right rail now includes a
localized legal approval panel and modal. The operator completes target
jurisdiction, real operator identity, approver/risk owner, first-order stake
cap, and market exposure cap, reviews all C0/C1/no-bypass/no-custody/no-deposit
declarations, and confirms them with one explicit acknowledgement. Tauri owns
`legal_approval_status` and `legal_approval_submit`, expands that
acknowledgement to the required declaration booleans, writes the non-committed
local approval file, and returns only secret-free readiness/reason codes. The
provider onboarding wizard opens this legal/local approval flow automatically
after the selected provider credentials are imported and ready. The UI also
uses that acknowledgement as the explicit live-order policy session
acknowledgement.

Goal 07 open-live-order follow-up, 2026-06-05: the right rail now exposes a
disabled-by-default "create live order" action. It becomes available only in
live mode, with a validated BUY/non-marketable limit/GTC intent,
selected-provider preflight ready, fresh official book, legal/local approval,
credential readiness, account metrics, audit, kill switch off, and explicit
acknowledgement. The button calls Tauri `order_submit_live` and does not
auto-cancel if a provider order id is returned. Successful live submissions are
shown as local session open-order rows with a separate manual `order_cancel`
action by provider order id.

## Objective

Build a Windows-oriented Tauri desktop app that demonstrates a real, live-ready prediction-market betting ladder.

## Required screens for final 40-hour demo

### Main terminal screen

Required:

- top status strip;
- selected market plus compact provider/venue badge;
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
- unified market search/list across Polymarket and Kalshi.
- bounded load-more/infinite-scroll access for additional provider-backed markets.
- per-venue market-search diagnostics beside the unified search summary.

### Settings / live gate panel

Required:

- execution mode selector;
- live gate checklist;
- credentials status, never raw secrets;
- provider account onboarding status for Polymarket and Kalshi;
- secret-free live preflight status with exact per-provider blockers;
- app-managed local legal approval status;
- explicit first-live acknowledgement state;
- max stake/exposure settings;
- account metrics status;
- audit log status;
- legal approval status.

## Component responsibilities

| Component | Responsibility | Forbidden |
|---|---|---|
| AppShell | arrange desktop panels and status surfaces | trading decisions |
| LadderGrid | display Back/price/Lay depth, user orders, and intent targets | SDK calls, legal decisions, direct live submission |
| StakeControls | select stake input state near the ladder for preview/local validation | live submission |
| ExecutionModeBanner | display mode and blockers | hiding live state |
| RiskPanel | show validation results and limits | approving C1/C0 risks |
| ProviderOnboardingPanel | show provider credential/account status and open the modal onboarding wizard for one-time secure import sources | seed phrases, private keys, API secrets, passphrases, auth signatures, signed payloads, full account identifiers |
| LegalApprovalPanel | show legal/local approval status and open the localized responsibility checklist that Tauri validates and persists locally | accepting C0 risk, bypassing platform restrictions, making legal decisions for the operator, exposing live submit |
| OrderBlotter | show local paper order lifecycle and future cancel affordance | fake fills, provider-order claims for paper rows |
| AuditLogPanel | show local redacted audit events | secrets/raw keys, raw provider payloads |
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
- provider account onboarding blocked;
- authenticated account metrics missing/stale/provider-not-configured;
- geoblock unknown/blocked;
- kill switch active.

## Acceptance criteria

- App feels like a desktop terminal, not landing page UI.
- Ladder is central and usable with real provider data, or with honest loading/empty/error states before provider data is available.
- Market discovery feels like one product surface across venues; provider is visible as metadata, not as a primary app mode.
- Partial provider blockers are visible beside the market list and cannot be hidden behind an aggregate success message.
- Live mode cannot be confused with paper/dry-run.
- Risk and gate states are permanently visible.
- Financial metrics are visible or explicitly unknown; no fake PnL/balance/exposure.
- UI does not contain live trading implementation directly.
- Accessibility basics exist: focus, labels, contrast, keyboard reachability.
- Review with `tauri-ux-quality-review` passes or produces a prioritized fix list.

## Security boundary

Tauri implementation must follow `docs/architecture/TAURI_SECURITY_AND_COMMAND_SPEC.md`. Renderer code must not access secrets, unrestricted filesystem/shell APIs, provider SDKs, or live execution adapters directly.
