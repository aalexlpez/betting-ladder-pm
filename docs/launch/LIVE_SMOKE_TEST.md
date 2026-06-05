# Live Smoke Test

Support/reference doc - defer to `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current phase, validation status, blockers, and next action.

## Purpose

Verify the minimum live order flow without turning the product into an uncontrolled public trading platform.

## Preconditions

- localized desktop legal approval completed for the selected provider through
  `legal_approval_submit`; `LEGAL_GATE_STATUS=APPROVED` and
  `ENABLE_LIVE_TRADING=true` are controlled dev/smoke aliases only
- C0 checklist passed
- C1 risk accepted by business owner
- non-committed local approval gate loaded and approved
- approved jurisdiction defined
- approved provider defined
- real authorized account/wallet available
- geoblock check passed
- provider onboarding status ready for the selected provider
- credentials loaded locally through OS secure storage or explicit local provider
- max stake configured
- max exposure configured
- authenticated provider-owned account metrics available for balance/funds,
  positions, open orders, provider exposure, and market exposure
- secret-free `live_preflight_status` returns ready with no blockers
- Polymarket provider live adapter configured by default in Tauri; Kalshi live
  remains blocked until its live adapter is implemented
- audit log enabled
- kill switch tested

## Recommended first live test

1. Start app.
2. Confirm version/build.
3. Confirm execution mode is not live by default.
4. Select approved provider and market.
5. Confirm data freshness.
6. Set very small stake.
7. Open the legal approval panel, complete every responsibility declaration,
   and confirm the provider-specific legal/local approval status is ready.
8. Confirm first-live-order acknowledgement.
9. Select live mode only if every selected-provider preflight gate is ready.
10. Click a Back/bid ladder cell that creates a BUY preview. Do not click Lay;
    the first smoke is BUY-only.
11. Confirm the preview is limit/GTC, post-only/non-marketable, tiny stake, and
    `canSubmitLive` is exposed through the Tauri live route.
12. Press "Submit live smoke and cancel".
13. Confirm `order_submit_live` returns a provider order id or an exact safe
    rejection reason.
14. Confirm `order_cancel` runs immediately when a provider order id is
    returned, then confirm cancellation result.
15. Confirm audit log redacts secrets.
16. Return app to paper or disabled mode.

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

Goal 07 note, 2026-06-04: the current desktop can onboard Polymarket/Kalshi
credentials through app-managed secure import and show exact preflight blockers.
Tauri reads local source files once, validates the Polymarket signer or Kalshi
RSA key, stores encrypted local credential material under the app credential
provider, and keeps legacy/manual references as compatibility/dev-smoke fallback
behavior. Polymarket account metrics can now be loaded through the Tauri-owned
authenticated provider runtime for balance/allowance, open orders, and
positions. Kalshi account metrics can now be loaded through the Tauri-owned
RSA-PSS signed portfolio runtime for USD balance, resting orders, and positions.
Real live still remains blocked when provider live adapters or any
legal/geo/credential/local approval/risk/audit/acknowledgement/non-marketable
gate is not ready. Do not replace provider-owned metrics with
`.local/account-metrics.local.json` for a normal operator workflow; that file is
only a controlled dev/smoke fallback.

Goal 07 legal onboarding follow-up, 2026-06-05: the first-smoke legal approval
is now an in-app localized modal. Tauri validates target jurisdiction, real
operator/approver, C0/C1/no-bypass/no-custody declarations, stake/exposure
caps, audit, no deposit/withdrawal behavior, and the BUY-only tiny
limit/GTC/post-only/non-marketable smoke policy before writing local approval.
This approval still does not bypass credentials, provider-owned account
metrics, fresh official book, risk limits, kill switch, explicit
acknowledgement, adapter readiness, or provider/platform rejection.

Goal 07 first-live-smoke follow-up, 2026-06-05: the desktop right rail now has a
disabled-by-default "submit live smoke and cancel" button. It becomes enabled
only after a validated selected-provider BUY/non-marketable limit/GTC preview
and all Tauri preflight gates pass. React calls only Tauri `order_submit_live`
and `order_cancel`; the provider SDK, credential material, auth headers,
signatures, signed payloads, and raw provider responses stay in the main
process.


## Default demo target

Primary demo if live is not approved: real market data + live-dry-run + exact blocked gate + audit log.

Best case only if approved: place and cancel one very small low-risk BUY GTC limit order.
