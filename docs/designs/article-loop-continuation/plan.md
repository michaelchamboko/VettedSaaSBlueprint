# Implementation plan: local article loop continuation

1. Add backward-compatible continuation metadata and a read-only completion inspector with fixed exit codes.
2. Make packet execution persist bound work/results, classify work, repair, wait, blocked, and complete outcomes, and resume the same import.
3. Persist fixed polling deadlines, release the import lease during waits, and require changed repair fingerprints plus diagnosis after three productive failures.
4. Reconcile release operations by reviewed head, merge commit, deployment commit/ID, and rollback commit before retrying remote effects.
5. Update the article supervisor instructions, add focused interruption/recovery tests, run all repository and article gates, open the PR, obtain current-head review, merge the exact reviewed head, deploy the exact merged commit, and verify production independently.
