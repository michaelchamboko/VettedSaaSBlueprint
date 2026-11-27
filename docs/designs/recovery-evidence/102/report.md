# Ticket 102 registered-evidence investigation

Date: 27 November 2026

Branch: `codex/recovery-102`

Base: `codex/recovery-evidence-96` at `32204bd7c4c795e8a985e2657189862235f88378`

Latest integration tip incorporated for final verification: `3c8c5914c59f01ed67db319fec510c8576347be5`

Investigated product revision: `f026bca8b53aecca829262e9a27820ac6d078892`

Scope: synthetic investigation only. No product code, database, network, real article, deployment, publication, or release state was changed.

## Sources and authority

- User directive: investigate [GitHub issue 102](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/102) only, using its parent [issue 96](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/96) and the recovery handoff dated 27 November 2026.
- Issue 102 acceptance criteria: vary relevance, support, integrity, and freshness independently; trace research recovery and approval invalidation; resolve retained evidence dependencies; bind fresh judgments to the examined revision; keep unknown historical provenance.
- Issue 96 testing decision 8: use an isolated evidence store and the normal supervised controller boundary.
- Repository fact: `git merge-base --is-ancestor f026bca8b53aecca829262e9a27820ac6d078892 HEAD` succeeded before the probe. The assigned branch therefore contains the investigated product revision.

The exact checkout does not contain ADR 0003 or `docs/designs/orchestrator-introspection/findings.md`. Those references exist in the handoff and issue 96, but were not available as local source files on the assigned base. The live issue bodies were read from GitHub. Findings below distinguish the expected behavior recorded there from the observed product behavior.

## Test seam

Matt TDD seam agreement was applied to two public boundaries:

1. `createResearchRegistryPlan`, `validateRegistryDecisionPlan`, and `validateRegistryDecisionAgainstEvidence` for the isolated canonical research register.
2. `executeFixtureCommand` with `createSupervisedImportExecutor` for the normal controller entry point. Worker output is supplied through the same persisted work/result packets used by the existing synthetic tests.

The probe is [registered-evidence-probe.ts](./registered-evidence-probe.ts). It makes no network or database calls. Its captured result is [observations.json](./observations.json).

## RED result

Command:

```text
node --import tsx docs/designs/recovery-evidence/102/registered-evidence-probe.ts --assert-required
```

The required-behavior assertion failed against the exercised registration results, not the static source inventory:

```text
AssertionError: every retained evidence class must have a first-class canonical register record
false !== true
```

The exact output is retained in [red-output.txt](./red-output.txt). This is a product gap observation, not a production fix request.

## Observed register decisions

The valid control was reusable. Each single-dimension mutation was rejected while the corresponding gap decision remained valid:

| Dimension | Reuse result | Recovery classification |
| --- | --- | --- |
| Valid control | accepted | none |
| Relevance | `RESEARCH_REGISTRY_REUSE_NOT_CURRENT` | missing |
| Support | `RESEARCH_REGISTRY_REUSE_CONFLICTING` | conflicting |
| Integrity | `RESEARCH_REGISTRY_REUSE_NOT_CURRENT` | missing |
| Freshness | `RESEARCH_REGISTRY_REUSE_NOT_CURRENT` | stale |

This behavior is measured at the registry validator boundary. Relevance means exact claim text plus product context. Support means a current `SUPPORTED` verdict with successful access. Integrity means retained bytes hash to the registered digest. Freshness means `expiresAt` is later than the decision time.

The register also retained an unknown historical lead with null source hash, retrieval time, claim identity, claim text, and claim update time. The fresh decision remained bound to the current plan fingerprint and source fingerprint. The historical nulls were not converted into facts.

## Observed controller recovery

Both a missing gap and an expired registered candidate went through persisted planning, acquisition, writeback, validation, and the normal controller resume path. Each reached `TRANSFORMING`. External worker calls were zero because the probe supplied synthetic work results.

The invalid-evidence case began at `VALIDATING` with current research plus assessment, editorial, presentation, and production references. A material-claims failure caused the controller to:

- return to `RESEARCHING`;
- clear the research and all four downstream approval references;
- record the invalidation cause and every prior reference in the stage receipt;
- keep every prior referenced file readable;
- acquire and validate a new research record; and
- resume at `TRANSFORMING` with a new research reference bound to the unchanged article source fingerprint.

No approval survived this case. That result is correct for the seeded records because all four were downstream of the failed research. The current contract exposes no independent approval slot that can be retained through research recovery, so the requested surviving-independent-approval case is unreachable rather than silently treated as passing.

## Retention and registration

`freezeEvidenceGraph` followed and froze integrity-bound references for research, a rejected finding, its resolution, an editorial judgment, a browser observation, and production proof. After the mutable originals changed, snapshot reads returned the original bytes for all six categories. Eight files were frozen, including the envelope and capability manifest.

This proves byte retention through the generic evidence graph. The probe records that result separately from a static boundary inventory. Its requirement check uses only exercised product boundaries: research traversed the real registry plan and validators, while the other five classes are marked unreachable because no corresponding boundary exists. It does not treat source-inspection booleans as runtime proof.

- Research has a first-class `ArticleResearchRegistry` prepare/commit interface, plan, decision, writeback, idempotent binding, and provenance fields.
- Assessment findings, editorial judgments, browser observations, and production proof can be referenced and frozen, but they are active evidence records rather than rows in a shared canonical evidence register.
- A rejected assessment finding has a disposition and evidence references. The active schema has no separate integrity-bound resolution record, so the probe could retain a synthetic resolution reference but could not validate it through a product resolution contract.

## Expected behavior versus observed evidence

Expected from issues 102 and 96:

- reuse only when relevance, support, integrity, and freshness hold;
- reacquire missing, stale, conflicting, or invalid research;
- invalidate dependent approvals while preserving independently valid approvals with reasons;
- register research, rejected findings and resolutions, editorial judgments, browser observations, and production proof with integrity and retention dependencies;
- bind fresh judgments to the examined revision and preserve unknown historical provenance separately.

Observed:

- Research reuse and recovery meet the four-dimension decision rule in the exercised cases.
- Missing, stale, and invalid research complete the normal controller recovery path.
- All seeded downstream approvals are invalidated with an explicit cause, and their prior bytes remain readable.
- The source fingerprint binds the fresh research decision and evidence to the examined article revision. Unknown legacy research provenance remains explicitly null.
- Exact bytes for all requested evidence categories can be frozen and replayed.
- Canonical registration outside research, a first-class finding-resolution record, and an independent approval survivor are not reachable through the current product contract.

## Ticket-specific checks

```text
node --import tsx docs/designs/recovery-evidence/102/registered-evidence-probe.ts --assert-required
FAIL (expected RED: first-class register coverage is incomplete)

node --import tsx docs/designs/recovery-evidence/102/registered-evidence-probe.ts
PASS

node --test --test-concurrency=1 --import tsx tests/article-research-registry.test.ts tests/article-import-research-recovery.test.ts tests/article-workflow-evidence.test.ts
PASS (48 tests)
```

General repository gates are intentionally left to the integration owner, as directed.
