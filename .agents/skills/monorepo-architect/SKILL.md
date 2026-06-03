---
name: monorepo-architect
description: Maintain package boundaries and pnpm/Turborepo structure.
---


# Monorepo Architect Skill

Use this for workspace, package, dependency, or build-system changes.

Rules:

- Keep `packages/core` pure.
- Apps can depend on packages; packages must not depend on apps.
- Do not introduce circular dependencies.
- Root commands must run through pnpm/Turborepo.
- Any new package needs a README and package boundary explanation.
- Do not add heavy tooling unless it helps the final 40-hour delivery demo.
