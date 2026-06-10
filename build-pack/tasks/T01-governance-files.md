# Task T01 — Governance Files

## Context Baseline

- `build-pack/03-implementation-contract.md`
- `docs/deployment/dependency-ownership.md`

## Must-Haves

- Add project-specific governance files if approved.
- Preserve deployment-first dependency ownership.
- Do not change production logic.

## Target Artifacts

- `AGENTS.md`
- `project_rules.md`
- `state.md`
- `findings.md`

## Verification Command

```powershell
Test-Path AGENTS.md; Test-Path project_rules.md; Test-Path state.md; Test-Path findings.md
```

Expected: all return `True` after approval and creation.
