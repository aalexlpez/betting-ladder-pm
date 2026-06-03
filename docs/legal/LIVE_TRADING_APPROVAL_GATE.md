# Live Trading Approval Gate

Live trading is disabled until this approval is completed by the responsible human business owner and mirrored into a non-committed local runtime approval file.

This Markdown template documents the required fields. It is necessary but not sufficient. Runtime must still check environment/config, local approval state, jurisdiction/geoblock, credential source, risk limits, C0/C1 status, audit logging, explicit UI acknowledgement, and kill switch state.

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

The application must not rely only on this committed Markdown file. Before real live execution, it must load local approval state from `LEGAL_APPROVAL_FILE`, defaulting to `./.local/legal-gate.local.json`.

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

- `ENABLE_LIVE_TRADING=true`;
- `LEGAL_GATE_STATUS=APPROVED`;
- local approval file exists and has approved status;
- C0 clear;
- C1 approved or not required;
- platform geoblock pass;
- approved credential source: `local_env_dev_only`, `os_secure_storage`, or `explicit_local_provider`;
- max stake and max exposure configured;
- audit log enabled;
- explicit user live acknowledgement;
- kill switch off for risk-increasing actions.

`local_env_dev_only` credentials are permitted only for controlled smoke tests. Public/product builds must use OS secure storage or an explicit local `CredentialProvider`. Renderer code must never receive private keys, seed phrases, API secrets, passphrases, auth headers, or raw signed payloads.

Risk-increasing actions are blocked by default and require all gates to pass. Cancellation is risk-reducing and should remain available even when the kill switch is active, unless a platform or technical failure prevents cancellation.

## Approval statement

> I approve enabling live trading for the limited smoke test described in `docs/launch/LIVE_SMOKE_TEST.md`. I accept the documented C1 administrative/regulatory risks and confirm no C0 risk has been identified.

Approver name:

Role:

Date:

Signature / approval reference:
