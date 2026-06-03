---
name: domain-tdd-ladder
description: Build ladder, order intent, risk, and audit domain through tests first.
---


# Domain TDD Ladder Skill

Use this for `packages/core` changes.

Workflow:

1. Write or update tests first.
2. Keep all functions deterministic.
3. Use explicit result types instead of thrown errors for expected business rejections.
4. Avoid floats for money/probability calculations when precision matters.
5. Cover risk rejection cases.
6. Do not import React, Tauri, provider SDKs, env vars, or network clients.
