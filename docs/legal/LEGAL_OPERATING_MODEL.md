# Legal Operating Model

Last reviewed: 2026-06-02.

## Purpose

Enable a real product build while avoiding uncontrolled legal, criminal, sanctions, identity, AML/KYC, custody, and user-harm risk.

This is an operating model for product development. Formal legal advice and risk acceptance must come from the responsible business owner or legal counsel.

## Durable decision

| Item | Decision | Reason | Alternatives considered | Rejected alternatives | Source/evidence |
|---|---|---|---|---|---|
| Risk taxonomy | C0 blocks; C1 requires human approval; C2/C3 are managed operationally. | Evaluators separated administrative fines from criminal risk; Codex must not accept legal risk. | Treat all regulatory risk as economic. | Rejected because criminal/severe compliance risk is a different category. | Evaluator guidance, assignment risk-management requirement. |
| Fictitious company use | Allowed only for demo branding/pitch; not for live accounts/KYC/ownership. | Product wrapper can be fictional, but live execution must not misrepresent ownership. | Use fictional entity for live accounts. | Rejected as C0/severe compliance risk. | Legal operating model. |
| Custody posture | No custody of user funds, seed phrases, private keys, or backend signing for third-party users. | Preserves local-first/no-custody product posture. | Cloud secret storage/backend signing. | Rejected due custody/security/compliance risk. | Polymarket auth model and desktop security model. |

## Risk classes

| Class | Meaning | Product behavior |
|---|---|---|
| C0 | Criminal, severe compliance, sanctions, AML/KYC evasion, fake identity, fake beneficial ownership, geoblock evasion, custody misuse, unauthorized access | Absolute no-go. Codex must stop. |
| C1 | Administrative/regulatory risk, licensing uncertainty, platform availability, jurisdictional uncertainty | Human business-owner sign-off required. Codex cannot accept it. |
| C2 | Platform/ToS/account/API operational risk | Controlled with feature flags, fallbacks, and docs. |
| C3 | Product/economic risk | Normal product decision. |

## Core legal stance

The evaluators indicated that administrative/regulatory risk may be considered as part of business economics, while criminal risk is a different category and must have near-zero probability.

Implementation implication:

- C1 can be signed off by humans.
- C0 blocks product behavior.
- Codex must implement gates and logs, not decide legal acceptability.
- Human clarification on 2026-06-02 indicates broad evaluation flexibility and tolerance around legal/compliance risk. This is interpreted as willingness to accept documented C1 business risk through an explicit human gate, not as permission to bypass C0 restrictions.

## Spain

Spain has high regulatory risk for Polymarket/Kalshi operations due to the DGOJ announcement on 2026-05-26 opening a sanctioning procedure and ordering precautionary website blocking.

Important distinction:

- technical access from Spain does not equal legal authorization;
- inconsistent ISP/DNS/CDN access does not remove legal risk;
- do not implement bypasses;
- do not target Spain without explicit C1 sign-off.

## Andorra / other jurisdictions

Operating from Andorra or any other jurisdiction is not a safe harbor by default. The project must consider:

- where the operator/entity is established;
- where the user is located;
- where marketing is targeted;
- where accounts, wallets, and beneficiaries are located;
- the rules of the selected provider/venue;
- local gambling/financial regulation;
- AML/KYC requirements;
- platform geoblocking.

## Fictitious company policy

A fictitious company or brand may be used for:

- demo branding;
- landing page copy;
- mock terms;
- pitch materials.

A fictitious company must not be used for:

- real KYC;
- opening platform accounts;
- hiding beneficial owners;
- receiving funds;
- signing real contracts;
- representing false ownership;
- avoiding regulation.

For live trading, the account/wallet owner and beneficial owners must be real and authorized.

## Custody and credential policy

The product must not custody:

- user funds;
- seed phrases;
- private keys;
- unencrypted API credentials in a backend;
- third-party wallets.

Credential source is explicit:

- `none`: default, live blocked;
- `local_env_dev_only`: controlled local smoke-test/dev only, never the product default, and must use `_LOCAL_DEV_ONLY` variable names;
- `os_secure_storage`: preferred product direction for desktop builds;
- `explicit_local_provider`: allowed if it keeps secrets local and outside renderer access.

Renderer code must never receive private keys, seed phrases, API secrets, passphrases, auth signatures, or raw signed payloads.

## Geoblock policy

The app must check platform geoblock status before live execution. If blocked or unknown, live risk-increasing execution must be refused.

The app must not implement:

- VPN bypass;
- proxy bypass;
- region spoofing;
- hidden routing;
- instructions for bypassing restrictions.

## Live execution preconditions

Live risk-increasing execution may only be enabled if:

1. `LEGAL_GATE_STATUS=APPROVED`;
2. C0 risk review passes;
3. C1 risk has business-owner sign-off or is marked not required;
4. provider/venue and jurisdiction are approved;
5. account/wallet is real and authorized;
6. geoblock check passes;
7. credentials are local and not committed;
8. local approval state exists outside committed repository files;
9. max stake and max exposure are set;
10. user explicitly arms live mode;
11. audit log is enabled;
12. market data is fresh and live-eligible.

## Live action policy

- Risk-increasing actions are blocked by default and require all gates to pass.
- Cancellation is risk-reducing and should remain available even when the kill switch is active, unless a platform or technical failure prevents cancellation.
