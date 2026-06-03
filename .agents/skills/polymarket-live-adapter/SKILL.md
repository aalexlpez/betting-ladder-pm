---
name: polymarket-live-adapter
description: Implement Polymarket market data and live execution through safe ports.
---


# Polymarket Live Adapter Skill

Use this for Polymarket market-data or execution work.

Rules:

- Read-only data adapter first.
- Validate external payloads.
- Normalize into domain types.
- Live execution must go through ExecutionAdapter and RiskGuard.
- Never log secrets.
- Never bypass platform geoblock or auth requirements.
- Prefer limit orders for first live smoke test.
