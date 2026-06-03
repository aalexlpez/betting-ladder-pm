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
