# Project Brief

## Assignment interpretation

The assignment is to turn a commercial opportunity into a product, go-to-market strategy, and first launched or launch-ready version within a 5-day / 40-hour work budget. It explicitly evaluates research, decision-making, product judgment, implementation, selling ability, risk management, and traceability. Human clarification on 2026-06-02 states that autonomy across technical, economic, legal, commercial, and risk-management dimensions is a key evaluation signal.

## Timing state

- Day 1 is closed and logged as 8 hours.
- The project is now in Day 2: start building, resolve remaining product/technical uncertainty, and convert ambiguous behavior into definitions or tests.
- The delivery target is the end of the 40-hour budget, not a calendar-weekday milestone.

## Product

A professional ladder trading terminal for prediction markets.

The ladder is a vertical order-book interface where each row is a price level. It shows liquidity at each level and lets advanced users place or cancel orders quickly with controlled stake sizes.

## Requirement interpretation

This is not a paper-only prototype. The product should include real live trading capability and be live-ready in architecture and product behavior, but real live execution must never be reachable without explicit gates.

Therefore:

- the minimum demonstrable path is real Polymarket and Kalshi market data + order intent + safety validation + live-dry-run or paper execution + audit log;
- the intended live path is real provider order placement/cancellation, only if legal, geo, credential, risk, audit, and human approval gates pass;
- paper mode remains a safety harness, QA tool, and fallback;
- all important decisions must remain traceable and proportionate to their risk.

## Product vision

> Give professional prediction-market traders a fast, safe, local-first ladder terminal for reading liquidity and executing controlled orders.

## Primary user

Advanced or semi-advanced prediction-market trader who understands order books, liquidity, limit orders, exposure, and manual execution risk.

## Primary value proposition

- faster manual execution than native UIs;
- clearer liquidity depth;
- safer one-click workflow with arming, limits, and audit log;
- local-first/no-custody posture;
- desktop terminal experience.

## Strategic choices

- Windows desktop app first, built with Tauri.
- Landing page for product narrative and distribution.
- Polymarket and Kalshi are both P0 integrations through shared domain ports and provider-specific adapters/runtime clients. Official SDKs should be used where available for the chosen runtime; otherwise the implementation must use official OpenAPI/AsyncAPI/direct documented clients and document the reason. Fixtures are allowed for tests, but not as a substitute for real provider integration in the product demo.
- No automation, no bots, no trading signals in MVP.
- Live order placement/cancellation is a real approved-gates capability. It must be implemented and tested as far as gates allow; blocked gates must be explicit rather than bypassed.
- Fair monetization: free pilot/read-only plus a provider-approved, disclosed fee or revenue-share hypothesis; subscription remains a fallback/private-team option. Billing and fees are disabled by default.

## Success definition for 40-hour delivery

Default success:

1. install/run Windows desktop app or documented dev-mode equivalent;
2. download or access the Windows installer from the landing page, or document a concrete packaging blocker;
3. select real Polymarket and Kalshi markets from a unified market surface, or document a concrete official SDK/API/access blocker for either provider;
4. see WebSocket-first live/read-only ladder data where official access allows it, with REST used only as bootstrap/recovery/fallback;
5. set stake and risk limits;
6. create an order intent;
7. run legal/geo/credential/risk validation;
8. execute a real live place/cancel smoke test if all gates pass, otherwise execute live-dry-run/paper and show the exact blocked gate;
9. inspect local redacted audit log;
10. show global, market-level, and provider-level account/risk metrics where provider data is available;
11. show landing page, GTM/pricing posture, and launch/readiness status.
