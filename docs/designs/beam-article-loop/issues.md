# BEAM-POLICY-001 issues log

## BEAM-ISSUE-001 — Sequencing: implementation preceded packet registration
Status: acknowledged (not fixable retroactively).
Evidence: the worker report and retained execution logs record code edits before planning.md/execution-state registration; these were uncommitted edits.
Fix verification: packet registered now in planning.md and build-pack/execution-state.json.

## BEAM-ISSUE-002 — 2.2.6 unbound attachment accepted
Status: fixed.
Evidence: .mece/parent-attachment-probe.ts (FAIL observed: unbound attachment accepted).
Fix: dedicatedV2Exchange user schema now `files: z.array(z.unknown()).max(0).optional()`.
Fix verification: probe now prints PASS.

## BEAM-ISSUE-003 — Normalizer accepted opencode v1.19.4 prefix
Status: fixed.
Evidence: parent review point 3.
Fix: normalizeOpenCodeVersion only strips "opencode v" for 2.2.5/2.2.6; rejects prefixed 1.19.4.

## BEAM-ISSUE-004 — Preflight accepted any nonempty model map
Status: fixed (code).
Evidence: preflight.ts.
Fix: require `modelFamilies["opencode-go/beam-free"]` nonempty string. Config-level Beam-only removal proposed to parent.

## BEAM-ISSUE-005 — Mixed rivalFamilyCleanse/beamReview receipts
Status: fixed.
Evidence: workflow-evidence.ts validateEditorialExecution.
Fix: receipt pass policy must match companion fourth-pass name.

## BEAM-ISSUE-006 — Review session distinct only from index 0
Status: fixed.
Evidence: workflow-evidence.ts.
Fix: priorSessions set includes all rewrite pass sessions; reused review session rejected.

## BEAM-ISSUE-009 — Executable Bash scripts forced CRLF
Status: fixed (attrs + pins).
Evidence: Greptile P1; parent normalized 5 .sh files to LF.
Fix: .gitattributes changed those 5 paths to eol=lf; verify-agent-workflow.mjs expected hashes updated to LF values; build-faster workflow test passes verifier. Exact pin deltas in .mece/bash-pin-deltas.json (parent applies lock).
Fix verification: verify:agent-workflow PASS.

## BEAM-ISSUE-010 — 2.2.6 nonempty files array not tested
Status: fixed.
Evidence: Greptile P2.
Fix: added explicit real-shaped nonempty files negative and absent/empty valid tests in tests/opencode-v2-evidence.test.ts.

## BEAM-ISSUE-008 — Current transitions accepted legacy rival-family passes
Status: fixed.
Evidence: parent P1 review (workflow-evidence.ts positional expectedNames).
Fix: validateEditorialExecution now requires `beamReview` unless a frozen historical snapshot is active; legacy rival-family evidence validates only under `withEvidenceSnapshot`. Current transitions, duplicate reuse and new approvals require Beam.
Fix verification: parent receipt-family probe legacy case preserved; current false-family case rejects.

## BEAM-ISSUE-007 — Missing sanitized 2.2.6 fixture
Status: fixed.
Evidence: harmless capture session ses_e47ba0cedffeLLf3HWbT4ReGyp; sanitized fixture tests/fixtures/opencode-2.2.6-beam-export.json retains the selected exchange without reasoning.
Fix verification: Codex inspected the retained fixture and found no reasoning content. Runtime shape and binding checks are covered by opencode-v2-evidence.test.ts using synthetic exchanges.

## Parent verification and additional issues
Codex maintains this section as the orchestrator; OpenCode authored implementation and test changes.

- False receipt family accepted: independently reproduced by changing only receipt family claims to false-family while execution evidence retained reflection-beam. After OpenCode's repair, the unchanged probe rejects with EDITORIAL_RECEIPT_WRITER_FAMILY_MISMATCH; legacy case still passes. Logs retained in .mece/parent-receipt-family-probe*.log.
- Attribute regression: an intermediate edit removed existing checkout rules and caused14 line-ending-only diffs. OpenCode restored original rules and appended exact text eol=crlf entries. Codex verified all14 Git checkout-filter outputs match pinned hashes; normalized content diffs are absent.
- Incorrect worker reports: earlier reports classified policy failures as environment errors, cited stale skill hashes, and reused a prior full-suite result without qualification. Reports are retained under .mece/cells/BEAM-POLICY-001. REPORT.md now separates the prior full suite from focused checks; independent current-source gates remain the release evidence.
- Model/family conflation: instructions said opencode-go/beam-free was a family value. OpenCode corrected family to reflection-beam and required a review session distinct from all three rewrites. Codex inspected all capability pins and updated only Eleanor's exact changed hash to dbbecfc9fb6acc11f0ea21bae53472849d0625831780847bf18c19c021329fac.
- Environment recovery: restored the primary repository history and exact dependencies, prepared an isolated worktree with real local dependencies, and installed Chromium. The original import record, source bytes and lockfile remain hash-identical to the preserved baseline.
- Release authentication remains unresolved: two Vercel device logins ended without confirmed sign-in. No article has been published by this run. Final acceptance requires the actual primary-checkout workflow, reviewed release and retained production verification.

- PR60 review follow-up: Codex identified current approvals accepting legacy rival-family evidence; Greptile identified CRLF Bash checkout rules and absent nonempty-files regression coverage. Beam corrected the runtime branch, current/historical fixtures, five LF rules with matching pins, and export tests. Historical statements above describe earlier verification, not acceptance of this follow-up.
- Parent inspection found two omitted acceptance items in the first follow-up report: the 2.2.6 tests were still nested and checkout-attribute regression coverage was absent. Same-session Beam corrections made the tests top-level and added actual-byte, hash, and effective Git attribute checks. OpenCode remains the implementation author; parent review identified and routed these omissions.
- The previous all-CRLF checkout verification was insufficient for executable Bash portability. Five Bash paths now use LF, while nine other pinned files retain CRLF. Only newline representation and its corresponding digests changed; upstream script content and provenance remain unchanged.
