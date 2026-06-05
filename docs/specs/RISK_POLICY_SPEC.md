# Risk Policy Specification

Status: implementation source of truth for risk validation.

## Goals

- Prevent accidental live orders.
- Prevent live orders when legal/geo/credential gates are not approved.
- Prevent excessive exposure.
- Prevent live risk-increasing actions when required account metrics are unknown.
- Prevent one-click trading unless explicitly armed.
- Keep criminal/severe compliance risk near zero.
- Allow risk-reducing cancellation even when the kill switch is active.

## Risk classes

```ts
type RiskClass = "C0" | "C1" | "C2" | "C3";
type ProviderId = "polymarket" | "kalshi";
```

| Class | Behavior |
|---|---|
| C0 | Absolute no-go. Block live behavior and require human review. |
| C1 | Block live unless human business-owner approval exists. |
| C2 | Block or degrade based on configured safety gate. |
| C3 | Normal product/economic risk. |

## Action classes

### Risk-increasing actions

- new order;
- one-click order;
- increasing order size;
- increasing market exposure;
- marketable/cross-spread execution;
- enabling live mode;
- raising limits.

### Risk-reducing actions

- cancel order;
- cancel all;
- close/reduce exposure if explicitly implemented later and proven by adapter;
- read open orders;
- write/read audit logs.

## Kill switch policy

The kill switch must block risk-increasing actions.

The kill switch must still allow cancellation and audit logging unless there is a stronger technical reason. If cancellation is unavailable, return `cancel_unavailable` and show it in the UI.

## Risk guard input

```ts
type RiskGuardInput = {
  executionMode: ExecutionMode;
  actionClass: "risk_increasing" | "risk_reducing" | "read_only";
  orderIntent?: OrderIntent;
  legalGate: LegalGateStatus;
  geoGate: GeoGateStatus;
  credentialStatus: CredentialStatus;
  localApprovalStatus: LegalGateStatus;
  oneClickArmed: boolean;
  firstLiveAck: boolean;
  killSwitchActive: boolean;
  maxStakePerOrder: DecimalString;
  maxMarketExposure: DecimalString;
  currentMarketExposure: DecimalString;
  openOrderExposure: DecimalString;
  availableFunds: DecimalString | "unknown";
  providerExposure: Record<ProviderId, DecimalString | "unknown">;
  marketExposure: Record<string, DecimalString | "unknown">;
  accountMetricsSourceStatus: "ready" | "missing" | "provider_not_configured";
  livePreflightStatus?: "ready" | "blocked";
};
```

## Mandatory rejection reasons

- `execution_disabled`;
- `market_not_selected`;
- `order_book_not_fresh`;
- `price_not_aligned_to_tick`;
- `stake_not_configured`;
- `kill_switch_active_for_risk_increasing_action`;
- `legal_gate_not_approved`;
- `c1_approval_missing`;
- `geo_blocked`;
- `geo_unknown`;
- `credentials_missing`;
- `local_approval_missing`;
- `one_click_not_armed`;
- `first_live_ack_missing`;
- `stake_exceeds_limit`;
- `exposure_exceeds_limit`;
- `available_funds_unknown`;
- `account_metrics_source_missing`;
- `account_metrics_provider_not_configured`;
- `account_metrics_market_not_selected`;
- `account_metrics_network_error`;
- `account_metrics_payload_invalid`;
- `account_metrics_provider_rejected`;
- `account_metrics_provider_url_invalid`;
- `provider_credentials_required`;
- `insufficient_available_funds`;
- `provider_exposure_unknown`;
- `market_exposure_unknown`;
- `marketable_order_not_approved`;
- `position_unknown`;
- `c0_risk_detected`;
- `fee_disclosure_missing`.
- `audit_log_not_enabled`;
- `order_intent_missing`;

## Live trading gates

Live trading remains blocked by default unless all gates pass:

- legal gate approved;
- jurisdiction/geoblock pass;
- credential source ready;
- provider onboarding credential status ready for the selected provider;
- app-managed legal/local approval state loaded and approved for the selected provider;
- max stake configured;
- max exposure configured;
- required account, provider, and market exposure metrics available;
- authenticated provider-owned account metrics ready in the privileged runtime;
- secret-free `live_preflight_status` ready for the selected provider;
- C0 clear;
- C1 human approval if required;
- explicit live acknowledgement;
- audit log enabled;
- fee disclosure accepted when paid routing is enabled;
- kill switch off for risk-increasing action.

Live must not be reachable by flipping one casual flag. Runtime must require multiple independent checks.

Goal 06 partial implementation note, 2026-06-04:

- Core risk validation still owns deterministic rejection reasons for order
  intents.
- The desktop gate model now separately displays `local_approval_missing`,
  `first_live_ack_missing`, `account_metrics_source_missing`,
  `available_funds_unknown`, `provider_exposure_unknown`,
  `market_exposure_unknown`, and `provider_live_adapter_not_configured` so the
  live button remains disabled until every modeled gate is clear. The live mode
  itself is selectable for operator review, but the live smoke button remains
  disabled until Tauri preflight for the selected provider reports no blockers.
- The Tauri `order_submit_live` command repeats live runtime gate checks before
  any provider branch and blocks marketable, non-BUY, non-limit, non-GTC,
  missing privileged account-metrics source, missing funds/exposure, stale-book,
  kill-switch, credential, legal, and local approval failures.
- The Goal 06 audit correction makes funds/exposure approval Tauri-owned:
  renderer-supplied account numbers do not approve live submit. Tauri must load
  fresh non-committed account metrics values for the exact provider/market, then
  uses those values for available-funds, projected exposure, and local approval
  exposure-cap checks.
- The Tauri provider-runtime seam is tested so a provider place-limit call is
  not made when any command/runtime gate rejects the intent. Cancellation is
  separately tested as risk-reducing but still credential-gated until a real
  provider adapter exists.

Goal 07 implementation note, 2026-06-04:

- Tauri now models provider onboarding and live preflight as first-class live
  blockers. Polymarket credential blockers include missing/invalid signer
  import sources, missing/invalid app-managed encrypted credential material, and
  `seed_phrase_not_allowed`; Kalshi credential blockers include missing API Key
  ID, missing/invalid one-time `.key` import sources, missing/invalid
  app-managed encrypted credential material, and encrypted/passphrase-dependent
  key files.
- Account metrics must come from authenticated provider-owned sources in the
  normal product path. Polymarket account metrics now use the Tauri-owned
  authenticated provider runtime before any dev/smoke fallback: CLOB
  balance/allowance, CLOB open orders, and provider data API positions are
  normalized into secret-free funds, open-order amount, provider exposure, and
  market exposure. Kalshi account metrics now use a Tauri-owned RSA-PSS signed
  portfolio runtime before any dev/smoke fallback: USD balance, resting orders,
  and market positions are normalized into secret-free funds, open-order
  amount, provider exposure, and market exposure. The old local metrics file
  remains a dev/smoke fallback only.
- `live_preflight_status` groups Tauri-side blockers into legal/geo,
  credential, account metrics, book/market, risk policy, and runtime gates so
  the UI can show exact reasons while React still cannot authorize live submit.

Goal 07 open-live-order follow-up, 2026-06-05:

- React now has a secret-free Tauri bridge for open live order submission and
  manual cancellation, but risk authority remains in Tauri. The UI can request a
  BUY-only limit/GTC/non-marketable submit only after a validated intent and
  selected-provider preflight are ready; `order_submit_live` still reloads
  provider-owned account metrics and repeats legal, geo, credential, market,
  stake, exposure, audit, acknowledgement, kill-switch, non-marketable, and
  adapter gates before any provider call. If the provider returns an order id,
  cancellation is exposed as a separate manual `order_cancel` action.

Goal 07 legal onboarding follow-up, 2026-06-05:

- Legal/local approval is now created through a localized desktop modal and
  persisted by Tauri through `legal_approval_submit`; normal operators do not
  edit `.local/legal-gate.local.json`, `LEGAL_GATE_STATUS`, or
  `ENABLE_LIVE_TRADING` to pass this gate.
- The approval captures target jurisdiction, real operator/approver,
  stake/exposure caps, C0 clear, C1 accepted/not-required, no
  geoblock/VPN/fake-KYC/sanctions bypass, no custody, audit enabled, no
  deposit/withdrawal behavior, and BUY-only tiny limit/GTC/post-only
  non-marketable first-smoke policy. The desktop UI may present those
  declarations behind one explicit acknowledgement for usability, but the
  Tauri command still receives and validates each required declaration boolean.
  Missing acknowledgement or declaration data maps to exact `legal_*` blocker
  reasons.

## Default limits

- `MAX_STAKE_PER_ORDER=5` for first live smoke unless changed by human approval.
- `MAX_MARKET_EXPOSURE=25` for first live smoke unless changed by human approval.
- One-click off by default.
- Live off by default.

## Test cases

- paper mode order accepted when risk limits pass;
- live-dry-run validates but does not submit;
- live mode rejected when legal gate missing;
- live mode rejected when geoblock unknown;
- live mode rejected when credentials missing;
- live mode rejected when local approval state is missing;
- legal approval submit rejected when required fields or responsibility checks are missing;
- one-click rejected when not armed;
- kill switch blocks risk-increasing actions;
- kill switch allows cancellation;
- stake above limit rejected;
- exposure above limit rejected;
- unknown available funds rejected for live risk-increasing action;
- missing privileged account metrics source rejected for live risk-increasing action;
- provider-owned account metrics adapter missing rejected for live risk-increasing action;
- missing or stale Tauri-owned account metrics values rejected for live risk-increasing action;
- missing or invalid Polymarket/Kalshi credentials rejected before live risk-increasing action;
- unknown provider/market exposure rejected for live risk-increasing action;
- marketable/cross-spread order rejected unless approved;
- C0 blocks all live risk-increasing behavior.
