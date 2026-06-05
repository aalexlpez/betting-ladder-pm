# Launch Plan

Support/reference doc - defer to `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current phase, validation status, blockers, and next action.

## Launch target

End-of-40-hour delivery: a Windows desktop app running a live-ready ladder terminal, a downloadable/distributable Windows installer linked from the landing page, plus clear release/demo status.

Timing and current phase are controlled by `docs/ai/context-handoff.md`.

## Default vertical slice

```txt
core risk/order semantics tests
  -> real Polymarket and Kalshi REST read-only order books
  -> official provider runtime with SDK/source-of-truth clients and WebSocket-first streaming
  -> unified desktop ladder with real provider data
  -> paper/live-dry-run order intent
  -> audit log
  -> Windows installer/distribution artifact
  -> landing static
  -> release readiness
```

Real live execution is an intended product capability and live smoke target, but it remains gated. If any live gate cannot pass, the demo must show the exact blocker rather than bypassing the gate.

## Primary demo

1. Open landing page.
2. Download or access the Windows installer/distribution artifact, or show a concrete packaging blocker.
3. Open Windows desktop app or documented dev-mode equivalent if packaging is blocked.
4. Search/select real Polymarket and Kalshi markets from one unified market surface, or show a documented provider SDK/API/access blocker for either venue.
5. Display live/read-only ladder from WebSocket-first provider data where official access allows it, or show the named SDK/API/credential blocker.
6. Create order intent.
7. Run risk/legal/geo/credential validation.
8. Execute a real live place/cancel smoke test if all gates pass; otherwise execute live-dry-run/paper and show exact blocked gate.
9. Show redacted audit log.
10. Show launch/readiness status, GTM/pricing posture, and known issues.

## Live smoke demo only if approved

1. Open app.
2. Select a real market for the provider whose legal, geo, credential, and risk gates are approved.
3. Display live ladder.
4. Show legal/geo/credential gates passed.
5. Set approved stake/exposure limits.
6. Arm live mode explicitly.
7. Place one very small low-risk BUY GTC limit order intended to rest on the book.
8. Show order result.
9. Cancel order.
10. Show audit log.
11. Return to paper or disabled mode.

## Fallback demo

If legal/credential/geo gate does not pass:

1. Open app.
2. Display real market data.
3. Run live-dry-run flow.
4. Show exact blocked gate.
5. Show same audit log and order pipeline.
6. Explain what is needed to enable live.

This fallback demonstrates risk management, not completion of the full live objective. The final readiness decision must state whether live smoke was achieved, blocked, or not ready.

## Launch channels

- Direct evaluator demo.
- Lightweight landing page.
- Private beta outreach after legal review.

## Do not launch publicly unless

- legal gate approved;
- target jurisdictions defined;
- platform terms reviewed;
- credential custody solved;
- logs and limits tested;
- support/disclaimer materials ready.
