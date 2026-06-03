# Functional Specification

## Product states

The desktop app must always show:

- selected market;
- selected provider;
- data freshness;
- execution mode;
- one-click armed state;
- max stake;
- max exposure;
- live gate status;
- kill switch state.
- global PnL;
- available account funds;
- total amount offered in open orders;
- total exposure;
- provider and market metric breakdown status.

## Screens

### 1. Market selector

P0:

- configured market/token input or simple market search;
- provider selector for Polymarket / Kalshi;
- show market title, outcome, status, volume/liquidity if available;
- select an outcome token for ladder display.

### 2. Ladder

P0:

- vertical price levels;
- price column;
- bid liquidity column;
- ask liquidity column;
- best bid / best ask / spread;
- highlight current spread area;
- stale data warning;
- click on price -> order intent preview or immediate route through risk guard if one-click armed.

### 3. Stake controls

P0:

- preset stakes;
- manual stake;
- selected stake visible;
- max stake validation.

### 4. Execution controls

P0:

- execution mode selector: disabled / paper / live-dry-run / live;
- one-click arm/disarm;
- kill switch;
- first-live-order acknowledgement;
- clear blocked reason if live unavailable.

### 5. Order blotter

P0:

- local paper/live-dry-run orders;
- live submitted order if enabled;
- status;
- cancel action;
- audit event reference.

### 6. Settings

P0:

- max stake;
- max exposure;
- credential status;
- legal gate status;
- geo gate status;
- audit log path.

### 7. Account and risk metrics

P0:

- global PnL;
- available account funds;
- total amount offered in open orders;
- total exposure;
- metrics broken down by selected market;
- metrics broken down by provider;
- explicit unknown/unavailable states when provider account data is missing.

Metric definitions are canonical in `docs/specs/FINANCIAL_METRICS_SPEC.md`.

## Interaction rules

- One-click is off by default.
- Live execution is off by default.
- First live action requires explicit acknowledgement.
- If kill switch is active, risk-increasing actions are blocked; cancellation remains allowed as risk-reducing unless a stronger technical blocker exists.
- If geoblock status is blocked or unknown, live execution is refused.
- If legal gate is not approved, live execution is refused.
- If credentials are missing, live risk-increasing execution is refused.
- If required financial metrics are unknown, live risk-increasing execution is refused.
- Marketable/cross-spread orders are blocked in live unless explicitly approved.

## Non-functional requirements

- UI must make danger states obvious.
- All live attempts must be audited.
- Domain logic must be tested.
- No hidden network trading path.
- The desktop app should remain usable in paper mode if market data fails.
