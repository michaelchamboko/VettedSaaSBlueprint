# EGM review findings

Fresh-context implementation-readiness, codebase-detail, and style reviews completed before implementation.

- Bounded retries and structured shared-versus-item failure outcomes must be explicit; existing transient handling does not exhaust by itself.
- Intake run coordination needs a separate run identity and immutable source membership; the existing article lease is article-scoped.
- Normal continuation and explicit retry of blocked entries must not select the same blocked entry indefinitely.
- Raw source bytes, normalised identity, and pre-authoring reparse eligibility must be bound to durable state.
- Release still requires the exact current-head Codex connector review evidence; a native reviewer report cannot substitute for it.
- Processing-pass completion must remain distinct from all articles published.

These findings were incorporated into the approved implementation scope. No reviewer modified repository files.
