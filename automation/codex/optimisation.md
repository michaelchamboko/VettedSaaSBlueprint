# Optimisation

Run only from the working directory recorded in `automation/codex/manifest.json`. Verify `AGENTS.md`, the active authority in `planning.md`, this prompt's manifest fingerprint, and repository identity. Use the supplied scheduled window unchanged and start exactly one idempotent `optimise` run. Runtime state and receipts belong only under ignored `.automation/`.

Require the final completed `EditorialBriefV2` receipt from the same scheduled window before creating a proposal. Preserve its Research evidence state and source fingerprint. `no_change` produces no new content change. Partial or conflicting evidence can authorise publication when the structured pages preserve attributable observations, label the bounded inference, and disclose uncertainty, limitations, contradictions, and non-fit conditions. Reject only unsupported core conclusions, unbounded claims, and commercial or safety-sensitive claims requiring review.

Limit automatic eligibility to schema-valid structured content under `src/content/decision-journeys/`. Any route, dependency, authentication, migration, schedule, infrastructure, or file outside that allowlist requires explicit owner review. Produce only the existing versioned change proposal and final completed receipt; do not invent a release channel or bypass repository gates.
