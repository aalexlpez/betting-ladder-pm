---
name: legal-live-safety-gate
description: Enforce legal, geo, credential, custody, and live execution safety gates.
---


# Legal Live Safety Gate Skill

Use this for any task touching live execution, credentials, accounts, geo, legal, or risk limits.

Absolute blocks:

- geoblock evasion;
- fake KYC;
- fake beneficial ownership;
- hidden account owner;
- sanctions/AML bypass;
- custody of user funds or seed phrases;
- live trading without approved gate.

Implementation rules:

- C0 blocks.
- C1 requires human sign-off.
- Live mode defaults off.
- Audit every live attempt.
- Redact secrets.
