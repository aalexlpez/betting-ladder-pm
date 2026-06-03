# Assignment Traceability

Support/reference doc - defer to `docs/ai/CONTEXT_INDEX.md` for authority routing and `docs/ai/context-handoff.md` for current phase, validation status, blockers, and next action. This file maps assignment requirements to repository evidence; it is not the current implementation roadmap.

Status date: 2026-06-02.

This table maps the original technical test to the current repository. The original evaluator brief is treated as external input; this repository keeps only product/build artifacts, decisions, implementation state, and time tracking.

## Original brief source status

The exact evaluator brief is not currently versioned in this repository. That means this repo still should not quote or claim verbatim textual compliance with an uncommitted source.

Implementation-readiness status: **closed for current development**. On 2026-06-02, the user explicitly approved closing this point and treating the current traceability table plus human validation notes as sufficient assignment validation for Codex implementation. If exact wording becomes available later, it may still be added as a stronger archival source, but it is no longer a blocker before Goal 01.

Current source handling:

- The assignment requirements below are reconstructed from the user's test context and project notes.
- The original brief is considered a high-authority external source, but not a committed implementation artifact.
- Earlier references to a copied evaluator-brief path were invalid and must not be used.
- Archived/generated historical notes are not source-of-truth unless a human explicitly requests historical reconstruction.

Optional archival improvement:

1. If the brief can be stored, add a sanitized copy at `docs/product/ORIGINAL_ASSIGNMENT_BRIEF.md`.
2. If the brief is confidential, add only permitted excerpts at `docs/product/ORIGINAL_ASSIGNMENT_EXCERPTS.md`.
3. If exact wording is later added or excerpted, update the "Source confidence" column or notes for each requirement.

## Human validation note - 2026-06-02

The user validated the missing-brief ambiguities in this thread. These answers are treated as human-provided assignment clarification with confidence level **B** unless later replaced by exact brief excerpts.

Additional closure note: later on 2026-06-02, the user explicitly approved closing the missing-versioned-brief issue before coding. The repository may proceed using this file as the canonical assignment traceability artifact.

Validated clarifications:

- The product needs an installer/distribution artifact downloadable from the landing page.
- Both providers, Polymarket and Kalshi, must be real integrations.
- Real live trading is an expected product capability, but still subject to safety, legal, geo, credential, risk, audit, and explicit approval gates.
- Paper mode is only a harness/fallback.
- Landing/GTM is sufficient for the selling/commercial proof expected by the test.
- Daily reports/time log may use any clear, human-readable format.
- Screen recordings are not evaluated and are not necessary.
- The stated AI/tooling target is `gpt-5.5`.
- The evaluator gives broad flexibility around legal/compliance risk, interpreted here as high tolerance for business-accepted C1 risk, never as permission for C0 behavior.
- Evaluation focuses on autonomy and how far the product can be taken across research, decision-making, building, selling, economics, technical execution, legal reasoning, and risk management, as if operating like a small company.

## Source confidence levels

| Level | Meaning | Use |
|---|---|---|
| A | Directly confirmed from the exact evaluator brief or a human-provided excerpt. | Treat as hard requirement. |
| B | Strongly supported by user-provided context, evaluator notes, or repeated project instructions. | Treat as requirement unless contradicted. |
| C | Product/architecture decision made to satisfy or strengthen the test. | Keep, but do not present as literal assignment wording. |
| D | Open assumption or unresolved interpretation. | Resolve before relying on it for acceptance. |

## Missing-brief ambiguity register

| Ambiguity | Why it matters | Current interpretation | Risk if wrong | How to close |
|---|---|---|---|---|
| Exact deliverable definition: "launched" vs "launch-ready" | Determines whether a working local demo is enough or whether packaging/public distribution is required. | A launch-ready Windows desktop app or documented dev-mode equivalent is acceptable; package artifact is preferred. | Over-investing in packaging or under-delivering distribution readiness. | Closed by human validation on 2026-06-02; exact brief text remains optional archival evidence. |
| Required provider coverage | Determines whether one provider is enough or both Polymarket and Kalshi must work. | Polymarket and Kalshi are both required first-version integrations; fixtures do not count as provider integration. | Building too narrow a slice or missing expected venue support. | Closed by human validation and stricter product decision; add exact brief text later only if available. |
| Real live trading requirement | Determines whether a real order must be placed or a gated live-dry-run can pass. | Real live trading is an expected capability and live smoke target; execution remains gated and blocked if any gate fails. | Unsafe legal exposure if treated as ungated; weak product signal if treated as paper-only. | Human validation received 2026-06-02. |
| Paper mode acceptance | Determines whether paper mode can be shown as final product behavior. | Paper mode is a harness/fallback, never the final product strategy. | A paper-only demo may fail the product ambition. | Keep paper in docs as safety/QA only. |
| "Selling ability" evaluation | Determines whether landing/GTM docs are enough or outreach/customer proof is expected. | Landing, GTM plan, demo script, and willingness-to-pay questions are required; actual user feedback is valuable if time allows. | Too much coding without commercial proof. | Closed for implementation by human validation; add outreach/demo checklist only if time allows. |
| Daily reports and time log format | Determines evidence quality for time-boxed work. | Simple time log plus daily/consolidated report is sufficient. | Over-documenting or missing evaluator-friendly reporting. | Closed by human validation on 2026-06-02. |
| Screen recordings | Determines whether demo recording can block release readiness. | Not evaluated and not necessary. | Wasting time on recording instead of product readiness. | Human validation received 2026-06-02. |
| Permitted AI/tooling workflow | Determines whether external AI agents/plugins can be used. | Codex is the main implementation driver; review roles may critique; no autonomous external agent mode. | Disallowed process or uncontrolled edits. | Closed by human validation on 2026-06-02; exact AI-tool clause can be archived later if available. |
| Legal/compliance risk tolerance | Determines whether administrative risk can be accepted and by whom. | C0 blocks; C1 requires human business-owner approval. | Unsafe live behavior or overly cautious underdelivery. | Closed for implementation; keep legal gate and add exact evaluator guidance later only if available. |
| Evaluation acceptance criteria | Determines whether tests/build, packaging, landing, live data, or launch plan are weighted most heavily. | Standard gates plus release checklist are used as acceptance. | Optimizing the wrong part of the test. | Closed for implementation by human validation; exact rubric/excerpts remain optional archival evidence. |

## Resolved ambiguity decisions

| Ambiguity | Resolution | Confidence | Implementation implication |
|---|---|---:|---|
| Exact deliverable definition | Installer/distribution must be downloadable from the landing page. | B | Packaging and landing download CTA are P0, not P1 polish. |
| Required provider coverage | Polymarket and Kalshi must both be real integrations. | B | Do not accept fixture-only provider work as complete. |
| Real live trading requirement | Real live trading is an expected capability; execution remains gated. | B | Build real gated live adapters and a live smoke path; block rather than bypass if gates fail. |
| Paper mode acceptance | Paper mode is a harness/fallback only. | B | Paper cannot be presented as final product execution. |
| Selling ability evaluation | Landing/GTM is enough for the commercial proof in this test. | B | Prioritize credible landing, positioning, pricing, and demo narrative over live outreach. |
| Daily reports/time log format | Any clear human-readable format is acceptable. | B | Keep reports simple and understandable; avoid format churn. |
| Screen recordings | Not evaluated and not necessary. | B | Remove as a planning dependency; screenshots are only optional QA artifacts. |
| Permitted AI/tooling workflow | Use `gpt-5.5` as the stated tool target. | B | Keep Codex/GPT workflow structured; avoid autonomous external agents unless explicitly allowed. |
| Legal/compliance risk tolerance | Flexible for business/product reasoning, but C0 remains blocked. | B | C1 can be accepted by a human owner; no geoblock/KYC/sanctions/custody bypass. |
| Evaluation acceptance criteria | Evaluates autonomous product development across technical, economic, legal, selling, and risk dimensions. | B | Preserve product, GTM, monetization, legal, launch, and engineering evidence together. |

## Timing state

- Total work budget: 40 hours.
- Day 1: closed at 8 hours.
- Current phase and next action: see `docs/ai/context-handoff.md`.
- Final target: launched or launch-ready first version by the end of the 40-hour budget.

| Assignment requirement | Project interpretation | Repo evidence/file | Status | Remaining gap |
|---|---|---|---|---|
| Build a betting ladder for prediction markets | Windows desktop ladder terminal with real Polymarket and Kalshi market data, gated real live execution capability, and provider-neutral architecture | `docs/product/PROJECT_BRIEF.md`, `docs/specs/FUNCTIONAL_SPEC.md`, `docs/specs/DESKTOP_APP_SPEC.md` | Covered conceptually | See `docs/ai/context-handoff.md` for implementation status |
| Convert opportunity into product, GTM, monetization, and launch-ready/downloadable version in 5 days / 40h | Product + downloadable Windows installer from landing + launch plan + desktop app vertical slice + fair monetization model | `docs/product/MVP_SCOPE.md`, `docs/product/USER_AND_GTM.md`, `docs/product/MONETIZATION_MODEL.md`, `docs/launch/LAUNCH_PLAN.md` | Covered conceptually | Validate with working build, installer, landing download flow, and launch checklist |
| Use gpt-5.5/Codex efficiently | Routed context, local skills, small goals, quality gates, and review roles only | `AGENTS.md`, `docs/ai/CONTEXT_INDEX.md`, `docs/ai/CODEX_GOALS.md`, `.agents/skills/`, `docs/ai/REVIEW_ROLES.md` | Covered | Use `docs/ai/context-handoff.md` for current next action |
| Keep a simple time log | Day 1 logged as 8 hours; Day 2 should be logged as work is completed | `docs/status/TIME_LOG.md` | Covered | Keep current during implementation |
| Justify important decisions proportionally | ADRs and decision sections in specs | `docs/adr/`, `docs/architecture/`, `docs/specs/` | Covered | Update ADRs if scope changes |
| Store research, assumptions, rejected alternatives, and justifications in Markdown | Research and source-quality docs | `docs/research/`, `docs/product/`, `docs/legal/`, `docs/adr/` | Covered | Keep source list curated |
| Define fair monetization | Transparent free/pilot plus provider-approved fee/revenue-share hypothesis; subscription remains a fallback/private-team option | `docs/product/MONETIZATION_MODEL.md`, `docs/adr/ADR-0010-fair-monetization-model.md` | Covered conceptually | Do not implement billing before core product works |
| Learn fundamentals if needed | Specs define order book, order entry, risk, exposure, market selection | `docs/specs/ORDER_ENTRY_SEMANTICS.md`, `docs/specs/MARKET_DATA_SPEC.md` | Covered | Add glossary only if needed |
| Provide account/risk metrics | Global, market-level, and provider-level PnL, available funds, open-order amount, and exposure | `docs/specs/FINANCIAL_METRICS_SPEC.md`, `docs/specs/FUNCTIONAL_SPEC.md` | Covered conceptually | Implement only after provider account/position data is available or mark unknown explicitly |
| Screen recordings | Screen recordings are not evaluated and are not necessary | `docs/launch/LAUNCH_READINESS_CHECKLIST.md`, `docs/product/USER_AND_GTM.md` | Covered | Do not spend product-build time on recordings |
| Day 1: research, product, user, GTM, implementation scope | Consolidated daily report plus time log | `docs/status/DAILY_REPORT_2026-06-01.md`, `docs/status/TIME_LOG.md` | Covered | None for Day 1 timing; it is closed at 8h |
| Day 2: start building and resolve remaining ambiguities with definitions/tests | Goal 01/02 sequence and tightened specs | `docs/ai/context-handoff.md`, `docs/ai/CODEX_GOALS.md`, `docs/specs/ORDER_ENTRY_SEMANTICS.md`, `docs/specs/MARKET_SELECTION_SPEC.md` | Covered as plan | Goal 01 and Goal 02 are complete; use `docs/ai/context-handoff.md` for current next action |
| Days 3-5: implement, test, debug, launch/prototype ready | Vertical slice and launch checklist | `docs/launch/LAUNCH_READINESS_CHECKLIST.md`, `docs/launch/LIVE_SMOKE_TEST.md` | Covered as plan | Execute during implementation |
| Early review before deep implementation | Pre-code audit and documentation alignment patch | `docs/status/PRE_CODE_AUDIT_2026-06-01.md`, `docs/status/DOC_ALIGNMENT_PATCH_2026-06-02.md` | Covered | Historical traceability only; use `docs/ai/context-handoff.md` for current next action |
