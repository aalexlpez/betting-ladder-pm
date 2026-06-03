# MVP Scope

## MVP objective

Deliver a real, live-ready product slice, not a mockup. The product must be usable as a controlled desktop trading terminal if legal and operational gates pass, including real gated live place/cancel capability. If a live gate cannot pass, the fallback demo path is real data plus paper/live-dry-run and exact gate reporting.

## P0 — Must have

### Desktop app

- Windows-oriented Tauri desktop application.
- React/TypeScript renderer.
- Windows installer/distribution artifact downloadable from the landing page, or a documented packaging blocker.
- Clear execution-mode banner: disabled, paper, live-dry-run, live.
- Local settings panel.
- Kill switch visible.

### Market data

- Provider-neutral market-data port with complete Polymarket and Kalshi read-only adapters.
- Market selector or configured provider/market/token fallback using real provider identifiers only.
- Real order-book snapshot for both Polymarket and Kalshi, or a documented official API/access blocker that prevents one provider from being demo-ready.
- Live updates where official endpoints support them, with polling fallback.
- Stale/reconnect/error states.

### Ladder

- Vertical price ladder.
- Bid and ask liquidity per price level.
- Best bid / best ask / spread.
- Tick-size aware rendering.
- Clickable price rows routed through risk guard.

### Order flow

- OrderIntent domain model.
- Stake presets and manual stake.
- One-click disabled by default.
- Explicit one-click arming.
- First live order requires explicit acknowledgement.
- PaperExecutionAdapter.
- LiveDryRunExecutionAdapter.
- ExecutionAdapter interface for live flow.
- Real ProviderLiveExecutionAdapter implementations for Polymarket and Kalshi behind gates, with provider-specific place/cancel reachable only if approved for the selected provider.
- Paper and live-dry-run are safety harnesses and QA paths, not substitutes for real provider market-data integration.

### Safety and legal gates

- C0/C1/C2/C3 risk classification.
- Legal gate provider.
- Geo eligibility provider.
- Credential provider.
- Max stake per order.
- Max exposure per market.
- Audit log with redacted secrets.

### Account and exposure metrics

- Global PnL.
- Available account funds.
- Total offered amount in open orders.
- Total exposure.
- The same metrics grouped by selected market.
- The same metrics grouped by provider: Polymarket and Kalshi.
- When a metric is unavailable from a provider, the UI must show an explicit unavailable/unknown state rather than fabricating or hiding it.

### Launch artifacts

- Landing page.
- Landing page download link or request/access flow for the Windows installer.
- Launch readiness checklist.
- Live smoke test script for approved-gates scenario.
- Daily report and time log.

## P1 — Valuable if time allows

- Keyboard shortcuts that cannot submit live orders without explicit arming and gates.
- Open orders panel from authenticated API.
- Cancel all orders button.
- Fee/revenue-share disclosure UI if provider-approved paid routing is approved later.
- Provider-approved paid routing attribution if safe and feasible.
- Simple release notes.

## Explicitly out of scope

- Provider-specific advanced features beyond the shared Polymarket/Kalshi base.
- Automated trading bots.
- Strategy suggestions.
- Copy trading.
- Custodial wallets.
- Cloud-stored private keys.
- User accounts / SaaS backend.
- Payments and subscriptions.
- Mobile app.
- Advanced charting.
- Backtesting.
- AI trading recommendations.
