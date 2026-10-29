# Baseline and migration evidence

## Repository identity

- Investigation baseline: ccc2e1de3206f21b4e710fbc70c1e783079e0b69.
- Merge parents: b67a50425df71a3c98ee36f9543ddeadd815457d and 68b1580f18eed3aacce76a108fb196331dbf80a7.
- Merge subject: Replace repository intelligence with Neon (#40).
- The reviewed candidate and merge commit share tree e819f8e61469f4ac63881760dd2e8de4c48ec080.

## Migration boundary

Command:

    rtk git diff --name-status b67a50425df71a3c98ee36f9543ddeadd815457d..68b1580f18eed3aacce76a108fb196331dbf80a7

Observed:

- 123 tracked files changed.
- 1,082 lines were added and 10,125 removed.
- Provider configuration, bridge records, refresh and reconciliation scripts, runtime verification, and provider-specific foundation records were deleted.
- A versioned SQL schema, deterministic snapshot builder, Neon persistence adapter, impact query, migration commands, and focused tests were added.
- The current builder still reads docs/document-intelligence/DOCUMENT_GRAPH.json as its semantic input.

## Authority boundary observed in the merged tree

AGENTS.md states that source strategy documents remain product authority, planning.md remains planning authority, docs/document-intelligence/ remains a reviewable semantic source layer, and Neon stores versioned semantic and code relationships as evidence.

Planning.md lines 26–30 resolve the replacement boundary: Neon replaces document-intelligence persistence/query and repository code-impact/navigation. The twelve source documents, deterministic source manifest, and canonical graph remain auditable inputs. The retained semantic source layer is therefore an intentional distinction, not a migration defect.

## Existing packet state

The only pre-existing Plan 2 artifact was a migration execution ledger. It still reported review, merge, production synchronization, and deployment as pending even though PR #40 was subsequently merged and deployed. The exact historical file is retained as historical-plan-results-pr40.md; it is not treated as current status.
