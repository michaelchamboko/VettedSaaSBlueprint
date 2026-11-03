# Independent implementation review

Initial reviewed commit: `4ddadadc8db44ed8f6eeae3ee040d5c1f56dd9e9`. A native fresh-context reviewer inspected the committed diff against origin/main, the approved plan, automation source, entry points and tests. It did not execute real imports, model runs or publication.

The reviewer identified three P1 gaps:

1. Checker and detector receipts accepted unrelated successful commands. The correction requires pinned tool identity, version, exact arguments, bound inputs and tool-specific clean output.
2. Editorial instruction references were detached from the captured model exchange. The correction includes actual pinned instruction text in the selected exchange and rejects missing or retroactively attached instructions.
3. Presentation proof survived CSS or component changes. The correction captures renderer, source-data, asset and configuration inputs and rejects changed files or inventories. Historical proof uses frozen inputs rather than current files.

Focused regression tests for these corrections passed. The initial review was not a clean-head approval.

The next review at `fc6007e` found two remaining P1 issues. Repair digests omitted three submitted evidence paths, and detector captures could cover unrelated files. Commit `ce1288b` includes all three typed evidence paths and requires complete format-specific detector coverage. Work packets expose the same targets that validation requires.

The fresh-context reviewer completed exact-head review of `ce1288b` and reported both findings resolved, with no remaining findings in the reviewed scope. It read the committed changes, surrounding implementation and regression assertions and confirmed a clean working tree. It did not run tests or live operations. The coordinating agent ran the checks recorded in `verification.md`.

Integration tests also found a submission-digest bug: public route paths were treated as evidence files during repair. Discovery now follows typed evidence references and explicit file fields. The regression confirms that public routes are ignored while changed dependency bytes still change the submission digest.

No article or publication authority was exercised. The owner restricted this work to automation code and synthetic verification; commits remain local.

## PR 57 follow-up

After the owner authorized merge and deployment, GitHub Codex review of `3c8d804` identified three further P1 gaps. The corrections bind full assessment inputs and source snapshots to the captured exchange and judgment, preserve work-packet dependencies across work-to-repair transitions, and repeat workflow validation on the merged checkout before deployment. The targeted assessment suite passed 13 tests, the repair suite passed 7, and the merged-rendering regression passed with zero deploy or rollback calls. The updated head requires fresh PR review and full validation before merge. Real article runs remain outside the authorization.

Full validation of `4ca0423` passed 458 tests with zero failures and three Windows symlink-privilege skips. Its GitHub review found one remaining design-session replay gap. A targeted independent local review identified the same omitted-input assumption in editorial fidelity exchanges. The correction captures complete editorial inputs and before/after fidelity pairs, verifies the receipt's initial fingerprint, and captures the rendering manifest and scoped renderer sources in design exchanges. The corresponding judgments repeat those identities. All 16 focused evidence tests passed, including attempts to re-export old exchanges with newly bound references. This correction must receive current-head review before release.
