# 22 — T02A Database Connectivity Preflight Result

**Date**: 2026-06-10  
**Task**: `T02A — Oracle Database Connectivity Readiness`  
**Mode**: Read-only local + SSH metadata checks  
**Result**: `BLOCKED_PENDING_ORACLE_DB_CONNECTION_MATERIAL`

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

## Current Readiness

- Oracle compute/Hermes host: `READY_FOR_PLANNING`
- Oracle DB connection material: `MISSING`
- Read-only DB query verification: `NOT_POSSIBLE_YET`
- Schema migration readiness: `BLOCKED`

## Required Non-Secret Inputs

To proceed safely, the operator needs to provide or point to:

1. The Oracle Autonomous Database wallet ZIP, usually named like `Wallet_<database>.zip`, or confirm a walletless connection method.
2. The database service name to use, such as a `_low`, `_medium`, or `_high` service alias from `tnsnames.ora`.
3. The intended app database username, preferably a least-privilege app user rather than an admin account.
4. Confirmation of where wallet files may live on the Oracle host, preferably under a locked-down path outside the repo and outside public web roots.
5. Confirmation before installing any database client/driver into Hermes or another runtime.

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

No transfer, install, wallet placement, DB login, or schema work was performed.

Next action requires explicit operator-provided wallet/service details and approval for any host file write or package install.
