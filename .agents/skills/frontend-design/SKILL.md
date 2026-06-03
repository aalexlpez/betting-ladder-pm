---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces and landing pages for this project. Use for apps/landing, marketing UI, product hero sections, visual polish, responsive layout, and non-generic frontend design work.
origin: https://www.skills.sh/anthropics/skills/frontend-design
external_install: npx skills add https://github.com/anthropics/skills --skill frontend-design
project_status: local-adapted-wrapper
---

# Frontend Design Skill

Use this skill when building or reviewing the landing page, marketing sections, screenshots, visual hierarchy, responsive layout, and final UI polish.

This project-local skill is an audited wrapper around the external `anthropics/skills/frontend-design` skill. The external skill is useful because it pushes the agent to create distinctive production-grade interfaces and avoid generic AI-looking design. For this product, the skill must be combined with landing strategy, competitor notes, legal posture, and desktop-first product direction.

## Required context

Before editing landing code, read only:

1. `AGENTS.md`
2. `docs/ai/CONTEXT_INDEX.md` Route I
3. `docs/landing/LANDING_PAGE_BRIEF_FOR_CODEX.md`
4. `docs/landing/LANDING_PAGE_STRATEGY.md`
5. `docs/landing/LANDING_COPY.md`
6. `docs/landing/LANDING_DESIGN_SYSTEM.md`
7. `docs/landing/COMPETITOR_LANDING_NOTES.md`
8. `docs/specs/LANDING_PAGE_SPEC.md`
9. `docs/adr/ADR-0007-landing-page-design-and-skills.md`

Do not read the whole repository unless the task explicitly requires it.

## Product-specific design direction

The landing must feel like a professional trading terminal, not a crypto casino, generic SaaS site, AI wrapper, or gambling affiliate page.

Target aesthetic:

- industrial trading desk;
- dense but controlled;
- precise, editorial, sober;
- terminal-grade confidence;
- high-contrast data surfaces;
- restrained motion;
- no hype around guaranteed profits.

The one memorable idea:

> A live-ready prediction-market ladder that gives traders speed without surrendering control.

## Design pillars

1. Hero must prove the product immediately.
2. Avoid generic AI landing patterns.
3. Design for a skeptical advanced trader.
4. Legal and risk posture is a differentiator.
5. The ladder is the brand.

## Avoid

- vague AI/crypto gradients;
- generic purple-blue SaaS hero;
- fake dashboards with no product substance;
- unverified user counts;
- fake testimonials;
- stock images of traders;
- profit animations;
- casino imagery.

## Implementation rules

- Use real copy, not lorem ipsum.
- Use semantic HTML and accessible buttons/links.
- Respect reduced-motion preferences.
- Do not block page understanding behind animation.
- Use responsive layout, but optimize the hero for desktop traders first.
- Product visuals should be built with DOM/CSS components where possible.
- Do not import trading domain logic into landing code.
