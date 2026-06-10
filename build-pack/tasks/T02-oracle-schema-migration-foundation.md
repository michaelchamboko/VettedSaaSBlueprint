# Task T02 — Oracle Schema Migration Foundation

## Context Baseline

- `build-pack/06-database-contract.md`
- `db/schema.sql`

## Must-Haves

- Convert schema contract into approved Oracle migration structure.
- Keep migrations additive for MVP foundation.
- Include job queue and page lookup indexes.

## Target Artifacts

- Oracle-compatible migration files or approved schema application notes.
- Updated database documentation if migration tooling is introduced.

## Verification Command

```powershell
rg -n "generation_jobs|dynamic_pages|audit_log|conversion_events" db
```

Expected: required tables and indexes are present.
