# Live Execution Specification

Status: implementation source of truth for live-ready execution. Real live execution is blocked by default.

## Goal

Implement a live-ready order flow for both Polymarket and Kalshi that can place and cancel a small provider-specific limit order only if every gate passes for the selected provider. The intended live target is a real gated place/cancel smoke test; if a live gate cannot pass, the demonstrable fallback is real Polymarket and Kalshi market data plus live-dry-run with exact blocked gate reporting.

## Execution modes

```ts
type ExecutionMode = "disabled" | "paper" | "live_dry_run" | "live";
```

## Demo target

Primary live-capability target:

```txt
real Polymarket and Kalshi market data
  -> order intent
  -> risk/legal/geo/credential validation
  -> real live place/cancel if all gates pass
  -> audit log
  -> exact blocked/approved gate shown
```

Fallback target if any live gate is blocked:

```txt
real Polymarket and Kalshi market data
  -> order intent
  -> risk/legal/geo/credential validation
  -> live-dry-run or paper
  -> audit log
  -> exact blocked gate shown
```

## Order lifecycle

```txt
intent_created
  -> validated
  -> blocked | approved
  -> submitted | simulated | dry_run_completed
  -> open | filled | partially_filled | cancelled | rejected | unknown
```

## Live order preconditions

Risk-increasing live order submission requires:

- `ENABLE_LIVE_TRADING=true`;
- `LEGAL_GATE_STATUS=APPROVED`;
- non-committed local approval gate loaded and approved;
- legal gate approved;
- C0 risk clear;
- C1 risk accepted if applicable;
- target jurisdiction approved;
- provider geoblock/jurisdiction/platform eligibility check pass;
- approved local credential source available;
- max stake configured;
- max exposure configured;
- required account metrics available for the selected provider and market;
- risk policy pass;
- explicit live acknowledgement;
- one-click armed if one-click route is used;
- audit log enabled;
- kill switch off for risk-increasing actions;
- fee disclosure accepted if any paid routing path is enabled.

Cancellation is risk-reducing and remains allowed under kill switch if technically possible.

## Runtime approval source contract

Environment flags and committed Markdown are not sufficient approval. Any real live execution attempt must also load a non-committed local approval object, for example `LEGAL_APPROVAL_FILE=./.local/legal-gate.local.json` or an equivalent main-process provider.

Minimum required fields:

- `status`;
- `providerId`;
- `targetJurisdiction`;
- `operatorIdentity`;
- `approver`;
- `c0Review`;
- `c1RiskAcceptance`;
- `maxStakeFirstOrder`;
- `maxMarketExposure`;
- `geoblockResult`;
- `credentialSource`;
- `auditLog`;
- `approvedAt`.

This object must never be committed. If it is absent, malformed, stale, or incomplete, live execution remains blocked and the UI must show the exact missing gate.

## Fee disclosure and monetization

Billing is out of scope for the first implementation slice. Paid routing, provider attribution, builder fees, broker fees, and revenue-share routing are disabled by default.

If paid routing is enabled later, live order submission must show and audit a fee disclosure before submission. The disclosure must include provider, fee program, product fee rate, estimated product fee when available, platform fee estimate when available, and a note that fees may be additive and may be applied at match time.

Default technical-test behavior: no paid-routing code is attached and no monetization fee is charged.

## Adapter responsibilities

### PaperExecutionAdapter

- provide a local safety harness for order placement;
- provide a local safety harness for cancellation;
- preserve the same result shape as live;
- no network calls.

Paper and live-dry-run are safety harnesses, QA tools, and fallback modes. They must not be described as complete provider integration or accepted as a substitute for real Polymarket and Kalshi market-data adapters.

### LiveDryRunExecutionAdapter

- run all validations;
- construct the intended live payload shape if possible;
- do not submit to platform;
- log dry-run event;
- report exact blocker if any gate fails.

### Provider live execution adapters

- use authenticated provider trading flow for Polymarket and Kalshi;
- place BUY/long GTC-or-provider-equivalent limit order only in the first approved live smoke unless a later ADR expands scope;
- cancel order by ID;
- return explicit state;
- redact secrets in logs;
- never bypass platform restrictions;
- never make marketable/cross-spread execution reachable without a new approval.

Provider adapters must map provider-specific order directions, identifiers, price precision, fees, account balances, open orders, positions, and exposure into the shared domain contracts before risk validation approves live submission.

## Secret handling

- Do not commit `.env`.
- Do not log credentials.
- Do not send credentials to a backend.
- Renderer must never receive secrets.
- Public/product builds must use OS secure storage or an explicit local credential provider.
- Local `.env` is allowed only for controlled dev/smoke testing and must use `_LOCAL_DEV_ONLY` variable names. `.env.example` must keep `CREDENTIAL_SOURCE=none` as the safe default.

## Sources

- Polymarket authentication: https://docs.polymarket.com/api-reference/authentication
- Polymarket create order: https://docs.polymarket.com/trading/orders/create
- Polymarket geoblock: https://docs.polymarket.com/api-reference/geoblock
- Kalshi API docs must be validated before live execution implementation.
