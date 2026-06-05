# Order Entry Semantics

Status: implementation source of truth for MVP order intent and risk tests.

Goal 05 implementation note, 2026-06-04: Back/Lay ladder cells now create a
provider-neutral `OrderIntent` preview when a selected market has a fresh
official normalized order book. The domain validates selected market, fresh
book, tick-size price alignment, configured stake, stake/exposure caps, kill
switch, one-click route, execution mode, account metric availability for
live-style modes, and legal/geo/credential/live gates. One-click remains off by
default, so ladder clicks create previews rather than immediate orders. Paper
confirmation creates local paper order records only. Live dry-run performs
live-style validation and audit logging without provider submission. Real live
submission remains blocked and unimplemented.

Goal 06 partial implementation note, 2026-06-04: the execution package now has
provider-neutral live place/cancel contracts and a gated live adapter tested
against mocked provider adapters. The desktop model exposes local approval,
explicit acknowledgement, account metric, and provider-adapter readiness as
exact live blockers. The Tauri live submit command validates only BUY/long,
limit, GTC, non-marketable smoke-test intents before any provider branch; the
Tauri command boundary now has a mocked provider-runtime seam proving place and
cancel behavior only run after gates pass. The Tauri runtime has a Polymarket
official SDK branch configured by default for the product path; it requires a
numeric provider outcome/token id, app-managed local signer material,
non-committed local approval, provider-owned account metrics readiness, and all
other live gates before it can build a post-only BUY/limit/GTC request. Kalshi
live remains blocked with `provider_live_adapter_not_configured`, and no real
orders were submitted in that slice.

Goal 06 audit correction, 2026-06-04: Tauri validates the live request with
Decimal arithmetic before any provider branch. It rejects renderer quantity
inflation when `price * quantity` exceeds the declared stake, calculates
projected exposure from Tauri-owned account metrics instead of renderer
payloads, and enforces the non-committed local approval max stake/exposure caps.
The local account metrics bridge is non-committed and freshness-checked; it is
a dev/smoke fallback only. Normal product readiness uses authenticated
provider-owned account metrics.

Goal 07 first-live-smoke follow-up, 2026-06-05: the desktop can now expose a
Tauri-only live smoke action after a selected-provider BUY/non-marketable
limit/GTC preview and all preflight gates pass. Polymarket live runtime is
configured by default in Tauri and still requires app-managed signer material,
provider-owned account metrics, and all gates before place/cancel. Kalshi live
placement remains blocked with `provider_live_adapter_not_configured`.

Goal 07 manual-stake UX follow-up, 2026-06-05: the desktop stake deck supports
both preset buttons and manual provider-currency stake entry. Manual entry feeds
the same `stakeAmount` field into the existing order-intent and risk guard path:
empty input rejects with `stake_not_configured`, invalid decimals reject with
`invalid_stake`, and values above the configured/legal cap reject with
`stake_exceeds_limit`.

## Scope decisions

| Decision | Reason | Alternatives considered | Rejected alternatives | Source / evidence |
|---|---|---|---|---|
| MVP order type is **limit order only** | Limit orders are the safest shared baseline for provider adapters and keep the first vertical slice testable | Market order UX, advanced order types | Marketable/market orders by default, because they increase slippage and safety risk | Provider order-entry docs and risk policy |
| Default time in force is **GTC or provider-equivalent resting limit order** | Simplest order lifecycle for place/cancel smoke test while preserving a shared domain contract | GTD, FOK, FAK | FOK/FAK/marketable-first because they make the first live smoke less controllable | Provider order-entry docs |
| User-facing stake is a **provider-currency risk amount** | Traders understand risk limits in account currency; gates can cap maximum loss/exposure without binding the domain to Polymarket USDC or Kalshi USD semantics | Shares/contracts input, USDC-only input | Shares-only input for MVP because it is less clear for risk limits; USDC-only input because it would make Kalshi a second-class provider | Product risk model |
| Marketable/cross-spread execution is **out of scope by default** | Prevents accidental fills during live smoke and keeps live gate conservative | Allow one-click marketable order | Default marketable order, because it is risk-increasing | Risk/live gate docs |
| First approved live smoke is **one very small low-risk limit order, then cancel** | Validates authenticated place/cancel without needing a filled trade | Filled trade smoke | Intentional fill requires separate human approval | `docs/launch/LIVE_SMOKE_TEST.md` |
| Decimal values use **DecimalString at boundaries** and no native JS float arithmetic for money/size/exposure | Prevents precision mistakes in prices, sizes, exposure, and risk caps | Native number arithmetic | Native JS floating point for domain math | Domain safety policy |
| Internal decimal arithmetic uses **decimal.js** in `packages/core` | Gives deterministic decimal multiplication/division/rounding for prices, stake, size, PnL, balances, and exposure while preserving string boundaries | `big.js`, scaled integers, native `number` | Native `number` because binary floats are unsafe for financial math; scaled integers for MVP because provider tick/size precision differs and would slow Goal 02 | Goal 02 domain implementation decision |

## Domain terms

```ts
type DecimalString = string;
type OrderType = "limit";
type TimeInForce = "GTC";
type OrderSide = "BUY" | "SELL";
type Price = DecimalString;      // normalized provider price
type CurrencyCode = "USD" | "USDC" | string;
type StakeAmount = {
  amount: DecimalString;
  currency: CurrencyCode;
}; // user-facing risk/stake amount in provider account currency
type OrderQuantity = DecimalString; // provider token/share/contract size
```

## Decimal arithmetic decision

Use `decimal.js` for internal domain arithmetic in `packages/core` starting in Goal 02.

Rules:

- Public/domain boundaries still accept and return `DecimalString`.
- Convert `DecimalString` to `Decimal` only inside decimal-safe helper functions.
- Never use native JavaScript `number` arithmetic for price, stake, size, PnL, balance, open-order amount, or exposure.
- Serialize computed values back to normalized decimal strings before returning domain results.
- Rounding must be explicit, conservative, and included in validation metadata when it changes order size, estimated cost, proceeds, or exposure.
- `decimal.js` must be added as a real dependency during Goal 02 or earlier bootstrap if the package is implemented then.

Rejected alternatives:

- `big.js`: acceptable, but `decimal.js` has a broader API for rounding/precision operations likely needed by provider adapters.
- Scaled integers: safer for fixed precision, but too rigid before Polymarket/Kalshi tick and size precision are normalized.
- Native `number`: rejected for all financial/domain math.

## Stake and size mapping

MVP user input is `stakeAmount`, displayed with the selected provider account currency. Polymarket may use USDC semantics and Kalshi may use USD semantics; the domain must not silently convert currencies.

For a BUY/long limit order on the selected outcome:

```txt
estimatedCost = price * orderQuantity
orderQuantity = stakeAmount.amount / price
```

For a SELL/reduce limit order on the selected outcome:

```txt
estimatedProceeds = price * orderQuantity
openOrderExposure = conservative max exposure released or changed by the sell
```

Implementation notes:

- Use decimal-safe helpers in `packages/core`; do not use native `number` for money, price, size, or exposure.
- Round size down conservatively to the venue-supported precision once the adapter knows precision constraints.
- Domain functions must return explicit rounding metadata when rounding changes user intent.
- If rounding would reduce size below a venue minimum or create a zero-size order, reject with an explicit validation reason before any execution adapter is called.

## Ladder click semantics

| User action | Resulting intent | Notes |
|---|---|---|
| Click bid-side level | Create a BUY/long limit intent at clicked price for selected outcome | Maker-style by default unless price would cross current ask |
| Click ask-side level | Create a SELL/reduce limit intent at clicked price for selected outcome | Requires existing/available position check before live |
| Click price column only | Select/preview level; no order | Prevents accidental order from neutral price clicks |
| One-click off | Create preview only | User must confirm from preview |
| One-click armed | May submit intent after all gates pass | Live still blocked unless all live gates pass |

## BUY/SELL MVP scope

- MVP supports `BUY`/long selected outcome in paper and live-dry-run.
- MVP live smoke, if approved at all, is BUY/long-only by default.
- MVP supports `SELL` only if the position/availability check is implemented for the selected token.
- If position availability is unknown, live SELL must be blocked with `position_unknown`.
- UI may show SELL as disabled with the exact `position_unknown` reason; do not hide the rule in implementation.

## Exposure rules

Conservative MVP exposure calculation:

```txt
newOrderExposure = stakeAmount for BUY orders
openOrderExposure = sum(unfilled stake amounts for open risk-increasing orders in the same provider currency)
projectedMarketExposure = currentMarketExposure + openOrderExposure + newOrderExposure
```

For SELL orders, exposure cannot be assumed to decrease unless the adapter can prove the order reduces an existing position. Otherwise block live SELL.

Cross-provider or cross-currency totals must use explicit currency labels. Do not aggregate USD and USDC into a single unlabeled exposure number unless a later ADR defines conversion rules.

## Cancellation semantics

Cancellation is risk-reducing. The kill switch must block new risk-increasing actions but must still allow:

- cancel order;
- cancel all;
- reading open orders;
- audit logging.

If a technical outage prevents cancellation, the UI must show `cancel_unavailable` rather than hiding the order.

## Blocked by default

- marketable orders;
- cross-spread execution;
- automatic trading;
- order sizing by implied profit;
- live SELL without position verification;
- live execution without all gates approved.

## Minimum rejection test matrix

Domain tests must cover these exact refusal reasons before UI/live work depends on them:

- `one_click_not_armed`;
- `market_not_selected`;
- `order_book_not_fresh`;
- `price_not_aligned_to_tick`;
- `stake_not_configured`;
- `first_live_ack_missing`;
- `kill_switch_active_for_risk_increasing_action`;
- `stake_exceeds_limit`;
- `exposure_exceeds_limit`;
- `legal_gate_not_approved`;
- `geo_blocked`;
- `geo_unknown`;
- `credentials_missing`;
- `marketable_order_not_approved`;
- `position_unknown`;
- `c0_risk_detected`;
- `c1_approval_missing`;
- `audit_log_not_enabled`;
- `order_intent_missing`;

## Rounding and precision acceptance rules

- Domain accepts prices, stake, size, and exposure as `DecimalString` only.
- Adapter rounds order size down to the venue-supported precision.
- If rounding changes the requested size or estimated cost, validation returns rounding metadata for UI/audit display.
- Rounding must never increase stake, size, or exposure beyond user intent.
- Unknown tick size, unknown token precision, or unknown status blocks live and live-dry-run with a specific rejection reason.

## Required order-entry tests

- BUY preview from bid-side click with one-click off.
- BUY submit in paper mode when limits pass.
- BUY live-dry-run when all non-live gates pass.
- Live BUY rejected when legal gate is not approved.
- Live BUY rejected when local approval state is missing.
- Live SELL rejected with `position_unknown` when availability is unknown.
- Marketable/cross-spread order rejected by default.
- Kill switch blocks new orders but allows cancel intent.
