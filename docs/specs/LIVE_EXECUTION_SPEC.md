# Live Execution Specification

Status: implementation source of truth for live-ready execution. Real live execution is blocked by default.

## Goal

Implement a live-ready order flow for both Polymarket and Kalshi that can place and cancel a small provider-specific limit order only if every gate passes for the selected provider. The intended live target is a real gated place/cancel smoke test; if a live gate cannot pass, the demonstrable fallback is real Polymarket and Kalshi market data plus live-dry-run with exact blocked gate reporting.

## Execution modes

```ts
type ExecutionMode = "disabled" | "paper" | "live_dry_run" | "live";
```

Goal 05 implementation note, 2026-06-04:

- `disabled` rejects risk-increasing order intents and audits the rejection.
- `paper` may create local paper order records only after domain validation
  passes; no provider network submission is made.
- `live_dry_run` runs live-style validation and audit logging but never submits
  externally.
- `live` remains blocked at the execution adapter boundary even if validation
  gates pass, because real provider submission belongs to the gated live
  execution goal.

Goal 06 partial implementation note, 2026-06-04:

- `packages/execution` now exposes a secret-safe `CredentialProvider`,
  non-committed `LocalApprovalGateProvider`, provider-neutral live
  place/cancel contracts, provider order id handling, provider rejection and
  network-error result mapping, and a `GatedLiveExecutionAdapter` covered by
  mocked provider-adapter tests.
- `apps/desktop/src-tauri` now registers narrow secret-free
  `live_gate_status`, `legal_approval_status`, `legal_approval_submit`,
  `order_submit_live`, and `order_cancel` commands. The live commands check
  app-managed legal approval state, local approval file state, credential
  source readiness, explicit acknowledgement, audit, kill switch, fresh
  selected order book, BUY/limit/GTC/non-marketable policy,
  stake/funds/exposure inputs, and provider support before any provider
  submission branch. `ENABLE_LIVE_TRADING` and `LEGAL_GATE_STATUS` remain
  controlled dev/smoke aliases, not normal user setup.
- The Tauri command path now has an internal provider runtime seam for
  place-limit and cancel operations. Unit tests inject a mocked Polymarket
  runtime to prove provider calls happen only after all live gates pass and to
  map mocked submit success, cancel success, provider rejection, and network
  error into secret-free command responses.
- The Tauri runtime now configures the Polymarket official Rust SDK live branch
  by default for the product path. It builds authenticated post-only
  BUY/limit/GTC place and cancel requests only after every live gate passes,
  app-managed local signer material is present in the Tauri process, and fresh
  authenticated provider-owned account metrics are loaded for the selected
  provider and market. Renderer-supplied funds/exposure values are not trusted
  for live approval. `POLYMARKET_LIVE_RUNTIME_MODE=disabled` is a controlled
  local-off switch; Kalshi live execution still returns
  `provider_live_adapter_not_configured`.
- Kalshi live trading remains blocked pending an authenticated provider live
  execution adapter even though the credential-safe signed account metrics path
  is now implemented in Tauri.
- No real orders were submitted by this Goal 06 slice.

Goal 07 implementation note, 2026-06-04:

- `apps/desktop/src-tauri` now exposes secret-free
  `provider_onboarding_status`, `provider_connect_account`, and
  `live_preflight_status` commands. These commands report exact per-provider
  ready/blocked reasons for credentials, account metrics, legal/geo/runtime
  gates, fresh book state, explicit acknowledgement, kill switch, and
  non-marketable smoke policy without returning secrets.
- Polymarket onboarding supports a non-custodial signer import source for CLOB
  auth. Tauri reads the source once, rejects seed-like material, stores an
  encrypted app-managed local copy, and later uses that local copy for CLOB auth
  and order signing. The renderer never receives signer material, auth headers,
  signatures, signed payloads, or a full account identifier.
- The normal Polymarket operator flow is a Magic/export-assisted import for
  email/Magic accounts: the desktop app opens the allowlisted
  `https://reveal.magic.link/polymarket` URL in the system browser, the operator
  copies the revealed signer, and Tauri imports it from the OS clipboard in the
  main process. React never receives the copied key, and the clipboard is
  cleared after a successful import. Manual local signer file paths remain an
  advanced compatibility/dev-smoke fallback.
- Polymarket account readiness must treat pUSD as the current collateral
  blocker surface where provider responses expose it. Missing pUSD balance,
  allowance, funder, or deposit-wallet setup remains a Polymarket-side blocker;
  the desktop app does not deposit, withdraw, wrap, unwrap, or bypass platform
  restrictions.
- Kalshi onboarding supports API Key ID plus a one-time local `.key` import
  source. Tauri validates the unencrypted RSA key, stores an encrypted
  app-managed local copy, and signs portfolio requests only in the main process;
  the renderer never receives key material or passphrases.
- Credential profile metadata and app-managed encrypted credential material are
  stored through the explicit local secure provider under OS app data by
  default. `.local` files and env vars remain controlled dev/smoke fallbacks,
  not the normal product path.
- Real live submission remains blocked unless authenticated provider-owned
  account metrics and the selected provider live adapter are ready. Polymarket
  now has a Tauri-owned account metrics runtime that uses the local signer to
  authenticate CLOB account reads, loads balance/allowance plus open orders,
  reads wallet positions through the provider-owned data API, and returns only
  secret-free normalized amounts to React/preflight. Kalshi now has a
  Tauri-owned RSA-PSS signed portfolio metrics runtime that loads USD balance,
  resting orders, and positions through the documented Trade API portfolio
  endpoints without exposing private-key material, auth headers, signatures,
  signed payloads, full account identifiers, or raw provider payloads to React.
  Provider live adapter readiness can still return
  `provider_live_adapter_not_configured`, and `.local/account-metrics.local.json`
  is not normal user setup.

Goal 07 legal onboarding follow-up, 2026-06-05:

- `apps/desktop/src-tauri` now exposes secret-free `legal_approval_status` and
  `legal_approval_submit`. The renderer submits only non-secret legal
  responsibility fields plus a single explicit acknowledgement that expands to
  the full declaration set; Tauri still validates provider, target
  jurisdiction, real operator/approver, positive stake/exposure caps, each
  C0/C1 approval declaration, no geoblock/VPN/fake-KYC/sanctions bypass,
  no-custody posture, audit, no deposit/withdrawal, and first-smoke policy
  before writing the non-committed local approval file.
- A valid app-managed local approval now satisfies the legal/live-enable
  approval source for the product path. `ENABLE_LIVE_TRADING=true` and
  `LEGAL_GATE_STATUS=APPROVED` remain controlled dev/smoke aliases only.
- React can open and submit the localized legal approval modal, show
  secret-free reason codes, and use the same explicit acknowledgement to mark
  the first-live-smoke session acknowledgement. The provider onboarding wizard
  opens this approval flow automatically after credentials are imported and
  ready. React now exposes only a narrow Tauri command client for
  `order_submit_live` and `order_cancel`; it has no provider SDK, credential,
  signature, auth-header, or direct network path and cannot bypass Tauri-side
  gates.

Goal 07 open-live-order follow-up, 2026-06-05:

- The desktop right rail now exposes a gated "create live order" action once
  the selected provider preflight is ready and a validated BUY non-marketable
  limit/GTC intent exists. The action calls `order_submit_live` through Tauri
  and does not auto-cancel successful submissions. If a provider order id is
  returned, the app records a local session open-order row and exposes
  cancellation as an explicit manual `order_cancel` action by id. Polymarket no
  longer reports
  `provider_live_adapter_not_configured` solely because an env var is absent;
  Kalshi live placement remains blocked until its live adapter is implemented.

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

- app-managed legal approval loaded and approved for the selected provider, or
  controlled dev/smoke aliases explicitly approved;
- non-committed local approval gate loaded and approved;
- legal gate approved;
- C0 risk clear;
- C1 risk accepted if applicable;
- target jurisdiction approved;
- provider geoblock/jurisdiction/platform eligibility check pass;
- approved local credential source available;
- provider onboarding credential status ready for the selected provider;
- max stake configured;
- max exposure configured;
- required account metrics available for the selected provider and market;
- Tauri-owned authenticated provider account metrics ready for the exact
  provider and market, including balance/funds, positions, open orders,
  provider exposure, and market exposure;
- `live_preflight_status` for the selected provider reports no blockers;
- risk policy pass;
- explicit live acknowledgement;
- one-click armed if one-click route is used;
- audit log enabled;
- kill switch off for risk-increasing actions;
- fee disclosure accepted if any paid routing path is enabled.

Cancellation is risk-reducing and remains allowed under kill switch if technically possible.

## Runtime approval source contract

Environment flags and committed Markdown are not sufficient approval. Normal product builds create approval through the localized desktop legal approval modal, which calls Tauri `legal_approval_submit`. Any real live execution attempt must then load the app-managed non-committed local approval object, for example `LEGAL_APPROVAL_FILE=./.local/legal-gate.local.json` or an equivalent main-process provider. Normal users must not hand-edit this file or environment variables.

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

The account metrics values source must also be Tauri-owned and authenticated by
the selected provider. For the Goal 06/07 slices the Tauri process may still
load `LOCAL_ACCOUNT_METRICS_FILE`, defaulting to
`.local/account-metrics.local.json`, only as a controlled dev/smoke bridge. The
normal product path must use provider-owned balance/funds, positions,
open-order, provider-exposure, and market-exposure reads. If the provider-owned
adapter is missing, stale, mismatched, or unavailable, live submit is blocked
with an exact `account_metrics_*` reason.

Goal 07 account-metrics follow-up, 2026-06-04: Polymarket provider-owned
metrics are attempted before the dev/smoke local JSON fallback whenever a ready
Tauri-owned credential profile exists. The fallback is used only when the
provider metrics runtime is explicitly unavailable and the controlled
dev/smoke source gate is enabled. Provider rejection, credential rejection,
network failure, malformed payloads, and invalid provider URLs map to
secret-free blocker reasons. Kalshi provider-owned metrics are also attempted
through a Tauri-owned RSA-PSS signed portfolio client whenever a ready local
Kalshi credential profile exists. The signed client uses the documented
`KALSHI-ACCESS-*` headers, signs the `/trade-api/v2/...` path without query
parameters, reads balance/funds, positions, and resting orders, and maps missing
credentials, provider credential rejection, network failure, malformed payloads,
and invalid provider URLs to exact secret-free blockers.

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
- in Goal 05, create `paper-*` local order records only; do not label them as
  provider orders.

Paper and live-dry-run are safety harnesses, QA tools, and fallback modes. They must not be described as complete provider integration or accepted as a substitute for real Polymarket and Kalshi market-data adapters.

### LiveDryRunExecutionAdapter

- run all validations;
- construct the intended live payload shape if possible;
- do not submit to platform;
- log dry-run event;
- report exact blocker if any gate fails.
- in Goal 05, return a local dry-run check with `wouldSubmitExternally=false`;
  no provider payload is signed or sent.

### Provider live execution adapters

- use authenticated provider trading flow for Polymarket and Kalshi;
- place BUY/long GTC-or-provider-equivalent limit order only in the first approved live smoke unless a later ADR expands scope;
- cancel order by ID;
- return explicit state;
- redact secrets in logs;
- never bypass platform restrictions;
- never make marketable/cross-spread execution reachable without a new approval.

Provider adapters must map provider-specific order directions, identifiers, price precision, fees, account balances, open orders, positions, and exposure into the shared domain contracts before risk validation approves live submission.

The shared domain contracts are established before live work in Goal 04A:
`TradableMarketRef`, normalized order states, fills, fees, balances, positions,
and settlement status. Live adapters must consume those contracts rather than
making either Polymarket or Kalshi the default execution model.

Goal 06 sequencing: the shared live adapter contract is implemented and tested
with mocked provider adapters, and the Tauri command boundary now has a tested
provider runtime seam for place-limit/cancel behavior. Polymarket has the first
dormant official SDK branch behind explicit runtime mode, local signer material,
local approval, credential, account-metrics-source, risk, audit, and explicit
acknowledgement gates. Kalshi real trading is still blocked until its
authenticated live execution adapter is implemented, even though its signed
account metrics path is now implemented. Neither branch may expose secrets to
the renderer.

Goal 07 account-metrics sequencing: Polymarket account metrics now use the
Tauri-owned authenticated provider runtime, and Kalshi account metrics now use
the Tauri-owned RSA-PSS signed portfolio runtime. Real live execution still
requires all legal, geo, credential, local approval, account metrics, risk,
audit, acknowledgement, kill-switch, non-marketable, and provider-adapter gates
to pass.

## Secret handling

- Do not commit `.env`.
- Do not log credentials.
- Do not send credentials to a backend.
- Renderer must never receive secrets.
- Public/product builds must use OS secure storage or an explicit local credential provider.
- Local `.env` is allowed only for controlled dev/smoke testing and must use `_LOCAL_DEV_ONLY` variable names. `.env.example` must keep `CREDENTIAL_SOURCE=none` as the safe default.
- Polymarket signer material and Kalshi private-key material are
  Tauri-process-only and must never be sent to React, committed, logged, or
  treated as renderer state. The renderer may collect one-time non-secret local
  import source references and Kalshi API Key IDs for onboarding, but all
  material reading, validation, encryption, decryption, and signing stays in
  Tauri/main process.

## Sources

- Polymarket authentication: https://docs.polymarket.com/api-reference/authentication
- Polymarket create order: https://docs.polymarket.com/trading/orders/create
- Polymarket geoblock: https://docs.polymarket.com/api-reference/geoblock
- Kalshi API keys and RSA-PSS signing: https://docs.kalshi.com/getting_started/api_keys
- Kalshi balance endpoint: https://docs.kalshi.com/api-reference/portfolio/get-balance
- Kalshi positions endpoint: https://docs.kalshi.com/api-reference/portfolio/get-positions
- Kalshi orders endpoint: https://docs.kalshi.com/api-reference/orders/get-orders
