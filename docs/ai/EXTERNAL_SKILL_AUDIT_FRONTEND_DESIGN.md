# External Skill Audit — `frontend-design`

Date: 2026-06-01
Status: Approved as a repo-local adapted skill, not blindly vendored.

## Source

- Public skill: `anthropics/skills/skills/frontend-design/SKILL.md`
- Directory reference: `https://www.skills.sh/anthropics/skills/frontend-design`
- Install-style reference: `npx skills add https://github.com/anthropics/skills --skill frontend-design`

## Why it is useful

The skill is relevant because the landing page must not look like a generic AI-generated SaaS page. The project needs a strong product narrative, memorable visual direction, and production-grade frontend execution.

## Audit result

The public skill is instruction-only and focused on high-quality frontend design. The core idea is useful, but the generic form is not enough for this project because:

- it does not know the trading terminal category;
- it does not know the legal/live-execution gates;
- it does not know the competitive landscape;
- it may encourage expressive design that could conflict with fintech trust and risk messaging if used without constraints.

## Decision

Create a repo-local skill named `frontend-design` in `.agents/skills/frontend-design/SKILL.md`.

This project-specific skill keeps the useful design intent but adds constraints for:

- prediction-market trading terminals;
- Windows desktop product positioning;
- no-custody/local-first messaging;
- legal and live-execution gates;
- competitor differentiation;
- no fake proof, fake legal claims, fake testimonials, or generic crypto visuals.

Also create a second skill, `landing-conversion-strategist`, because visual polish alone does not solve positioning, trust, conversion, or competitive differentiation.

## Use policy

Use the local `frontend-design` skill for implementation and polish.
Use `landing-conversion-strategist` before it for messaging, section architecture, and competitor positioning.

Do not copy competitor layouts, screenshots, logos, testimonials, or brand assets.
Do not use third-party UI templates without checking license and attribution requirements.
