# ADR-0007: Landing Page Design and Skills

Status: accepted.
Date: 2026-06-01.

## Context

The project must produce a launch-ready or launchable product, not only technical code. The landing page is part of the product and go-to-market proof.

The competitive landscape already includes professional or semi-professional prediction-market trading terminals and ladder products. Therefore, the landing cannot rely on generic SaaS design, vague AI/crypto language, or a claim that the product is first to market.

The external `anthropics/skills/frontend-design` skill is useful because it pushes the agent to establish an intentional visual direction before implementation. However, it is generic by design and must be adapted to this product's specific positioning, legal posture, and competitor context.

## Decision

Use a project-local landing skill stack:

1. `landing-conversion-strategist` for positioning and page strategy.
2. `frontend-design` as a local adapted wrapper around the audited external skill.
3. `web-interface-guidelines-review` for product claims, accessibility, responsiveness, and interface-quality review after implementation.

The landing page will use the design concept:

> Exchange Terminal Noir

The page will position the product as a Windows desktop ladder terminal for prediction-market traders, with live execution behind legal, geo, credential, risk, and audit gates.

## Consequences

Positive:

- Codex receives a clear visual and strategic direction before writing code.
- The landing avoids generic AI/SaaS patterns.
- Competitive differentiation is embedded in the brief.
- Legal and live-execution claims are constrained.
- The landing can be reviewed independently from core trading code.

Negative:

- More upfront documentation.
- The landing is less reusable as a generic template.
- Claims must be updated if product implementation changes.

## Guardrails

The landing must not claim:

- first-to-market;
- fastest execution;
- guaranteed profitability;
- legal availability everywhere;
- regulatory approval;
- unverified user counts;
- fake testimonials or fake logos.

The landing must not encourage geoblock evasion, KYC evasion, sanctions evasion, or platform-term evasion.

## Implementation impact

Codex should read Route I from `docs/ai/CONTEXT_INDEX.md` or the landing patch before editing `apps/landing`.

Implementation should start from:

- `docs/landing/LANDING_PAGE_BRIEF_FOR_CODEX.md`;
- `docs/landing/LANDING_PAGE_STRATEGY.md`;
- `docs/landing/LANDING_COPY.md`;
- `docs/landing/LANDING_DESIGN_SYSTEM.md`;
- `docs/specs/LANDING_PAGE_SPEC.md`.
