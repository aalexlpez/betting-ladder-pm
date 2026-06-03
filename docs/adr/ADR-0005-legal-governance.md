# ADR-0005 — Legal Governance and Live Execution Gates

Date: 2026-06-01

## Status

Accepted

## Context

Evaluator feedback distinguishes administrative/regulatory risk from criminal risk. Administrative risk may be evaluated economically by business owners; criminal/severe compliance risk must remain near zero.

## Decision

Implement a risk taxonomy:

- C0 blocks all live behavior.
- C1 requires human sign-off.
- C2 is controlled operationally.
- C3 is normal product/economic risk.

Live execution must require legal, geo, credential, risk, user confirmation, and audit gates.

## Consequences

- Codex must not make legal acceptance decisions.
- Live mode is impossible unless gates pass.
- The app refuses geoblock bypass and fake identity behavior.
- Fictitious branding is allowed only for demo, not live accounts.

## Rejected alternatives

- Ignoring administrative risk: rejected because traceability is required.
- Blocking all live execution forever: rejected because product must be live-ready.
- Letting code silently enable live mode: rejected.
