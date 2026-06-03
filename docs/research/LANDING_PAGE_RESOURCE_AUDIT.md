# Landing Page Resource Audit

Last updated: 2026-06-01.

## Purpose

Evaluate whether external design resources should be used for the landing page and how much trust to place in them.

## Source reliability scale

| Level | Source type | Use |
|---|---|---|
| High | Official product docs, official skill pages, source repositories | Implementation and workflow facts. |
| Medium | Competitor websites | Positioning claims and visual lessons, not proof of traction. |
| Medium-low | Curated design galleries and template sites | Inspiration only. |
| Low | Social media opinions | Signals only, never product proof. |

## Audited resources

### Anthropic / skills.sh `frontend-design`

Decision: approve as local adapted wrapper.

Reason:

- It explicitly targets intentional aesthetic direction.
- It is useful for landing pages and avoiding generic UI output.
- It pushes the agent to define tone, typography, spatial composition, backgrounds, motion, and anti-generic constraints before coding.

Risk:

- Generic design skill does not understand prediction-market execution, legal gates, custody, or competitor positioning.

Mitigation:

- Use it only with project-specific landing docs and competitor notes.
- Store a project-local wrapper at `.agents/skills/frontend-design/SKILL.md`.

### Vercel web design / interface guideline skills

Decision: use as review inspiration, not as required dependency.

Reason:

- Useful for accessibility, keyboard behavior, responsiveness, performance, forms, and interface quality.
- Better as a second-pass review skill after the first implementation exists.

Risk:

- Could push toward generic web-app best practices instead of trading-terminal specificity.

Mitigation:

- Use local `web-interface-guidelines-review` only after the landing has product-specific design.

### shadcn/ui, Tailwind examples, SaaS galleries

Decision: optional references only.

Reason:

- Useful for component primitives and layout patterns.

Risk:

- High risk of generic SaaS look.

Mitigation:

- Do not copy templates.
- Use custom terminal mockups and product-specific copy.

### Competitor websites

Decision: use for category positioning, not public attacks.

Reason:

- They reveal what the market already claims: ladders, desktop terminals, local-first security, instant execution, AI/automation, speed, multi-wallet support.

Risk:

- Competitor claims may be exaggerated or incomplete.

Mitigation:

- Treat as medium-reliability positioning data.
- Do not repeat unverified competitor metrics.
- Do not compare publicly unless claims are carefully worded.

## Final recommendation

Use the external frontend-design concept, but make the actual landing strategy product-specific:

> The landing must prove a serious Windows ladder terminal with live gates, not decorate a generic SaaS page.
