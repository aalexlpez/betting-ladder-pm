# User and Go-To-Market

## Primary user

A professional or advanced retail trader already familiar with prediction markets, order books, liquidity, and manual trading.

## Jobs to be done

> When I am monitoring a volatile prediction market, I want to see depth and place/cancel orders quickly from a price ladder so that I can react faster and make fewer execution mistakes.

## Positioning

Professional local-first ladder terminal for prediction markets.

Not:

- a beginner education app;
- a trading bot;
- a custody product;
- a prediction signal product;
- a generic Polymarket clone.

## GTM for first validation

1. Build live-ready product slice.
2. Publish a landing page with a Windows installer download/access flow.
3. Prepare a concise demo script and GTM narrative.
4. Compare against native UI and direct competitors.
5. Ask for willingness to use, pay, or route orders through the app if time allows.
6. Decide between provider-approved fees/revenue share, paid desktop subscription, or private beta.

Landing/GTM is sufficient commercial proof for the technical test. Screen recordings are not evaluated, not necessary, and must not consume time needed for product readiness.

## Initial channels

- prediction-market communities;
- algorithmic betting communities;
- Betfair/ladder trader communities;
- X/Twitter demo videos;
- direct outreach to advanced Polymarket users;
- evaluator network.

## Monetization model

Source of truth: `docs/product/MONETIZATION_MODEL.md`.

Fair monetization should be transparent, predictable, and not tied to user profit or losses. The current recommendation is:

- free controlled pilot during the technical test;
- free read-only, paper, and live-dry-run tier;
- prioritize provider-approved usage fees or revenue share for live order routing only when the provider supports it, gates approve it, and the user accepts disclosure;
- keep Pro subscription as a fallback for jurisdictions/providers where usage fees are unavailable or too risky;
- team/private pilot pricing later for support-heavy users.

Billing, payment processing, paid-routing attribution, and revenue-share routing are out of scope for the first implementation slice and remain disabled by default.

## Differentiation hypothesis

Competition exists, but the market is early. The differentiation is:

- narrow, high-quality ladder UX;
- live readiness with strong gates;
- local-first/no-custody posture;
- transparent risk controls;
- less focus on bots, copy trading, or AI signals.
