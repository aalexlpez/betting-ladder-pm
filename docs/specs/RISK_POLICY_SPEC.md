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
};
```

## Mandatory rejection reasons

- `execution_disabled`;
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
- `insufficient_available_funds`;
- `provider_exposure_unknown`;
- `market_exposure_unknown`;
- `marketable_order_not_approved`;
- `position_unknown`;
- `c0_risk_detected`;
- `fee_disclosure_missing`.

## Live trading gates

Live trading remains blocked by default unless all gates pass:

- legal gate approved;
- jurisdiction/geoblock pass;
- credential source ready;
- local approval state loaded and approved;
- max stake configured;
- max exposure configured;
- required account, provider, and market exposure metrics available;
- C0 clear;
- C1 human approval if required;
- explicit live acknowledgement;
- audit log enabled;
- fee disclosure accepted when paid routing is enabled;
- kill switch off for risk-increasing action.

Live must not be reachable by flipping one casual flag. Runtime must require multiple independent checks.

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
- one-click rejected when not armed;
- kill switch blocks risk-increasing actions;
- kill switch allows cancellation;
- stake above limit rejected;
- exposure above limit rejected;
- unknown available funds rejected for live risk-increasing action;
- unknown provider/market exposure rejected for live risk-increasing action;
- marketable/cross-spread order rejected unless approved;
- C0 blocks all live risk-increasing behavior.
