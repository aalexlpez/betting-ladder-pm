# Launch Readiness Checklist

Support/reference doc - defer to `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current phase, validation status, blockers, and next action.

## Demo target

- [ ] Primary demo: real market data + gated live smoke if approved, otherwise live-dry-run + exact blocked gate.
- [ ] Landing page exposes a Windows installer download/access flow.
- [ ] Windows installer/distribution artifact exists, or a concrete packaging blocker is documented.
- [ ] Polymarket read-only order-book data is integrated from real provider endpoints.
- [ ] Kalshi read-only order-book data is integrated from real provider endpoints, or a concrete official provider/API/access blocker is documented.
- [ ] Fixture/mock data is used only for tests and is not presented as product integration.
- [ ] Real live demo target: one very small low-risk BUY GTC limit order placed and cancelled only if all gates are approved.
- [ ] Real live execution is disabled if legal/geo/credential/risk gates are incomplete.
- [ ] Final state is explicit: live, live-dry-run, paper + real data, or not ready.

## Product

- [ ] Desktop app starts on Windows or documented Windows-equivalent environment.
- [ ] Installer/download flow from landing matches the actual build status.
- [ ] Ladder displays real market data, not simulated provider liquidity.
- [ ] Active provider is visible.
- [ ] Execution mode is visible.
- [ ] One-click is off by default.
- [ ] Stake limits visible.
- [ ] Kill switch visible.
- [ ] Order blotter visible.
- [ ] Audit log visible or accessible.
- [ ] Global/provider/market PnL, available funds, open-order amount, and exposure are visible or explicitly unknown.

## Technical

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Desktop packaging attempted or blocker documented.
- [ ] Landing download/access CTA is truthful and does not claim an installer exists unless it does.
- [ ] No secrets in repo.
- [ ] Dependency versions are pinned and lockfile exists after Goal 01.

## Live execution

- [ ] Legal gate approved or live disabled.
- [ ] Local approval gate exists outside committed repo state, or live disabled.
- [ ] Geoblock check implemented.
- [ ] Credential provider implemented outside renderer, or live disabled.
- [ ] Required provider/account metrics are available, or live risk-increasing actions are blocked.
- [ ] Max stake configured.
- [ ] Max exposure configured.
- [ ] First live acknowledgement required.
- [ ] Live smoke test script followed only if approved.

## Documentation

- [ ] ADRs updated.
- [ ] Daily report updated.
- [ ] Time log updated.
- [ ] Known issues listed.
- [ ] Next steps clear.
- [ ] Screen recordings are not treated as an evaluable requirement or blocker.
- [ ] Reports/time log are clear enough for human readers; no special format is required.

## Final decision

- [ ] Ready for live smoke test.
- [ ] Ready for live-dry-run demo only.
- [ ] Ready for paper + real-data demo only.
- [ ] Not ready.

## Monetization / pricing

- [ ] Public pricing copy matches `docs/product/MONETIZATION_MODEL.md`.
- [ ] No hidden builder fee, broker fee, revenue share, or paid routing path is active by default.
- [ ] If paid routing is enabled, provider-aware fee disclosure is visible before order submission.
- [ ] No subscription or paid live feature is sold where live trading is blocked.
