# 21 — Oracle Database Setup Readiness Review

**Review Date**: 2026-06-10  
**Review Mode**: Read-only SSH inspection  
**Scope**: Database setup readiness for Step 2 planning  
**Infrastructure Change Status**: No changes made

## Executive Readiness Result

`NOT_READY_FOR_SCHEMA_APPLICATION`

The Oracle compute instance and Hermes block-volume setup are healthy enough to plan integration, but the instance does not currently show the Oracle database client/configuration needed to connect to Oracle Autonomous Database from Hermes or deployment scripts.

This is not a failure. It means Step 2 must first create a reviewed database connectivity task before applying schema or running DB-integrated Hermes workflows.

## Golden Rule Confirmation

No Oracle instance settings were changed.

The following were not changed:

- Instance shape.
- Always Free posture.
- Boot volume.
- Block volume.
- VCN/subnet/security lists.
- Firewall rules.
- SSH config.
- Systemd services.
- Hermes files.
- Packages.
- Database schema.

## Positive Readiness Signals

- Oracle compute instance is reachable through existing SSH key path.
- `/michael-core` block volume is mounted and has healthy free space.
- Hermes is installed under `/michael-core/hermes`.
- `/home/ubuntu/.hermes` points to `/michael-core/hermes`.
- Hermes services are active.
- Outbound DNS resolution works for Oracle domains.
- UFW is active with default-deny incoming.
- Fail2ban is active for SSH.
- SSH password and root login are disabled.

## Missing Database Readiness Items

The read-only inspection did not find:

- `sqlplus`.
- SQLcl `sql` command.
- `tnsping`.
- OCI CLI.
- Python `oracledb` package in system Python.
- Python `oracledb` package in Hermes venv.
- Python `cx_Oracle` package in system Python or Hermes venv.
- Node `oracledb` package in observed workspaces.
- Oracle wallet files such as `tnsnames.ora`, `sqlnet.ora`, `cwallet.sso`, or `ewallet.p12`.
- Oracle database environment variables such as `TNS_ADMIN`, `ORACLE_HOME`, `DATABASE_URL`, or wallet variables.
- OCI config under `/home/ubuntu/.oci`.

## Implication

The instance is **not yet ready** to run Oracle Autonomous Database migrations or Hermes database-connected workflows.

Before Step 2 can apply schema or connect Hermes to the database, the operator must approve and provide a safe DB connectivity path.

## Required Step 2 DB Connectivity Decisions

1. **Autonomous Database target**
   - Confirm the exact Oracle Autonomous Database instance/service name.
   - Confirm it remains Always Free or otherwise explicitly approved.

2. **Connection method**
   - Preferred: Oracle wallet-based TLS connection.
   - Alternative: mTLS-less connection only if explicitly configured and approved.

3. **Client/runtime strategy**
   - Python Hermes path: install/use Python `oracledb` in Hermes venv.
   - Vercel app path: choose whether Next.js connects directly to Oracle or uses a small Oracle-side API layer.
   - Migration path: choose SQLcl, Python migration script, or another reviewed migration runner.

4. **Secret storage**
   - No secrets in repo.
   - Wallet files and credentials stored only in approved runtime locations.
   - Environment variables or secret files must not be printed in logs.

5. **File storage strategy**
   - Decide where uploaded PDFs/images/videos live:
     - Oracle DB for small metadata/text/extracted content.
     - Oracle object/block storage path for larger files, with metadata pointers in DB.

## Recommended Step 2 Task Addition

Add a dedicated task before schema migration:

```text
T02A — Oracle Database Connectivity Readiness
```

Must-haves:

- Confirm target Autonomous Database without changing paid/free settings.
- Place wallet/connection material in approved secure path.
- Install only the minimum approved Oracle DB client/driver if needed.
- Verify a read-only test query.
- Do not apply schema yet.
- Document rollback/removal steps for any client tooling.

Verification should be a safe read-only query such as:

```sql
select 1 from dual;
```

## Security Notes

- Because the operator has prior compromise history, database credentials and wallet files should be treated as high-value secrets.
- Do not expose Oracle DB ports publicly beyond Oracle Autonomous Database's managed access model.
- Do not copy wallet files into the repository.
- Do not include wallet files in build artifacts or Vercel source bundles.
- Do not print connection strings, wallet file paths, passwords, or token values.

## Readiness Verdict

- Compute/Hermes host readiness: `PARTIAL_READY`
- Oracle database connectivity readiness: `NOT_READY`
- Schema application readiness: `BLOCKED_PENDING_DB_CONNECTIVITY`
- Security posture for planning: `ACCEPTABLE_WITH_GUARDRAILS`

## Next Safe Step

Before Step 2 implementation, approve a focused DB connectivity preparation task that does not change Oracle instance shape, billing posture, firewall, or existing Hermes installation.

## T02A Preflight Update

The approved preflight was run in metadata-only mode. No wallet/config files or database service details were found locally or on the Oracle host. See `build-pack/22-t02a-database-connectivity-preflight-result.md`.
