# Monetization Model

Status: product source of truth for fair monetization. Billing implementation, paid-routing attribution, and revenue-share routing are out of scope for the first implementation slice.

## Decision

Use a fair, transparent model that prioritizes provider-approved usage fees or revenue sharing over a default subscription, while keeping subscription as a fallback where usage-based monetization is unavailable, too risky, or unwanted by the user.

Default implementation posture:

```txt
billing = not implemented
paid routing attribution = disabled by default
revenue share = disabled by default
fee disclosure = required before any future paid live order path
```

Commercial sequence:

1. **Controlled pilot / technical-test demo:** free access, no subscription, no paid routing fee, no revenue share.
2. **Free evaluation tier:** landing, read-only market data, paper trading, live-dry-run, gate reporting, and safety education remain free.
3. **Preferred paid hypothesis:** provider-approved usage fee, builder fee, broker fee, or revenue-share path for live order routing, only when the provider and jurisdiction allow it, the legal gate approves it, and the user explicitly accepts disclosure.
4. **Subscription fallback:** predictable paid desktop plan for users/providers where usage-based fees are unavailable, legally unclear, operationally too costly, or commercially unattractive.
5. **Team/private pilot:** custom pricing for professional users who need onboarding, support, private builds, shared procedures, or stricter controls.

## Why fees/revenue share first

Advantages:

- Aligns price with active use instead of charging before live value exists.
- Competes better against tools that advertise free or low-friction access.
- Reduces early adoption friction for advanced traders evaluating a new terminal.
- Can keep read-only, paper, and live-dry-run workflows free.

Risks and limits:

- Provider support differs. Polymarket builder-fee mechanics do not automatically imply an equivalent Kalshi path.
- Fee/revenue-share routing may create C1 legal, regulatory, platform-terms, broker, or disclosure risk.
- Usage fees can worsen execution cost for active traders if rates are too high.
- Hidden fees, spread markups, and performance fees are forbidden because they damage trust and may increase compliance risk.
- Revenue share may require a real business entity, provider agreement, tax handling, support process, and user disclosures before production.

## Fairness principles

- Charge for software and routing value, not for user profit or losses.
- Read-only data, paper mode, live-dry-run, blocked-gate explanations, cancellation, audit viewing, and safety checks should not be paywalled.
- Never hide builder fees, broker fees, platform fees, revenue-share terms, paid-routing attribution, or the fact that fees may be additive.
- Do not charge both a subscription and usage fee by default for the same self-serve user flow.
- No performance fee, profit share, hidden spread markup, fake rebate, or dark-pattern trial.
- No paid live feature should be sold in a jurisdiction where live trading is blocked.
- Any real billing entity must be real before production billing. A fictional company is acceptable only for demo branding.

## Provider policy

| Provider | Usage-fee posture | Subscription posture | Open validation |
|---|---|---|---|
| Polymarket | Candidate path if builder-fee or equivalent program is approved, disclosed, and audited. Default rate remains 0 until approved. | Fallback for users who should not or cannot use builder-fee routing. | Confirm current builder-fee terms, jurisdiction, user disclosure, and operational process before enabling. |
| Kalshi | Treat as unknown until official commercial/partner/broker terms are validated. Do not infer Polymarket-style builder fees. | More likely fallback if no approved usage-fee route exists. | Human must validate Kalshi monetization terms, regulatory implications, and required entity/account setup. |

## Pricing hypotheses

| Plan | Price / rate | Included | Fairness rationale |
|---|---:|---|---|
| Free | USD 0 | Landing, read-only market data, paper trading, live-dry-run, safety gates | Lets users evaluate product value without financial pressure. |
| Usage-based | Provider-approved, disclosed, initially minimal | Live order routing without subscription where allowed | Low adoption friction; must not hide execution costs. |
| Pro fallback | Hypothesis: USD 29/month after trial | Live terminal features where usage fees are not used | Predictable cost; avoids per-order fee drag. |
| Team / private pilot | Custom, suggested starting point USD 199/month | Support, onboarding, private builds, custom procedures | For users whose support/security needs exceed self-serve. |

All prices and rates are hypotheses. They must be tested with 10-20 target users before a hard commitment.

## Implementation implications

Do not implement payment processing in the first coding slice.

When monetization touches code later, add provider-aware disclosure:

```ts
type MonetizationMode = "free" | "usage_fee" | "subscription" | "team";

type FeeDisclosure = {
  providerId: "polymarket" | "kalshi";
  feeProgram: "builder_fee" | "broker_fee" | "revenue_share" | "subscription" | "none";
  platformFeeEstimate: DecimalString | "unknown";
  productFeeRateBps: number | "unknown";
  productFeeEstimate: DecimalString | "unknown";
  userAcceptedAt?: string;
};
```

Live order submission must reject if paid routing is enabled but fee disclosure was not shown, accepted, and audited.

## Rejected alternatives

| Alternative | Decision | Reason |
|---|---|---|
| Hidden spread markup | Rejected | Unfair and hard to audit. |
| Performance fee / profit share | Rejected | Misaligns incentives and may increase regulatory risk. |
| Subscription plus usage fee by default | Rejected | Feels like double charging unless explicitly negotiated. |
| High default builder fee near platform maximum | Rejected | Reduces execution quality and hurts active traders. |
| Paywalling read-only/paper/live-dry-run mode | Rejected | Slows adoption and makes validation harder. |
| Building payments before trading terminal works | Rejected | Not needed for the first implementation slice and increases scope. |

## Sources to validate before enabling paid routing

- Polymarket builder fees: https://docs.polymarket.com/builders/fees
- Polymarket trading fees: https://docs.polymarket.com/trading/fees
- Polymarket referral program: https://docs.polymarket.com/resources/referral-program
- Kalshi official commercial/API/provider terms: must be checked before implementation
- Traderline pricing/positioning: https://traderline.com/
- Traderline terms on builder fees: https://traderline.com/terms-and-conditions
- Strata landing/pricing posture: https://strata.trading/
