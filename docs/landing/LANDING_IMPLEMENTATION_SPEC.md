# Landing Implementation Spec

## App

`apps/landing`

## Stack

Use the existing monorepo frontend stack. Prefer React/TypeScript components and shared UI primitives from `packages/ui` when available.

## Required components

- `HeroSection`
- `TerminalMockup`
- `ValueCards`
- `CompetitorWedge`
- `SafetySection`
- `WorkflowSection`
- `FinalCta`
- `LegalNote`

## Content source

Use `docs/landing/LANDING_COPY.md` as source of truth. Do not invent fake testimonials, fake customers, fake performance statistics, fake legal guarantees, or unsupported compliance claims.

## Technical constraints

- No live trading logic in `apps/landing`.
- No private keys, API keys, or SDK credentials.
- No geoblock bypass copy or code.
- No fake download if no Windows package exists; use beta/waitlist CTA instead.
- Keep page static or mostly static.
- Optimize for screenshot quality and evaluator review.

## Acceptance criteria

- Landing page communicates product and wedge above the fold.
- Terminal mockup is specific to ladder trading.
- CTA is clear.
- Safety/legal language is visible.
- Page is responsive enough for desktop and mobile preview.
- Build, lint, typecheck, and tests pass or blockers are documented.
