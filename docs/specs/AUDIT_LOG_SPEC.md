# Audit Log Specification

## Purpose

Every live, live-dry-run, or blocked live attempt must be explainable after the fact.

## Required events

- app started;
- execution mode changed;
- legal gate loaded;
- geo gate checked;
- credentials status checked;
- order intent created;
- risk validation result;
- live acknowledgement confirmed;
- order submitted;
- order rejected;
- order cancelled;
- kill switch activated;
- error occurred.

Goal 05 required order-intent events:

- `intent_created`;
- `mode_gate_status`;
- `validation_passed`;
- `validation_failed`;
- `paper_order_created`;
- `dry_run_checked`;
- `rejected`;
- `kill_switch_blocked`.

The Goal 05 desktop/runtime harness stores these events in a deterministic
local in-memory audit log abstraction. This is the first local-first
implementation used by tests and the renderer state; file-backed Tauri audit
persistence can replace the storage adapter later without changing the event
contract. The local log must be treated as redacted display state, not as a
place to store credentials or provider SDK payloads.

## Redaction policy

Never log:

- private keys;
- seed phrases;
- API secrets;
- passphrases;
- raw signed payloads if they expose sensitive material;
- full wallet/account identifiers if unnecessary;
- raw environment dumps;
- unredacted IPC payloads.

## Event shape

```ts
type AuditEvent = {
  id: string;
  timestamp: string;
  type: string;
  executionMode: ExecutionMode;
  marketId?: string;
  tokenId?: string;
  orderId?: string;
  status: "ok" | "blocked" | "failed";
  reason?: string;
  metadata?: Record<string, unknown>;
};
```

## Storage

For the MVP, local file-based logging is acceptable. Use a clear local directory and do not sync logs to cloud storage.

## Additional required metadata

For order-related events, include risk action class (`risk_increasing` or `risk_reducing`), gate decision, and redacted rejection reason. Cancellation attempts under kill switch must be audited as risk-reducing actions.

Goal 05 order-related metadata must include mode/gate status sufficient to
explain the decision: execution mode, selected-market presence, order-book
freshness, stake configuration, legal gate, geo gate, credential status, local
approval status, audit-log gate, one-click state, kill-switch state, and whether
required account metrics were known or unknown. Metadata must not include API
keys, auth headers, passphrases, private keys, seed phrases, wallet/account
identifiers, signed payloads, or unredacted provider SDK responses.

Goal 06 partial implementation note, 2026-06-04:

- Mocked live provider success is audited as `order_submitted` with a provider
  order id and no credential material.
- The Tauri provider-runtime seam now maps mocked cancel success to
  `order_cancelled` and proves a blocked submit gate produces
  `validation_failed` without calling the provider runtime.
- Mocked provider rejection is audited as `order_rejected`; mocked network
  failure is audited as `error_occurred`.
- The Polymarket official SDK runtime maps provider place/cancel
  responses into the same `order_submitted`, `order_cancelled`,
  `order_rejected`, and `error_occurred` event families after gates pass. Audit
  payloads must include only provider order ids and redacted reasons, never
  signer material, auth headers, signatures, signed payloads, raw SDK responses,
  or full account identifiers.
- Live command/gate state remains secret-free and reports exact blockers such
  as `local_approval_missing`, `credential_source_missing`,
  `marketable_order_blocked`, `account_metrics_source_missing`,
  `account_metrics_values_source_missing`, `available_funds_unknown`, and
  `provider_live_adapter_not_configured`.
- Audit redaction tests cover secret-like metadata nested under provider
  metadata before renderer display.
