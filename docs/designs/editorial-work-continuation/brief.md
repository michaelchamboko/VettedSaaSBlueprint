# Editorial work continuation

Classification: user directive, approved for implementation on 2026-11-01.

The fixed-snapshot ingest for `article-c23a6320-0ba7-45e3-88dd-9160ce979f18` stopped in REFINING after three unchanged validations rejected LandingEditorialReviewV1 instead of the required EditorialEvidenceV2. Missing editorial work must trigger completion of that work before another validation attempt.

Clarify supervisor instructions for existing manual/API imports. Preserve the full editorial workflow, immutable snapshot, retry counters, blocker scope, and publication gates. Do not add a runner, schedule, schema, or publication authority. A demonstrated tool or model-access failure may still block recovery.

Success means the instructions require actual editorial work before retry, prohibit unchanged failing submissions, and distinguish unfinished work from a demonstrated obstacle. Recovery is separately verified against persisted state and available capabilities.
