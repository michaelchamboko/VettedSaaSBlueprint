# Contradiction register

## C-201 — Release guidance contradicts automatic merge policy

- Policy: P-05.
- Authority: AGENTS.md line 6.
- Conflicting locations: external-article-import/SKILL.md lines 28 and 39; code-review/SKILL.md lines 5 and 50–56.
- Runtime evidence: release.ts merges an unmerged pull request after a passed exact-head review; supervised-executor.ts states the same policy; article-import-release.test.ts already proves automatic merge and deployment.
- Classification: contradiction and stale wording.
- Required meaning: owner approval is not an additional release state after all required gates and current-head independent review pass.
- Plan 2 files: both skills; zero-approval instruction coverage; supervised-test description and stale owner-merge fixture fields where they encode the old policy.
- Acceptance: active instructions agree with runtime and a test fails if owner-merge wording returns.

## C-202 — Unbound heartbeat can advance pending imports

- Policy: P-04.
- Authority: AGENTS.md line 35 and planning.md line 14.
- Conflicting locations: external-article-import/SKILL.md lines 30–39; package.json import:article:resume-pending; scripts/import-article.ts; engine.ts resumePendingImports; article-import, recovery, and supervised tests.
- Runtime evidence: the command enumerates every pending record and advances each without a supplied import ID.
- Classification: contradiction.
- Required meaning: creation requires an explicit source trigger; continuation requires an explicit import ID supplied by a manual or API trigger in the primary checkout.
- Plan 2 files: remove the unbound CLI/package entry point and its instruction text; remove the now-unreachable bulk-resume helper if no consumer remains; convert tests to named-run resume and add a negative parser assertion.
- Acceptance: no CLI or documented command advances an unnamed set of imports; named resume remains idempotent, leased, observable, and retryable.

## C-203 — Landing orchestrator omits one mandatory design skill

- Policy: P-06.
- Authority: AGENTS.md lines 60–64.
- Conflicting location: landing-page-production-orchestrator/SKILL.md second paragraph.
- Runtime evidence: the orchestrator names Impeccable as mandatory and treats other specialists conditionally; it never requires design-taste-frontend.
- Classification: stale wording.
- Required meaning: every qualifying UI change begins with both skills; Impeccable retains its context, critique, audit, detect, and correction sequence.
- Plan 2 files: orchestrator skill and page-routing/instruction test.
- Acceptance: a focused test requires both skill names and the established Impeccable sequence.

## C-204 — Transaction rollback lacks independent behavioural proof

- Policy: P-03.
- Authority: planning.md lines 26–30 and the task's migration acceptance criteria.
- Current location: NeonRepositoryIntelligence.replaceSnapshot.
- Runtime evidence: begin, commit, catch, and rollback exist in code; production integrity is clean.
- Classification: missing behavioural coverage, not a demonstrated production defect.
- Required meaning: a failed node or edge insert leaves no partial snapshot replacement.
- Plan 2 files: repository-intelligence database integration test or a bounded isolated-branch verification script.
- Acceptance: inject a deterministic constraint failure inside replacement, observe failure, and prove prior snapshot rows and counts are unchanged.

## Non-contradictions

- Retaining the source manifest and canonical graph is required by planning.md.
- Requiring an explicit database connection for BuildRunner snapshot apply is consistent with AGENTS.md.
- Retired requirement IDs in the execution-state producer are protective traceability, not active schedule authority.
- D02-S-0951e69fb4b0 is the intentionally preserved stable identifier.
