# @prediction-ladder/execution

Execution and account-state contracts for paper, live-dry-run, and gated live adapters.

Goal 05 adds the deterministic local audit abstraction, disabled/paper/live-dry-run/live-blocked order-intent processing, and local paper order records.

Goal 06 starts the gated live execution vertical slice. The package now exposes secret-safe `CredentialProvider`, non-committed `LocalApprovalGateProvider`, provider-neutral live place/cancel contracts, and `GatedLiveExecutionAdapter` tests with mocked provider place/cancel success, provider rejection, network error, kill switch, and audit redaction. Real provider submission still requires a configured provider adapter plus every legal, geo, credential, local approval, account metric, risk, audit, and explicit acknowledgement gate.

Follow repository boundaries in `docs/architecture/MONOREPO_STRUCTURE.md`.
