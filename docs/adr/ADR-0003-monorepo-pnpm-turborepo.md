# ADR-0003 — Monorepo with pnpm Workspaces and Turborepo

Date: 2026-06-01

## Status

Accepted

## Context

The product includes desktop app, landing page, shared domain logic, adapters, docs, launch gates, and agent instructions. Codex also needs modular context routing.

## Decision

Use a monorepo with pnpm workspaces and Turborepo.

## Consequences

- All code and docs live in one repo.
- Domain logic can be shared across apps.
- Quality gates can run from root.
- Codex can use context routes and package boundaries.

## Rejected alternatives

- Separate repos: too much coordination overhead.
- Single app folder without packages: encourages coupling.
- Heavy enterprise monorepo tooling: too much setup for 40 hours.


## Source / evidence

- pnpm workspaces documentation: https://pnpm.io/workspaces
- Turborepo documentation: https://turborepo.dev/docs
