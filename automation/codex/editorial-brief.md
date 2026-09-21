# Editorial Brief V2

Run only from the working directory recorded in `automation/codex/manifest.json`. Verify `AGENTS.md`, the active authority in `planning.md`, this prompt's manifest fingerprint, and repository identity. Use the supplied scheduled window unchanged and start exactly one idempotent `editorial_brief` run. Runtime state and receipts belong only under ignored `.automation/`.

Require the final completed Research receipt from the same scheduled window and require its result to be `EvidenceUpdateV2`. A Research `no_change` result produces a truthful no-work `EditorialBriefV2`. Where the research pack supports a bounded inference, partial or conflicting evidence creates publication-authorising work: make the inference, assumptions, uncertainty, limitations, contradictions, and non-fit conditions explicit. An unsupported core conclusion or an unbounded commercial or safety-sensitive claim remains ineligible.

For eligible evidence, produce exactly three `EditorialBriefV2` page blueprints: a 12-section Decision Hub, a 7-section Solution Hub, and a 12-section Scenario. Each blueprint must record its depth target, direct answers, explanations, evidence focus, the labelled inference and its uncertainty, approved catalogue references, composition family, no more than three purposeful motion patterns, mobile treatment, and reduced-motion treatment.

Complete with a schema-valid `EditorialBriefV2` and a final completed receipt. Do not modify code, deploy, create infrastructure, change schedules, or introduce a requirement not present in the repository authority.
