# Useful Codex Prompts

## Start a session

```txt
Read AGENTS.md, docs/ai/CONTEXT_INDEX.md, and docs/ai/context-handoff.md. Do not read the whole repo. Tell me which context route you need for the next task and why.
```

## Ask for a plan before edits

```txt
Before editing files, propose a short plan with the files you will modify, the risk class of the task, and the validation commands you will run.
```

## Ask for a safety review

```txt
Review the current diff for live-execution safety issues: accidental live paths, missing gates, credential leakage, secret logging, geoblock bypass, custody risk, fake identity assumptions, and C0/C1 ambiguity.
```

## Ask for a release review

```txt
Use docs/launch/LAUNCH_READINESS_CHECKLIST.md and docs/launch/LIVE_SMOKE_TEST.md to decide whether the app is ready for a live smoke test, a dry-run demo, or only a paper demo. Be explicit.
```
