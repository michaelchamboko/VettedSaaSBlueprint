# Database Migration Strategy

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | PostgreSQL reference schema (Step 1 artifact). Do not apply to Oracle. |
| `oracle-migration-001.sql` | Oracle Autonomous Database compatible DDL. Additive foundation migration. |

## Oracle Compatibility Conversions

| PostgreSQL | Oracle | Notes |
|------------|--------|-------|
| `uuid` | `VARCHAR2(36)` | Application generates UUIDs |
| `jsonb` | `CLOB CHECK (col IS JSON)` | Oracle 19c+ compatible |
| `text[]` | `CLOB CHECK (col IS JSON)` | Application serializes as JSON arrays |
| `gen_random_uuid()` | Removed | Application-layer UUID generation |
| `timestamptz` | `TIMESTAMP WITH TIME ZONE` | |
| `now()` | `SYSTIMESTAMP` | |
| `boolean` | `NUMBER(1)` | 0/1 convention |
| Partial index `WHERE` | Oracle function-based index | |
| Inline `UNIQUE` | `ALTER TABLE ADD CONSTRAINT` | |

## Migration Policy

- All Step 2 migrations are additive for MVP foundation.
- Schema changes must be reviewable and reversible or covered by rollback notes.
- Destructive changes require explicit operator approval.
- Migrations apply through the approved Oracle connection path only.
- Indexes included for: job claims, page lookup, event metrics, evidence lookup, job locking.

## Next Steps (Post T02)

- T03: Replace scaffold `@vercel/postgres` app code with Oracle database access layer.
- Decide on versioned migration tooling vs single-file approach.
