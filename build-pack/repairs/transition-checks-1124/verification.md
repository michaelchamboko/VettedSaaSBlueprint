## Measured behavior

A synthetic article with valid research and assessment evidence advanced through REFINING on both revisions. The baseline at 2b1e285 entered the full research validator twice in one evaluation. The revised evaluator entered it once. Replacing the source snapshot bytes before a second evaluation produced EVIDENCE_HASH_MISMATCH at RESEARCHING on both revisions.

Resuming an empty version-two folder intake read its run.json twice on the baseline and once on the revised command. The selector holds the intake lease while it checks terminal proofs and rejects multiple processing entries. The standalone intake inspection command remains available.

## Validation boundaries

The intake schema enforces entry shape, statuses and schema version. The loader still compares the requested run ID and checks the V2 revision. The release schema requires each of the nine production flags to be true. Receipt verification, presentation and affiliate verification retain their original call paths.

The assessment validator accepts previously validated research only inside the current evaluation and only for the same path and SHA-256. A standalone assessment verifies its own research. No saved intake, evidence or release record needs migration. A revert restores the previous execution path.

## Folder resume diagnostics

A resume with multiple PROCESSING entries now reports INTAKE_RECONCILIATION_CONFLICT. An invalid terminal proof identifies the entry with INTAKE_TERMINAL_PROOF_INVALID and its relative path. Both failures happen before the selector saves a change. Previously the pre-lease scan wrapped both failures in a serialized check-intake report.

## Focused verification

Nine existing cases passed across intake, state hardening, workflow evidence and release. The new command regression rejected an intake ID mismatch, a missing V2 revision and two processing entries. The conflicting resume preserved the run record byte for byte. The workflow guard and TypeScript checks passed. ESLint reported zero errors and 17 existing warnings.
