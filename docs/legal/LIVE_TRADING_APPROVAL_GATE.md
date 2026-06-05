# Live Trading Approval Gate

Live trading is disabled until this approval is completed by the responsible human business owner through the desktop legal onboarding flow. Tauri then writes the non-committed local runtime approval file. Normal operators must not hand-edit `.local/*.json` or environment variables to pass this gate.

This Markdown template documents the required fields. It is necessary but not sufficient. Runtime must still check app-managed legal approval state, jurisdiction/geoblock, credential source, risk limits, C0/C1 status, audit logging, explicit UI acknowledgement, kill switch state, account metrics, fresh market data, non-marketable policy, and provider adapter readiness.

## Status

- Current status: `NOT_APPROVED`
- Last reviewed: 2026-06-02
- Live trading allowed: `NO`

## Required approvals

| Item | Required answer | Current answer |
|---|---|---|
| Provider | Polymarket / Kalshi | TBD |
| Target jurisdiction for smoke test | specific country/region | TBD |
| Operator identity | real person/entity | TBD |
| Beneficial owners | real persons | TBD |
| Account/wallet owner | real and authorized | TBD |
| Legal reviewer / risk owner | named person | TBD |
| C0 review result | PASS | TBD |
| C1 risk acceptance | APPROVED / NOT REQUIRED | TBD |
| Max stake first order | numeric | TBD |
| Max market exposure | numeric | TBD |
| Geoblock result | PASS | TBD |
| Credential storage | local secure provider or local dev smoke-test only | TBD |
| Audit log | enabled | TBD |
| Local approval file | non-committed local runtime file | TBD |

## Required non-committed runtime approval shape

The application must not rely only on this committed Markdown file. Before real live execution, it must load local approval state written by the Tauri `legal_approval_submit` command. The file may be read from `LEGAL_APPROVAL_FILE`, defaulting to `./.local/legal-gate.local.json`, but that path is an app-managed local output and dev/smoke fallback, not a normal user editing surface.

Minimum required fields:

```json
{
  "status": "APPROVED",
  "providerId": "polymarket",
  "targetJurisdiction": "<specific jurisdiction>",
  "operatorIdentity": "<real authorized operator>",
  "approver": "<responsible human>",
  "c0Review": "PASS",
  "c1RiskAcceptance": "APPROVED_OR_NOT_REQUIRED",
  "maxStakeFirstOrder": "5",
  "maxMarketExposure": "25",
  "geoblockResult": "PASS",
  "credentialSource": "os_secure_storage_or_explicit_local_provider_or_local_env_dev_only",
  "auditLog": "enabled",
  "approvedAt": "<ISO timestamp>"
}
```

The local file must not be committed. `.local/` is gitignored.

Goal 07 legal onboarding follow-up, 2026-06-05: the desktop app now exposes a localized legal approval modal in the right risk rail and opens it automatically as the final provider-onboarding step after credentials are imported and ready. The operator selects the current provider context, enters target jurisdiction, real operator identity, responsible approver, first-order stake cap, market exposure cap, reviews every required C0/C1/no-bypass/no-custody/no-deposit-withdrawal/live-smoke declaration, and confirms the full set with one explicit acknowledgement. Tauri still validates each declaration boolean, writes the app-managed local approval file, and reports secret-free `legal_approval_status`. A valid local approval now satisfies the legal/live-enable approval source for the product path; `LEGAL_GATE_STATUS=APPROVED` and `ENABLE_LIVE_TRADING=true` remain controlled dev/smoke aliases rather than required normal-user setup. Completing legal approval does not submit orders and does not bypass credential, account metrics, fresh book, selected market, stake/exposure, audit, kill-switch, acknowledgement, non-marketable, or provider-adapter gates.

Goal 06 partial runtime note, 2026-06-04: the Tauri live gate command now loads
`LEGAL_APPROVAL_FILE` or `.local/legal-gate.local.json` and blocks live submit
when the file is absent, malformed, not approved, for the wrong provider, or
missing required C0/C1/geoblock/credential/audit/limit fields. This local file
is still necessary but not sufficient: real provider execution remains blocked
unless credentials, account metrics, fresh official data, risk limits, explicit
acknowledgement, audit logging, and provider adapter configuration also pass.
The Tauri live runtime seam is tested with mocked place/cancel outcomes and now
has a Polymarket official SDK branch configured by default for the product path.
It still requires app-managed local signer material, authenticated
provider-owned account metrics, and fresh Tauri-owned account metrics values
for the selected provider and market before any provider call. Renderer-supplied
funds/exposure values do not authorize live trading. Kalshi live remains
blocked with `provider_live_adapter_not_configured`, and this committed
template does not authorize or execute real orders by itself.

Goal 07 runtime note, 2026-06-04: desktop account onboarding is not a
legal approval. Polymarket signer import and Kalshi API Key ID plus `.key`
import only establish credential-readiness candidates inside the
Tauri/main-process boundary. The normal product flow imports source files once
and stores app-managed encrypted local credential material; legacy/manual
references remain compatibility/dev-smoke fallback behavior. Live remains
blocked unless this human approval gate, local approval file,
jurisdiction/geoblock checks, credential validation, authenticated
provider-owned account metrics, risk limits, audit logging, explicit
acknowledgement, kill switch, non-marketable smoke policy, and provider adapter
gates all pass. Polymarket now has a Tauri-owned authenticated account metrics
path for balance/allowance, open orders, and positions, and Kalshi now has a
Tauri-owned RSA-PSS signed portfolio metrics path for USD balance, resting
orders, and positions. Account-readiness still does not authorize real trading:
provider live-adapter readiness, legal/local approval, geo/platform, risk,
audit, acknowledgement, kill-switch, and non-marketable gates must all pass.
Seed phrases, fake identity, KYC/AML/geoblock bypass, withdrawals, deposits,
and cloud/server custody remain forbidden.

## C0 checklist

Live trading is blocked if any answer is yes:

- Is the app bypassing geoblocks or platform restrictions?
- Is any fake identity, fake KYC, or fake beneficial owner being used?
- Are user funds or private keys being custodied by the product?
- Is the app hiding the real account owner?
- Is any sanctions/AML restriction being bypassed?
- Is live execution being routed through an unauthorized account?
- Is the product enabling users to trade from blocked regions?
- Are secrets committed to the repository?

## C1 checklist

These items require business-owner sign-off:

- administrative/regulatory uncertainty;
- gambling/financial licensing uncertainty;
- platform terms ambiguity;
- launch in or from high-risk jurisdictions;
- public availability of the app;
- paid routing, fee/revenue-share, or monetization model.

## Runtime activation rule

Live trading must not be reachable by changing one casual flag. Runtime must require all of:

- app-managed legal approval created by `legal_approval_submit`, or controlled dev/smoke aliases `ENABLE_LIVE_TRADING=true` plus `LEGAL_GATE_STATUS=APPROVED`;
- non-committed local approval file exists and has approved status;
- C0 clear;
- C1 approved or not required;
- platform geoblock pass;
- approved credential source: `local_env_dev_only`, `os_secure_storage`, or `explicit_local_provider`;
- approved provider onboarding credential profile ready for the selected provider;
- authenticated provider-owned account metrics source ready for the selected provider and market;
- fresh Tauri-owned account metrics values loaded for the selected provider and market;
- secret-free `live_preflight_status` ready for the selected provider;
- max stake and max exposure configured;
- audit log enabled;
- explicit user live acknowledgement;
- kill switch off for risk-increasing actions.

The desktop UI may expose live order submission only after the selected
provider preflight is ready and a validated BUY-only limit/GTC/post-only
non-marketable intent exists. That action must call Tauri `order_submit_live`
and must leave cancellation as an explicit manual `order_cancel` action by
provider order id; the renderer must not auto-cancel successful submissions.

`local_env_dev_only` credentials and `.local/*.json` account metrics are permitted only for controlled smoke tests. Public/product builds must use OS secure storage or an explicit local `CredentialProvider` plus authenticated provider-owned account metrics. Renderer code must never receive private keys, seed phrases, API secrets, passphrases, auth headers, signatures, signed payloads, full account identifiers, or raw provider payloads.

Risk-increasing actions are blocked by default and require all gates to pass. Cancellation is risk-reducing and should remain available even when the kill switch is active, unless a platform or technical failure prevents cancellation.

## Approval statement

> I approve enabling live trading for the limited smoke test described in `docs/launch/LIVE_SMOKE_TEST.md`. I accept the documented C1 administrative/regulatory risks and confirm no C0 risk has been identified.

Approver name:

Role:

Date:

Signature / approval reference:
