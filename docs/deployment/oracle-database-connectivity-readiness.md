# Oracle Database Connectivity Readiness

Status: `READ_ONLY_QUERY_VERIFIED`

This worksheet is the Step 2 `T02A` artifact for preparing Oracle Autonomous Database connectivity. It is intentionally redacted and must not contain secrets, wallet files, passwords, full connection strings, token values, or raw environment dumps.

## Current Verdict

- Oracle compute/Hermes host: `SSH_METADATA_READY`
- Oracle database connectivity: `READ_ONLY_QUERY_VERIFIED`
- Schema application: `READY_FOR_T02_SCHEMA_TASK`

No schema migration was run during `T02A`.

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

This proves host metadata access only.

## Latest Read-Only Database Verification

The operator provided wallet material and local runtime values outside the
repository. A temporary local Python virtual environment was created outside the
repository for the approved connectivity test, using the Oracle `oracledb`
driver only for `T02A`.

Sanitized database verification result:

```text
t02a_status=read_only_query_verified
select_one_result=1
```

The temporary local virtual environment was removed after the test. No Oracle
schema, Oracle instance setting, Oracle package, Hermes runtime file, systemd
service, Vercel setting, wallet file, password, token, connection string, or raw
environment value was committed.

## Required Operator Inputs

1. Confirm the exact Oracle Autonomous Database target and service alias. `DONE`
2. Confirm the target remains Always Free or explicitly approve any non-free tier. `DONE`
3. Approve the connection method. `DONE`
   - Selected: wallet-based TLS/mTLS.
4. Approve a secure runtime-only wallet/secret storage path outside the repository. `DONE`
5. Approve any minimum client/driver installation required for the chosen path. `DONE_FOR_LOCAL_T02A_ONLY`
6. Provide or approve the non-secret environment variable names needed by Vercel and Hermes. `DONE` (compatibility aliases accepted by runtime module)

Use `docs/deployment/oracle-t02a-operator-handoff.md` as the non-secret response checklist. Do not paste wallet paths, wallet filenames, passwords, connection strings, or raw environment variable values into chat or repository files.

## Repository Safety Rules

- Do not copy wallet files into this repository.
- Do not commit `.zip`, `.sso`, `.p12`, `.ora`, private key, password, token, or full connection-string material.
- Do not print wallet paths, raw env vars, passwords, or tokens in logs.
- Do not apply schema as part of connectivity verification.
- Do not change Oracle instance shape, networking, firewall, storage, packages, systemd services, or existing Hermes files without explicit separate approval.

## Proposed Runtime Env Names

Canonical names used by the runtime module:

```text
DATABASE_URL
ORACLE_CONNECTION_STRING
ORACLE_WALLET_LOCATION
ORACLE_DB_USER
ORACLE_DB_PASSWORD
ORACLE_SERVICE_ALIAS
TNS_ADMIN
HERMES_API_TOKEN
NEXT_PUBLIC_SITE_URL
ORACLE_APP_USER
ORACLE_APP_PASSWORD
```

The module accepts both `ORACLE_*` canonical names and legacy fallbacks (`DATABASE_URL`, `ORACLE_APP_USER`, and `ORACLE_APP_PASSWORD`) to keep continuity with existing runtime paths.

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

- [x] Autonomous Database target confirmed without exposing secrets.
- [x] Always Free posture confirmed or non-free tier explicitly approved.
- [x] Connection method approved.
- [x] Runtime-only wallet/secret storage path approved.
- [x] Minimum client/driver installation approved, if needed.
- [x] Read-only query executed successfully.
- [x] Rollback/removal notes documented for any installed client tooling.

## Rollback Notes

The temporary local Python virtual environment used for `T02A` was removed after
verification. No Oracle-hosted client tooling was installed, so there is no
Oracle-host rollback action for this task.
