# Quality Gates

## Standard gate

Run before any task is considered done:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

If a command is unavailable or not configured, it must fail loudly. Fake `echo TODO` validation is forbidden.

Repository helper scripts under `scripts/ai/` are Node `.mjs` runners so the Windows-first project does not depend on Bash or WSL for normal Codex workflow commands. Root scripts call Node with `--preserve-symlinks-main` to avoid Windows sandbox path-resolution failures on this workspace path.

## Live execution gate

Run before enabling live execution:

```bash
pnpm ai:live-preflight
```

The live preflight is an environment/config preflight, not full live approval. It must confirm:

- `LEGAL_GATE_STATUS=APPROVED`;
- `ENABLE_LIVE_TRADING=true`;
- jurisdiction approved;
- geoblock check passed at runtime;
- credentials available through an approved local CredentialProvider;
- max order stake set;
- max market exposure set;
- one-click disabled by default;
- audit log enabled;
- no C0 issues.

A successful preflight does not authorize live trading by itself. Runtime legal, geo, credential, C0/C1, user acknowledgement, and audit checks must still pass inside the app.

## Review gate

Ask Codex to review its own diff for:

- boundary violations;
- hidden live execution paths;
- untested domain logic;
- accidental secret logging;
- unapproved scope creep;
- missing docs updates.

## Placeholder scripts

Placeholder scripts must fail loudly. Commands such as `echo "TODO"` are forbidden for `typecheck`, `lint`, `test`, or `build` because they create false validation passes.


## Fake validation policy

Validation commands must never pass because of placeholder scripts. Package scripts must either run real tooling or fail loudly. In this repo version the target commands are real command names, but they may fail until Goal 01 installs/configures the toolchain and source entrypoints:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

A quality gate that cannot run is a blocker, not a pass.
