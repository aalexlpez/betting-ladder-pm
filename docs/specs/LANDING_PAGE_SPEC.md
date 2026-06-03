# Landing Page Specification

Status: active for implementation.
Last updated: 2026-06-01.

## Scope

This specification applies to `apps/landing` only.

The landing page must support the commercial narrative for a real, live-ready Windows desktop trading terminal. It must not be a generic SaaS template, AI-gradient hero, crypto casino page, or broad prediction-market education site.

## Primary objective

Convert a skeptical advanced trader or evaluator into one of these actions:

1. Download or access the Windows beta installer/distribution artifact.
2. Understand any concrete packaging blocker if the installer cannot be produced in the current environment.
3. Understand why the product is live-ready, legally gated, and differentiated from native market UIs and competing terminals.

## Primary audience

Active or semi-professional prediction-market traders who understand order books, limit orders, liquidity, exposure, and execution speed.

Secondary audience:

- Evaluators of the technical test.
- Potential business partners.
- Betfair/ladder traders evaluating prediction markets.

## Required page sections

### 1. Hero

Must include:

- eyebrow: `Polymarket and Kalshi Windows ladder terminal`;
- headline: `Trade prediction markets from the ladder, not the betslip.`;
- subheadline from `docs/landing/LANDING_COPY.md`;
- primary CTA depending on build status;
- secondary CTA;
- trust/risk line;
- desktop terminal visual with ladder rows, bid/ask liquidity, risk gate, audit log, and live-mode state.

### 2. Problem

Show why native/betslip-style market UIs are insufficient for active traders.

Must mention:

- market depth;
- queue/price levels;
- fast cancel/replace;
- exposure clarity;
- one-click risk.

### 3. Product pillars

Recommended cards:

- Live order-book ladder.
- Guarded live execution.
- Local-first credentials / no custody.
- Risk and audit trail.

### 4. Workflow

A simple flow:

`Select market -> Read ladder -> Arm live mode -> Place limit order -> Cancel/track -> Audit event`

### 5. Competitive differentiation

Do not name competitors in public copy unless explicitly asked.

Position by category:

- not a generic prediction-market UI;
- not a bot/AI trader;
- not a custodial wallet terminal;
- not a multi-exchange dashboard trying to do everything;
- focused on one pro execution workflow.

### 6. Safety/legal posture

Must include:

- live trading is gated;
- availability varies by jurisdiction;
- app must not bypass geoblocks, KYC, sanctions, platform terms, or applicable law;
- paper/live-dry-run are included for development and fallback.

### 7. Final CTA

Repeat the primary CTA.

Primary target:

> Download Windows Beta

If a concrete packaging blocker exists:

> Request Windows Pilot Access

## Visual requirements

- Build product visuals in DOM/CSS where possible.
- The ladder mockup must look like a real trading object, not a vague dashboard.
- Use dense data but clear hierarchy.
- Avoid stock imagery.
- Avoid fake logos/testimonials.
- Avoid profit claims.
- Avoid bright casino styling.
- Respect reduced motion.

## Copy constraints

Allowed:

- `live-ready` if gates exist in the architecture/docs.
- `Polymarket and Kalshi` only if the provider-aware adapters are implemented or clearly described as planned support.
- `Windows beta` if a Tauri Windows build is present.
- `local-first/no-custody` only if no server custody is implemented.

Forbidden:

- `first` unless proven;
- `fastest` unless benchmarked;
- `legal everywhere`;
- `guaranteed profits`;
- `risk-free`;
- unverified user counts;
- fake testimonials;
- fake regulatory approval.

## Technical constraints

- Landing must not import live execution adapters.
- Landing must not require credentials.
- Landing must not call trading APIs.
- Landing may include a static or mocked terminal visual.
- Landing may link to docs, demo build, or release artifact.
- Landing should pass typecheck/build.

## Acceptance criteria

- Landing has all required sections.
- Hero includes a credible ladder terminal visual.
- CTA state matches actual build availability.
- Copy is aligned with `LANDING_COPY.md`.
- Visual style follows `LANDING_DESIGN_SYSTEM.md`.
- No prohibited claims exist.
- Responsive layout works at desktop and mobile widths.
- Reduced-motion users are respected.
- `pnpm --filter landing build` or equivalent build command passes, or blocker is documented.
