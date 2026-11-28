# Issue 105 gate handoff and retention investigation

## Result

The current controller gives each productive worker readable inputs, but it does so by embedding the full import record in the work packet. It does not declare accepted outputs, required next inputs, retention dependencies, disposal candidates, or unclassified material. A synthetic incomplete-cleanup marker does not block the next gate. The normal entry point dispatched RESEARCHING work and left the marker and verified temporary copy untouched.

The existing evidence store keeps referenced bytes readable by hash. Terminal verification also freezes a reference graph. Those mechanisms preserve evidence, but they are not the per-gate cleanup and 30-day retention protocol accepted in ADR-0004. No general cleanup operation, later-gate cleanup entry point, explicit manual cleanup entry point, disposal manifest, or expiry recheck was found in the inspected article-import controller paths.

This investigation changed no product code and moved or deleted no real artifact.

## Authority and baseline

- **User directive.** GitHub issue #105, "Verify what each gate hands forward and may discard", authorizes investigation and synthetic tests only. Its traceability is user stories 11, 12, and 27 and testing decisions 3 and 10 in issue #96.
- **Accepted design.** Primary-checkout `docs/adr/0004-clean-up-after-passed-article-gates.md`, headings "Decision", "Consequences", and "Evidence". The file records the owner's Q34 correction and Q35-Q39, Q42-Q44, and Q48 decisions. The ADR says implementation still needs a planning amendment.
- **Investigation source.** Primary-checkout `docs/designs/orchestrator-introspection/findings.md`, heading "Handoff and evidence dependency map", and the 27 November handoff in `C:/Users/micha/AppData/Local/Temp/orchestrator-recovery-spec-handoff-2026-11-27.md`.
- **Code baseline.** Branch `codex/recovery-105` started at integration commit `d3d49f4c132d5d6b2c597df10d189d1564d89a4d`. `src` and `tests` have no diff from investigated deployment commit `f026bca8b53aecca829262e9a27820ac6d078892` at this baseline.
- **Graph limitation.** codebase-memory-mcp was ready, but it indexed another worktree at `6383cf8`, not this branch. The graph guided the search; every claim below was checked in the source on this worktree.

## Current handoff map

The table separates observed controller behavior from ADR-0004's expected disposition. "Expected candidate" means the policy permits classification only after dependency checks. The current controller does not make that classification.

| Passed gate | Accepted output observed in current state | Input the next activity can read | Constraints and retained dependencies | Expected disposal candidate | Material current code leaves unclassified |
| --- | --- | --- | --- | --- | --- |
| INGESTING | Immutable captured source reference, source fingerprint, normalized source, import identity, and stage receipt | RESEARCHING packet gets `sourcePath`, full `record`, workflow requirements, registry plan, packet identity, and result contract | Keep source bytes, intake snapshot membership and order, import identity, lease identity, and source fingerprint | A separately verified redundant temporary copy | Intake work products and any temporary copies have no gate disposition record |
| RESEARCHING | Validated research evidence reference plus registry decision, retained snapshots, and optional writeback | TRANSFORMING packet gets the full record; its result contract asks for the draft artifact, assessment, and format | Keep source snapshots, excerpts, retrieval dates, conflicts, registry decision and writeback, research execution, and active evidence generation | Superseded research drafts or captures with no approval, finding, or recovery dependency, after 30-day archive | Plan/acquisition work and result packets, abandoned notes, and redundant captures are not classified |
| TRANSFORMING | Complete artifact path, accepted assessment references, format, and commercial transformation context | REFINING packet gets the full record, requirements, result schema, and publication proposal paths | Keep source and research identity, buyer or intent brief, draft assessment, captured review, findings, and exact affiliate constraints | Superseded draft or assessment capture only after dependency review and 30-day archive | Historical packet files remain mixed into the submission fingerprint and have no disposition |
| REFINING | Exact approved artifact, content approval, assessment, editorial execution, format quality, and publication proposals | VALIDATING gets the full record. When applicable it also gets hero handoff data and captured rendering inputs | Keep the rewrite chain, independent judgments, final assessment, checker execution, content approval, active findings, and rejected evidence and resolutions | Dependency-free superseded rewrite drafts or captures after 30-day archive | Prior work/results and unreferenced editorial material have no cleanup manifest |
| VALIDATING | Bound hero, presentation evidence, validation receipt, rendering identity, and presentation record | RELEASING gets the full record, required release files, release steps, approvals, and result contract | Keep desktop, mobile, normal-motion and reduced-motion observations, image generation and inspection, design review, detector execution, rejected findings and resolutions | Verified temporary render copies; superseded captures only after 30-day archive | Detector scratch files and superseded screenshots have no per-gate disposition |
| RELEASING | Reviewed head, PR and merge evidence, deployment identity, production verifier reference, operation journal, and rollback target | VERIFYING has no worker packet. The controller reads the saved record directly and validates release, presentation, production, review, merge, and deployment correspondence | Keep current approvals, operation journal, review and merge proof, production observations, rollback target, and uncertain external outcomes | Verified temporary checkout or tool copies that are not referenced by release or rollback evidence | Release work/results and local operational leftovers have no general classifier |
| VERIFYING | Terminal evidence, frozen evidence graph, publication key, and immutable IMPROVE run snapshot | LIVE creates an IMPROVE assignment. The IMPROVE packet gets the full record, `runRef`, `terminalRef`, checklist, skill instructions, and issue keys | Keep source and artifact closure, review/merge/deployment correspondence, production proof, frozen files, publication history, and retry totals | The raw source copy is the one observed product deletion, and only after terminal evidence has frozen its bytes | No 30-day archive or manual expiry path exists for other material |
| LIVE | Frozen publication identity, terminal reference, release, IMPROVE assignment, findings, resolutions, and handoff references | IMPROVE reads the terminal and run snapshots plus the full record | Keep publication proof, unresolved improvement findings, repair worktree and review state, resolution history, regression evidence, rollback and recovery dependencies | Dependency-free superseded IMPROVE drafts or captures under the same 30-day rule | Completed IMPROVE packets and abandoned repair captures have no declared disposition |

## Source observations

1. `src/lib/article-import/supervised-executor.ts:50-58` advances INGESTING directly, verifies VERIFYING directly, and creates worker packets only for RESEARCHING through RELEASING.
2. `src/lib/article-import/supervised-executor.ts:85-94` and `207-219` put `record` into research and general work packets. The result schemas at lines 18-40 name accepted stage outputs, but there is no handoff or disposal declaration.
3. `src/lib/article-import/supervised-executor.ts:229-260` consumes the result and advances the import. It validates current evidence, but it does not run or resume cleanup before dispatch.
4. `src/lib/article-import/engine.ts:279-309` includes every persisted `.work.json` and `.result.json` file in `canonicalSubmissionFingerprint`. Deleting history can therefore change repair eligibility even when active article inputs did not change.
5. `src/lib/article-import/execution-evidence.ts:37-68` reads and hash-checks referenced bytes. Lines 93-115 freeze referenced bytes for terminal history. `src/lib/article-import/engine.ts:782-813` creates terminal evidence and the IMPROVE snapshot, then deletes the raw source copy. None of these paths implements per-gate expiry or dependency re-claim.

## Synthetic evidence

The agreed test seam was the normal controller entry point, `executePendingImport(createSupervisedImportExecutor(root))`, with an isolated repository root and fixture research registry. This catches dispatch and packet behavior. It does not claim to test a cleanup protocol that does not exist.

The red run set `RECOVERY_105_ASSERT_REQUIRED=1`. It required an incomplete cleanup to block dispatch. The run failed because the controller returned a RESEARCHING work continuation. See `red-output.txt`.

The observational run passed two checks:

1. The normal controller packet exposed readable captured-source bytes and the full record. It had no explicit handoff classification. The diagnostic cleanup marker and verified temporary copy remained present while RESEARCHING work was dispatched.
2. A test-only classifier used fixed time `2026-11-27T12:00:00.000Z`. It classified a verified temporary copy for immediate disposal, retained a 29-day archive, made an unclaimed 30-day archive eligible, retained the same expired capture when a new dependency claimed it, and preserved unclassified bytes. Active work, rejected evidence, resolutions, diagnosis, registered evidence, publication proof, rollback, and IMPROVE stayed readable.

`observations.json` records the exact dispositions and reasons. `test-output.txt` records the passing run. The classifier is expected behavior only. It is not application code and did not delete its synthetic bytes. Trigger parity, retry identity, repair totals, and worker-call preservation remain untested because this classifier receives no controller trigger or persisted operation state.

## Unreachable paths and future acceptance

Three required paths are unreachable through the current controller and remain skipped future acceptance tests:

1. **Later-gate cleanup.** No durable cleanup operation can be interrupted after archive copy, after reference registration, or before original removal. Future acceptance must restart through the normal entry point, reconcile bytes and references, resume the same operation, and block next-gate dispatch until the handoff verifies.
2. **Explicit manual cleanup.** No public manual cleanup entry point exists. Future acceptance must use the same operation record and dependency rules as later-gate cleanup, including the three-attempt pre-mutation retry budget across restarts.
3. **Archive reference resolution after removal.** Current terminal snapshots resolve frozen references, but there is no per-gate archive registration and expiry protocol. Future acceptance must prove that retained evidence stays readable after archive registration and original removal, then recheck disposal at day 30 with a dependency claimed immediately before removal.

The future check must also prove trigger parity and that cleanup preserves the import's active retry identity, article repair totals, accepted gate result, and worker-call count. Those claims were not tested by the classifier. It must record a reason for every retained, archived, removed, or unclassified item. A missing file or a clean temporary directory is not enough.

## Commands run

```text
RECOVERY_105_ASSERT_REQUIRED=1 npx tsx --test docs/designs/recovery-evidence/105/gate-handoff-probe.test.ts
# intended red: 1 passed, 1 failed, 3 skipped

npx tsx --test docs/designs/recovery-evidence/105/gate-handoff-probe.test.ts
# observed green: 2 passed, 0 failed, 3 skipped
```

Each command allocates a unique `.scratch/recovery-evidence-runs/105-*` directory. Observation mode prints its `observations.json` path and distinguishes `testedCheckoutRevision` from `investigatedRevision`. The tracked observation, red output, and test output remain immutable historical snapshots.

No real import, worker, model, database, GitHub mutation, release, deployment, publication, cleanup, archive move, or artifact deletion ran.
