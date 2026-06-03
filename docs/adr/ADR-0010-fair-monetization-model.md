# ADR-0010 - Fair Monetization Model

Status: accepted, updated 2026-06-02
Date: 2026-06-02

## Context

The assignment expects a product, GTM strategy, and launch-ready prototype, not only code. The project therefore needs a monetization model that is credible, fair to users, provider-aware, and compatible with live-trading safety constraints.

The competitive landscape matters: some trading terminals advertise free access while supporting builder fees or other paid routing mechanics. Polymarket has documented builder-fee mechanics. Kalshi monetization terms must be validated from official sources before implementation.

## Decision

Prioritize a provider-approved, disclosed fee or revenue-share hypothesis over a default subscription.

Default implementation remains:

- controlled pilot is free;
- read-only, paper, live-dry-run, gate reporting, and safety checks remain free;
- billing is not implemented in the first vertical slice;
- paid-routing attribution, broker fees, and revenue-share routing are disabled by default;
- fee disclosure, user acceptance, legal/C1 approval, and audit logging are mandatory before any paid live order path.

Subscription remains a fallback for providers, jurisdictions, or users where usage-based monetization is unavailable, too risky, or commercially unwanted. Team/private pilot pricing remains available for support-heavy users.

## Reason

Usage-based monetization can reduce adoption friction and align payment with live order-routing value. It also fits competitors that position as free or low-friction. The risk is that fees/revenue share may add platform, legal, disclosure, execution-cost, and operational obligations. For that reason it is a commercial hypothesis, not an implementation permission.

The MVP should not implement billing before the core ladder, provider adapters, risk gates, metrics, and execution flow work.

## Alternatives considered

- Subscription-first paid desktop app.
- Free forever funded only by referrals.
- Builder-fee-only monetization.
- High builder fee close to platform maximum.
- Subscription plus usage fee by default.
- Performance fee or profit share.
- Paid landing/read-only access.

## Rejected alternatives

Subscription-first is not the preferred launch hypothesis because it increases adoption friction before live value is proven. Referral-only is unreliable because rewards are platform-controlled. Builder-fee-only can punish active users and may not exist across providers. High or hidden fees are unfair. Performance fees and profit shares create poor incentives and may increase regulatory risk. Paywalling read-only mode slows adoption and learning.

## Consequences

- No billing implementation in the first vertical slice.
- Landing can mention free controlled pilot and fair/disclosed pricing exploration, but must avoid fake scarcity or unsupported claims.
- If paid routing is implemented, the app needs provider-aware fee disclosure, user acceptance, C1 approval where required, and audit logging.
- `.env` may include disabled paid-routing settings for future smoke tests, but paid routing remains off by default.

## Sources

- Polymarket builder fees: https://docs.polymarket.com/builders/fees
- Polymarket fees: https://docs.polymarket.com/trading/fees
- Polymarket referral program: https://docs.polymarket.com/resources/referral-program
- Kalshi official commercial/API/provider terms: must be validated before implementation
- Traderline: https://traderline.com/
- Traderline terms: https://traderline.com/terms-and-conditions
- Strata: https://strata.trading/
