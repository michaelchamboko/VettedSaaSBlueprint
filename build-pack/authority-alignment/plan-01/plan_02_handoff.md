# Plan 2 Handoff — Contradictory Execution Guidance

Plan 1 reconciled repository authority and its direct source projections. Plan 2
must update subordinate execution instructions and prove that runtime consumers
enforce the adopted policy. Plan 3 agent-boundary work remains out of scope.

## Plan 1 baseline and result

- Baseline: `e48691c0bcd19043b14de55ad1f124c8e4542e9e`.
- Final commit: pending until gates and independent review complete.
- Amended authority: D01-D10 each contain the controlling cadence-supersession
  rule; D03/D06/D07/D08 also retire the remaining 06:00, 20:00, and 23:00
  programme references locally; `planning.md` registers C001-C005/M001-M005.
- Stable source coverage: 12 documents and 1,424 headings.
- Derived graph: 791 claims, 8 directives, 868 relationships, 112 candidates.
- Active build-pack projections: 803 requirements, check mode clean.
- Resolved during closeout: line-ending-aware hashes, committed-repository
  lifecycle verification, D02 identity preservation, active source projections.
- Release status: pending current-head review and release evidence.

## Ordered Plan 2 candidates

### P2-001 — Reconcile article-import merge instructions

- Adopted policy: after every required gate and independent current-head review
  passes, merge and deploy automatically; owner approval is not a release gate.
- Exact consumers: `.agents/skills/external-article-import/SKILL.md` lines 28
  and 39; `.agents/skills/code-review/SKILL.md` lines 5 and 50–56.
- Current mismatch: these instructions wait for owner-approved merge or prohibit
  automatic merge.
- Bounded change: state the adopted release rule in both skills. Do not create an
  article-import exception unless the owner issues a new directive.
- Existing coverage: build-faster workflow tests and article release tests.
- Missing coverage: behavior proving a reviewed, green article-import head may
  merge without an extra approval state.
- Acceptance: no subordinate instruction or adapter requires owner merge after
  the exact reviewed head passes every mandatory gate.

### P2-002 — Remove scheduled-heartbeat semantics from article import

- Adopted policy: article-to-page work starts only from an explicit manual or API
  trigger in the primary checkout. Scheduled execution and secondary-worktree
  intake are prohibited. An already-triggered run may be resumed explicitly.
- Exact consumer: `.agents/skills/external-article-import/SKILL.md` lines 30
  and 32–39 plus the import runner and recovery tests.
- Current mismatch: “heartbeat window” and “resume-pending” language can be read
  as a recurring scheduler that starts or advances work independently.
- Bounded change: define supervision as continuation of a named, already-triggered
  import; remove any recurring-window authority; require import/run identity.
- Existing coverage: article-import automation, recovery, supervised, and release tests.
- Missing coverage: negative behavior proving no import starts without an explicit trigger.
- Acceptance: instructions and runner reject schedule-only or unbound resume calls.

### P2-003 — Align the landing-page orchestrator’s design requirements

- Adopted policy: every qualifying UI change uses both
  `design-taste-frontend` and project-local Impeccable; Impeccable remains the
  design authority within that pair.
- Exact consumer: `.agents/skills/landing-page-production-orchestrator/SKILL.md`
  line 10 and page-building routing tests.
- Current mismatch: the orchestrator names only Impeccable as mandatory and
  routes other skills conditionally.
- Bounded change: explicitly require both skills before UI implementation and
  retain the existing Impeccable context/critique/audit/detect sequence.
- Acceptance: orchestrator and routing tests require both skills for every page,
  component, layout, typography, style, or motion change.

### P2-004 — Audit active consumers for retired programme semantics

- Adopted policy: the research/editorial/optimisation/watchdog programme,
  scheduled cloud execution, 06:00 editorial brief, 20:00 rescue checkpoint,
  23:00 takeover, premium rescue, and recurring daily publishing obligation
  remain retired.
- Search surfaces: skills, prompts, manifests, runtime entry points, tests,
  release configuration, and active build-pack requirements.
- Current state: Plan 1 updates source authority and direct projections; explicitly
  retired requirement history remains with `owner-retired` disposition.
- Bounded change: remove or correct active execution semantics; preserve clearly
  labelled historical evidence and generic reliability/review/release rules.
- Acceptance: every retained occurrence is classified as current retirement text,
  historical evidence, or generic non-scheduled reliability behavior.

### P2-005 — Verify enforcement receipts

- Confirm the import adapter refuses release without current
  `ImportCodeReviewV1` and unchanged-fingerprint `EditorialEvidenceV2` with
  three passes, a different-model-family cleanse, fidelity review, and 5/5 CLEAN.
- Confirm manual/API runs remain authenticated, idempotent, observable, retryable,
  and outside latency-sensitive public requests.
- Add only missing behavioral coverage; preserve the existing release architecture.
- Acceptance: negative tests fail for missing or stale receipts and pass for the
  exact reviewed artifact.

## Conditional maintenance item

If GitNexus is refreshed, it must target the selected checkout, use pinned
version 1.6.10 in index-only mode, and regenerate
`GITNEXUS_RECONCILIATION.json`. The non-skipped verifier must then prove exact
node and relationship sets. GitNexus remains navigation evidence.

## Plan 3 observations

- Consolidation must not reintroduce retired schedules as agent capabilities.
- Keep one main loop accountable; use separate agents only for independent
  bounded work or black-box review.
- Measure actual context pressure, parallelism benefit, and failure isolation
  before folding or retaining an agent boundary.

## Readiness

Plan 2 may be prepared after Plan 1’s exact commit is independently reviewed and
its release status is recorded. An implementer should not repeat the authority
investigation; use the adopted policies and exact consumers above.
