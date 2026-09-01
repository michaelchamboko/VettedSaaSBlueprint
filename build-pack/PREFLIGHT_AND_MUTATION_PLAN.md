# GlobalSetup V2 Preflight And Mutation Plan

## Outcome

The generic GlobalSetup runtime is installed only in this repository. Product meaning remains in repository-local sources and contracts. GitNexus is disabled; feature work, migration, publication, and deployment remain blocked pending the unresolved Grommet rows.

## Evidence

- Repository publication baseline: `absent`.
- Source inventory: 12 sources and 1424 headings; digest `0ff15ab1723ae38f53e9f97a09519f765ebf0a930bd0089ef140a212ec03f0ac`.
- GlobalSetup candidate: `7bc03227e78a838c19f8a28d082b1d46e7e2f288`; release status `unreleased-main`; upstream tests `46 passed in 195.444s`.
- GitNexus: `1.6.10`, `PolyForm-Noncommercial-1.0.0`, eligible=`false`.
- GitHub rollback baseline: `956e3a830ea7c11ae4867635ff2edf8c5865c856`.
- Vercel rollback baseline: `dpl_E6HTSnuzu8BK4qCnjJZoZ8xPQH3Q` at `https://vetted-saa-s-blueprint-fszaa5ej7-michaelchamboko-gravityclaw.vercel.app`.

## Generic local runtime installed from the pinned source snapshot

- `.agents/` rules, skills, templates, reviewers, and safeguards
- `.githooks/pre-commit`
- Generic BuildRunner, validation, repository-guard, and wrapper scripts under `scripts/`
- GlobalSetup contract schemas under `build-pack/`

## Files created on first run and deterministically replaced on rerun

- `scripts/generate-globalsetup-intake.py`
- `tests/test_globalsetup_intake.py`
- `build-pack/00-source-to-build-review.md`
- `build-pack/04-existing-codebase-discovery.md`
- `build-pack/05-architecture-map.md`
- `build-pack/10-implementation-plan.md`
- `build-pack/11-task-graph.md`
- `build-pack/12-test-plan.md`
- `build-pack/13-review-gate.md`
- `build-pack/14-rollback-plan.md`
- `build-pack/16-definition-of-done.md`
- `build-pack/PREFLIGHT_AND_MUTATION_PLAN.md`
- `build-pack/capabilities.json`
- `build-pack/execution-state.json`
- `build-pack/grommet-approval.json`
- `build-pack/preflight-evidence.json`
- `build-pack/requirements.json`
- `build-pack/source-manifest.json`
- `build-pack/tasks/SLC-001.md`
- `build-pack/tasks/SLC-002.md`
- `build-pack/tasks/SLC-003.md`
- `build-pack/tasks/SLC-004.md`
- `build-pack/tasks/SLC-005.md`
- `build-pack/tasks/SLC-006.md`
- `build-pack/tasks/SLC-007.md`
- `build-pack/tasks/SLC-008.md`
- `build-pack/tasks/SLC-009.md`

## Files preserved

- `AGENTS.md`, all strategy documents under `docs/`, all existing document-intelligence scripts and artifacts, `.gitnexusrc`, and every external checkout.
- No `.gitnexus/`, dependency, commit, remote, or deployment state is created or changed.

## Rollback

Remove only the locally installed `.agents/`, `.githooks/`, copied generic runtime scripts and schemas, the two intake test/generator files, and the generated `build-pack/` tree. No source document, external checkout, remote history, or production state participates in this installation.
