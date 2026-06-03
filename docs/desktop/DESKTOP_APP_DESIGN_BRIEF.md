# Desktop App Design Brief

## Product intent

Prediction Ladder is a Windows-oriented desktop terminal for prediction-market ladder trading.

The app must prove that the product can move toward real operation, not only a mock demo:

- live market data;
- ladder-first interface;
- structured trade intents;
- paper / live-dry-run / live execution modes;
- legal, geo, credential, exposure, and audit gates;
- local-first/no-custody posture;
- controlled live smoke test if gates pass.

## Primary user

A trader who already understands order books, spreads, liquidity, exposure, stake sizing, and fast manual execution. This user does not need beginner education; they need precision, speed, cancellation, and risk visibility.

## Product personality

The app should feel:

- operational;
- serious;
- precise;
- calm under volatility;
- local-first;
- safety-aware;
- purpose-built.

It should not feel:

- casino-like;
- crypto-vaporwave;
- generic AI SaaS;
- toy-like;
- over-animated;
- like a marketing landing page embedded in Tauri.

## First-window requirements

A reviewer opening the app must understand within 5 seconds:

- this is a ladder terminal for prediction markets;
- which market is selected;
- whether the data is live, stale, disconnected, or mock;
- whether execution mode is disabled, paper, live-dry-run, or live;
- whether one-click is armed or off;
- whether legal/geo/credential gates allow live trading;
- where open orders, cancels, and audit events live.

## MVP desktop UI scope

P0:

- Windows-oriented app shell;
- market rail;
- central ladder workspace;
- right-side risk/order rail;
- bottom status/audit strip;
- execution mode badge;
- one-click off/armed control;
- stake presets;
- risk gate status;
- open orders placeholder;
- audit event panel;
- stale/disconnected states;
- global/provider/market financial metrics with explicit unknown states when provider data is unavailable.

P1:

- hotkey overlay;
- command palette;
- density toggle;
- pane resizing;
- local layout persistence;
- richer order blotter;
- simple position/exposure view.

Out of scope for initial demo:

- mobile UI;
- multi-monitor layout engine;
- advanced charting;
- bot builder;
- copy trading;
- strategy automation;
- advanced P&L analytics beyond the required global/provider/market metrics;
- generic SaaS account dashboard.

## Non-generic design requirements

Required cues:

- dense ladder grid;
- tabular numbers;
- persistent execution mode;
- visible legal/geo/credential gates;
- bottom status bar;
- audit trail;
- right-side order/risk rail;
- disabled state reasons;
- local credential posture without showing secrets.

Forbidden cues:

- generic analytics cards as the main screen;
- marketing hero sections inside app;
- meaningless crypto charts;
- animated gradient backgrounds;
- fake metrics;
- fake testimonials;
- competitor screenshots or copied layouts.
