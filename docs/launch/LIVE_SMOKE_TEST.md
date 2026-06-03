# Live Smoke Test

Support/reference doc - defer to `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current phase, validation status, blockers, and next action.

## Purpose

Verify the minimum live order flow without turning the product into an uncontrolled public trading platform.

## Preconditions

- `LEGAL_GATE_STATUS=APPROVED`
- `ENABLE_LIVE_TRADING=true`
- C0 checklist passed
- C1 risk accepted by business owner
- non-committed local approval gate loaded and approved
- approved jurisdiction defined
- approved provider defined
- real authorized account/wallet available
- geoblock check passed
- credentials loaded locally
- max stake configured
- max exposure configured
- required provider/account metrics available
- audit log enabled
- kill switch tested

## Recommended first live test

1. Start app.
2. Confirm version/build.
3. Confirm execution mode is not live by default.
4. Select approved provider and market.
5. Confirm data freshness.
6. Set very small stake.
7. Arm live mode.
8. Confirm first-live-order acknowledgement.
9. Place one very small BUY GTC limit order intended to rest on the book.
10. Capture order ID.
11. Cancel order.
12. Confirm cancellation result.
13. Confirm audit log redacts secrets.
14. Return app to paper or disabled mode.

## Pass criteria

- No gate bypass occurred.
- Order was submitted only after explicit approval.
- Cancel flow worked or platform rejection was explicit.
- Audit log contains intent, validations, result, and no secrets.

## Fail criteria

- Live mode activated accidentally.
- Secrets logged.
- Geoblock/credential/legal gate skipped.
- App cannot explain platform rejection.
- Exposure limit failed.

## Default mode if gates fail

If any live gate is missing, the demo remains valid as real market data + live-dry-run + exact blocked gate + audit log. Do not attempt live trading from a blocked or unknown state.


## Default demo target

Primary demo if live is not approved: real market data + live-dry-run + exact blocked gate + audit log.

Best case only if approved: place and cancel one very small low-risk BUY GTC limit order.
