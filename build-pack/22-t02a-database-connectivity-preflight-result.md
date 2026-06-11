# 22 — T02A Database Connectivity Preflight Result

**Date**: 2026-06-10  
**Task**: `T02A — Oracle Database Connectivity Readiness`  
**Mode**: Read-only local + SSH metadata checks  
**Result**: `READ_ONLY_QUERY_VERIFIED`

## What Was Checked

Local metadata-only search:

- `C:\Users\micha.MICHAEL\Desktop\Oracle`
- `C:\Users\micha.MICHAEL\Downloads`
- `C:\Users\micha.MICHAEL\Desktop`
- `C:\Users\micha.MICHAEL\Documents`

Oracle host metadata-only search:

- Oracle client tools.
- Python and Node Oracle drivers.
- Wallet/config file presence.
- Oracle-related environment variable names.
- Hermes systemd unit references.
- Hermes venv package list.

## Findings

- The local Oracle folder contains the SSH key/launcher, but no Oracle Autonomous Database wallet/config file.
- No `Wallet_*.zip`, `tnsnames.ora`, `sqlnet.ora`, `cwallet.sso`, `ewallet.p12`, or `ojdbc.properties` was found in the searched local folders.
- No Oracle client tools are installed on the Oracle host.
- No Python Oracle driver is installed in system Python or Hermes venv.
- No Node Oracle driver was found in observed workspaces.
- No Oracle DB connection environment variable names were found.
- No wallet/config metadata was found on the Oracle host.
- A later operator-provided SSH launcher workflow reached the Oracle host for read-only metadata checks. The launcher's identity reference did not resolve directly, so a single local OpenSSH key candidate from the operator's Oracle folder was used in memory. No key path, host, username, or raw SSH command was printed or committed.
- Sanitized SSH probe results: `ssh_connected=1`, `shell_available=1`, `sqlplus_present=0`, `sqlcl_present=0`, `python_oracledb_present=0`, `oracle_wallet_config_candidate_count=0`, `oracle_related_env_name_count=0`, `hermes_dir_present=1`.
- The operator provided wallet material and local runtime values outside the repository.
- A temporary local Python virtual environment outside the repository was used for the approved `T02A` Oracle `oracledb` connectivity test.
- Sanitized database verification results: `t02a_status=read_only_query_verified`, `select_one_result=1`.
- The temporary local Python virtual environment was removed after the verification.
- No Oracle schema, Oracle-hosted package, Hermes runtime file, systemd service, Vercel setting, wallet file, password, token, connection string, or raw environment value was committed.

## Current Readiness

- Oracle compute/Hermes host: `SSH_METADATA_READY`
- Oracle DB connection material: `AVAILABLE_OUTSIDE_REPOSITORY`
- Oracle DB client/driver: `LOCAL_T02A_ONLY_REMOVED_AFTER_TEST`
- Read-only DB query verification: `VERIFIED`
- Schema migration readiness: `READY_FOR_T02`

## Required Non-Secret Inputs

Resolved for `T02A`:

1. The Oracle Autonomous Database wallet material exists outside the repository.
2. The database service alias was verified without printing the alias source file or path.
3. Temporary `ADMIN` connectivity was used only for the read-only verification.
4. Wallet material remained outside the repository and outside public web roots.
5. Client/driver installation was local and temporary only; no Hermes runtime install occurred.

## Secure Transfer Recommendation

Preferred secure layout after explicit approval:

```text
/michael-core/secure/oracle-wallet/<database>/
  tnsnames.ora
  sqlnet.ora
  cwallet.sso
  ewallet.p12
```

Recommended permissions after transfer:

```text
owner: ubuntu
mode: 700 for directory
mode: 600 for wallet files
```

Do not store wallet files in:

- Git repository.
- Vercel source bundle.
- Public web directories.
- Hermes workspace if it is exposed through a UI.

## Stop Condition

No schema work was performed. Next action is `T02` schema migration planning and execution using the approved connection path, with separate approval before any Oracle-hosted runtime or Hermes dependency changes.
