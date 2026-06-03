# Source Quality Policy

Before using any information, classify the source.

## Reliability hierarchy

| Source type | Reliability | Use |
|---|---:|---|
| Official regulator / statute / court / platform docs | High | Legal facts, API facts, compliance requirements. |
| Competitor official website | Medium-high | Claims about their product, pricing, platform support, positioning. |
| GitHub repository from official org | Medium-high | Technical examples and implementation references. |
| News from reputable outlet | Medium | Current events; verify against official source if possible. |
| Directory / marketplace / affiliate list | Medium-low | Discovery only. Do not infer traction. |
| Reddit / forum / demo post | Low-medium | Early signal; not proof of product maturity. |
| AI-generated claim | Low | Never use without independent verification. |

## Rules

- Separate what a source proves from what it merely suggests.
- Do not infer user traction from product existence.
- Treat competitor websites as claims, not independent proof.
- Treat technical accessibility from a location as evidence of access, not legal authorization.
- Prefer official Polymarket/Kalshi docs for API behavior.
- Prefer DGOJ/BOE/official regulator sources for Spain.

## Current source baseline

- Original evaluator assignment brief: high for evaluation requirements; treated as external input rather than a committed product artifact.
- Polymarket docs: high for Polymarket API behavior.
- DGOJ announcement: high for Spain regulatory action.
- Tauri/pnpm/Turborepo docs: high for tooling facts.
- Competitor websites: medium-high for positioning; not proof of market share.
- Reddit PoCs: low-medium signal only.
