# Task T02A — Oracle Database Connectivity Readiness

## Context Baseline

- `build-pack/19-oracle-infrastructure-review-and-guardrails.md`
- `build-pack/20-security-threat-model.md`
- `build-pack/21-oracle-database-setup-readiness-review.md`

## Must-Haves

- Do not change Oracle instance shape, Always Free posture, networking, storage, firewall, or Hermes block-volume installation.
- Confirm the target Oracle Autonomous Database instance/service without exposing secrets.
- Choose the approved connection method, preferably wallet-based TLS.
- Store wallet/connection materials only in an approved secure runtime path, never in the repository.
- Install or use the minimum approved Oracle DB client/driver only after explicit approval.
- Verify a read-only database query before schema migration.
- Do not apply schema in this task.

## Target Artifacts

- Redacted database connectivity notes.
- Approved wallet/secret storage location.
- Driver/client installation notes if approved.
- Read-only connection verification evidence.
- Rollback/removal notes for any client tooling installed.

## Verification Command

```sql
select 1 from dual;
```

Expected: read-only query succeeds against the approved Oracle Autonomous Database. No schema changes are applied.
