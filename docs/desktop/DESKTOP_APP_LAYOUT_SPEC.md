# Desktop App Layout Specification

## Ladder-first correction, 2026-06-04

Traderline-style market discovery is useful as an access pattern, but the core
desktop product is a Betfair-style betting ladder. The market rail exists to
find and select provider-backed markets; the center workspace must remain the
execution surface with a vertical price ladder, Back/Lay liquidity cells, stake
presets plus manual stake entry near the ladder, visible one-click state, and blocked keyboard/order
affordances until the order-intent and audit path exists.

## Target shell

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top command bar: app · provider · market · connection · mode · gates · account │
├──────────────┬────────────────────────────────────────┬──────────────────────┤
│ Market rail  │ Ladder workspace                       │ Risk / orders rail   │
│ Search       │ Market header                          │ Stake presets/input  │
│ Watchlist    │ Bid size | Price | Ask size             │ One-click arm        │
│ Filters      │ Best bid/ask, spread, own orders        │ Exposure / gates     │
│              │ Hover trade preview                     │ Open orders / audit  │
├──────────────┴────────────────────────────────────────┴──────────────────────┤
│ Bottom status bar: WS · snapshot age · mode · audit file · last error       │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Top command bar

Must show:

- product name;
- active provider;
- selected market or placeholder;
- connection state;
- data freshness;
- execution mode;
- legal/geo gate summary;
- credential status;
- settings entry;
- native/custom window controls.

## Left market rail

MVP:

- search input;
- unified provider-backed Polymarket/Kalshi market list;
- direct all/venue filters and bounded infinite scroll/load more;
- selected market state;
- open/closed/unknown tag;
- liquidity/volume hints when available.

## Central ladder workspace

MVP:

- market header with best bid, best ask, spread, last trade;
- ladder control deck with stake presets, manual stake entry, one-click state, and keyboard/order-intent blockers;
- ladder grid with Back liquidity, price, and Lay liquidity;
- direct price-cell interaction targets that emit order intents only after Goal 05 wires risk/audit validation;
- best bid/ask markers;
- own order markers;
- hover trade preview;
- stale/disconnected overlay;
- empty state if no book loaded.

## Right risk/order rail

MVP:

- selected trade preview;
- global, provider, and market PnL/available/open-order/exposure metrics;
- max stake / max exposure;
- legal gate;
- geo gate;
- credential gate;
- kill switch;
- open orders;
- cancel controls;
- recent validation result.

## Bottom status bar

MVP:

- WebSocket state;
- snapshot age;
- current mode;
- last audit event;
- last error;
- version/build channel if available.

## Responsive desktop constraints

Minimum target:

- 1280x720 usable;
- 1366x768 comfortable;
- 1440x900 preferred;
- 1920x1080 should use space for density, not empty hero layout.

If the viewport is small, prioritize:

1. command bar;
2. ladder;
3. risk/mode controls;
4. orders/audit;
5. market rail.
