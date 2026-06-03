# ADR-0001 — Live-Ready Product, Not Paper-Only Prototype

Date: 2026-06-01

## Status

Accepted; clarified 2026-06-02.

## Context

The assignment is a 5-day / 40-hour product, GTM, implementation, and launch-readiness test. Day 1 closed at 8 hours. Current phase and next action are controlled by `docs/ai/context-handoff.md`.

A cautious approach would use real market data and simulate all order execution. That reduces legal risk, but under-delivers if the product cannot credibly become a real trading terminal.

At the same time, the test target is the end of the 40-hour work budget, not a calendar-weekday milestone. Real live execution is an intended product capability and live smoke target, but it must remain impossible unless legal, geo, credential, account, risk, audit, and explicit human approval gates pass.

## Decision

Build the product as live-ready in architecture and UX. Paper mode remains a development harness and fallback, not the final product strategy.

Default deliverable path:

```txt
real market data
  -> order intent
  -> risk/legal/geo/credential validation
  -> paper or live-dry-run execution
  -> redacted audit log
  -> explicit launch/live-readiness status
```

Approved live smoke path, only if every gate passes:

```txt
one very small BUY GTC limit order
  -> order state
  -> cancel
  -> redacted audit log
  -> return to safe mode
```

## Consequences

- Live execution must be represented in architecture from Day 2.
- Execution modes must include disabled, paper, live-dry-run, and live.
- Legal, geo, credential, risk, and audit gates are P0.
- The first valid demo can succeed without real live order submission if it uses real market data, exercises the same order pipeline, and shows the exact blocking gate.
- Real live place/cancel is part of the intended live-ready product capability, but it is never the default starting point and must remain blocked unless every runtime and human approval gate passes.

## Rejected alternatives

- Paper-only MVP: rejected because it under-delivers the product opportunity.
- Ungated live-first implementation: rejected because it creates unacceptable legal and safety risk.
- Calendar-based launch target: rejected because the operative constraint is 40 hours of work.
