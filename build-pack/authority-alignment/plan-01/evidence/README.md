# Execution evidence

This folder retains bounded source excerpts, baseline observations, UID searches,
verification summaries, the consumer trace, and the current review request.

The earlier uncommitted candidate's duplicate full manifests, graph, bridge,
full diff, and run-one manifest were pruned before commit. They duplicated the
canonical checked-in generated records and added more than 20 MB without proving
the current candidate. `plan_results.md` preserves the actions and failures;
the Git commit and PR head OIDs identify the review candidate.

Never treat a dispatched command or a historical snapshot manifest as proof of
the current head. Use the current generated records, verification matrix, command
results, and independently reviewed Git OID.
