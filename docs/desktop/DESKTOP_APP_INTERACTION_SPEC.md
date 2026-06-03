# Desktop App Interaction Specification

## Primary flow

```txt
Open app
  -> select/search provider and market
  -> inspect ladder
  -> choose stake
  -> hover/click a ladder cell
  -> create OrderIntent
  -> risk guard validates
  -> paper/dry-run/live adapter handles accepted intent
  -> order/audit panel updates
  -> user can cancel open order
```

## Execution mode contract

### disabled

- order placement disabled;
- ladder can remain readable;
- show disabled reason.

### paper

- safe default;
- order actions routed to paper adapter;
- audit events labeled `PAPER`.

### live_dry_run

- validates live gates without submitting external orders;
- audit events labeled `DRY_RUN`;
- useful when live legal/account gate is incomplete.

### live

- requires explicit acknowledgement;
- persistent live badge visible;
- legal, geo, credential, risk, exposure, required account metrics, and one-click checks required;
- audit events labeled `LIVE`;
- kill switch visible.

## Ladder click behavior

React components must not submit live orders directly.

Required sequence:

```txt
Cell interaction
  -> build OrderIntent
  -> validate stake
  -> validate exposure
  -> validate required account metrics
  -> validate mode
  -> validate one-click if immediate action
  -> validate kill switch
  -> validate legal/geo/credential gates if live
  -> adapter handles accepted intent
  -> audit event emitted
```

## Hover preview

Hover over a ladder action cell should show:

- intended side/action;
- price;
- stake;
- mode;
- whether action would be blocked;
- reason if blocked.

## One-click control

Rules:

- off by default;
- arming is explicit;
- armed state appears near the ladder and in the command bar/risk panel;
- disabling one-click should be one click;
- live one-click should require live gates and acknowledgement.

## Hotkeys

P1 unless risk guard is already implemented.

Rules:

- no hidden destructive hotkeys;
- show hotkey overlay;
- keyboard focus visible;
- no global hotkey that places live orders without visible armed state;
- Escape closes overlays by default, not orders.

## Settings

Settings MVP:

- execution mode;
- live acknowledgement;
- max stake;
- max exposure;
- global/provider/market metrics status;
- one-click preference;
- credential status, not secret values;
- audit log state;
- display density.

## Required states

- no market selected;
- loading market list;
- loading order book;
- stale data;
- disconnected;
- market closed;
- live disabled by legal gate;
- live disabled by geo gate;
- live disabled by credentials;
- order rejected by risk guard;
- adapter error;
- kill switch active.
