# Desktop App Layout Specification

## Target shell

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Top command bar: app · provider · market · connection · mode · gates · account │
├──────────────┬────────────────────────────────────────┬──────────────────────┤
│ Market rail  │ Ladder workspace                       │ Risk / orders rail   │
│ Search       │ Market header                          │ Stake presets        │
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
- watchlist or mock market list;
- selected market state;
- open/closed/unknown tag;
- liquidity/volume hints when available.

## Central ladder workspace

MVP:

- market header with best bid, best ask, spread, last trade;
- ladder grid with bid size, price, ask size;
- best bid/ask markers;
- own order markers;
- hover trade preview;
- stale/disconnected overlay;
- empty state if no book loaded.

## Right risk/order rail

MVP:

- stake presets;
- manual stake input;
- selected trade preview;
- one-click control;
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
