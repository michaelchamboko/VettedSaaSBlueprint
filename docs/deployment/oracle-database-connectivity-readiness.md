# Oracle Database Connectivity Readiness

Status: `PENDING_OPERATOR_INPUT`

This worksheet is the Step 2 `T02A` artifact for preparing Oracle Autonomous Database connectivity. It is intentionally redacted and must not contain secrets, wallet files, passwords, full connection strings, token values, or raw environment dumps.

## Current Verdict

- Oracle compute/Hermes host: `SSH_METADATA_READY`
- Oracle database connectivity: `NOT_READY`
- Schema application: `BLOCKED_PENDING_DB_CONNECTIVITY`

No schema migration may run until this worksheet reaches `READ_ONLY_QUERY_VERIFIED`.

## Latest SSH Metadata Probe

An operator-provided SSH launcher workflow reached the Oracle host for read-only
metadata checks. The launcher's identity reference did not resolve directly, so
a single local OpenSSH key candidate from the operator's Oracle folder was used
in memory for the probe. The key path, host, username, and raw SSH command were
not printed, copied, or committed.

Sanitized probe result:

```text
ssh_connected=1
shell_available=1
sqlplus_present=0
sqlcl_present=0
python_oracledb_present=0
oracle_wallet_config_candidate_count=0
oracle_related_env_name_count=0
hermes_dir_present=1
```

This proves host metadata access only. It does not prove Oracle Database
connectivity because no database client/driver, wallet/config material, or
Oracle connection environment names were detected.

## Required Operator Inputs

1. Confirm the exact Oracle Autonomous Database target and service alias.
2. Confirm the target remains Always Free or explicitly approve any non-free tier.
3. Approve the connection method.
   - Preferred: wallet-based TLS/mTLS.
   - Alternative: mTLS-less connection only if already configured and explicitly approved.
4. Approve a secure runtime-only wallet/secret storage path outside the repository.
5. Approve any minimum client/driver installation required for the chosen path.
6. Provide or approve the non-secret environment variable names needed by Vercel and Hermes.

Use `docs/deployment/oracle-t02a-operator-handoff.md` as the non-secret response checklist. Do not paste wallet paths, wallet filenames, passwords, connection strings, or raw environment variable values into chat or repository files.

## Repository Safety Rules

- Do not copy wallet files into this repository.
- Do not commit `.zip`, `.sso`, `.p12`, `.ora`, private key, password, token, or full connection-string material.
- Do not print wallet paths, raw env vars, passwords, or tokens in logs.
- Do not apply schema as part of connectivity verification.
- Do not change Oracle instance shape, networking, firewall, storage, packages, systemd services, or existing Hermes files without explicit separate approval.

## Proposed Runtime Env Names

These names are placeholders for runtime configuration only:

```text
DATABASE_URL
ORACLE_WALLET_LOCATION
HERMES_API_TOKEN
NEXT_PUBLIC_SITE_URL
```

If the selected Oracle driver requires a different convention, update this section before implementation.

## Verification Query

The only database action allowed in `T02A` is a read-only connectivity proof:

```sql
select 1 from dual;
```

Expected result:

```text
1
```

## Readiness Checklist

- [ ] Autonomous Database target confirmed without exposing secrets.
- [ ] Always Free posture confirmed or non-free tier explicitly approved.
- [ ] Connection method approved.
- [ ] Runtime-only wallet/secret storage path approved.
- [ ] Minimum client/driver installation approved, if needed.
- [ ] Read-only query executed successfully.
- [ ] Rollback/removal notes documented for any installed client tooling.

## Rollback Notes

Rollback notes are pending until the chosen client/driver path is approved. If no client tooling is installed, rollback is limited to removing uncommitted local notes and leaving Oracle unchanged.
