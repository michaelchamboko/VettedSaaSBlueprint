# Capture replay evidence

The parent ran the same `missing replay blocks validation` regression against the original execution-evidence module from commit 79fef93d3eec0a7d54197160e82eb94b16fea4dc and the repaired module. The controlled baseline swap restored the repaired bytes in a finally block. This baseline comparison was recorded after implementation; it is not a claim of test-first development.

- `before.log`: exit 1, one failed test, `Missing expected rejection`. The old validator accepted a self-consistent record without capture provenance.
- `after.log`: exit 0, one passed test. The repaired validator rejects missing replay.

Synthetic integration cases exercise `advanceImport` with missing replay, the wrapped `<file>` envelope transport from the forensic finding, and an edited answer with a recomputed digest. They assert the specific evidence error, rejected advancement, unchanged persisted import bytes and file inventory, and stage VALIDATING. Positive fixtures and fail/insufficient-evidence review cases remain covered. Supported OpenCode versions have extraction and replay roundtrips; retained exports exclude reasoning and unrelated history.

The final repository-gate results and exact-head PR review are release requirements recorded separately by the parent. No real article execution, capture, migration or evidence repair is authorized by this code change. Replay checks local reproducibility, not provider-signed authenticity.

PR review identified a historical-compatibility issue. The correction confines missing-replay tolerance to explicit frozen terminal inspection. The parent independently passed five synthetic regressions covering completed pre-replay history, active and duplicate-reuse rejection, generic snapshot rejection, corrupted hashes and invalid present replay. The completion test also compares file hashes and inventory before and after inspection. New handoffs never inherit the historical exception.
